# Integration Guide: Using zinnia_core in Your Rust Application

⚠️ This document is AI-generated

This guide shows how to integrate the `zinnia_core` library into different types of Rust applications.

## Table of Contents

- [Adding the Dependency](#adding-the-dependency)
- [Basic Integration](#basic-integration)
- [Tauri App Integration](#tauri-app-integration)
- [CLI Application](#cli-application)
- [Web Server Integration](#web-server-integration)
- [Multi-threaded Applications](#multi-threaded-applications)
- [Testing with zinnia_core](#testing-with-zinnia_core)

## Adding the Dependency

### From Local Path

If you have the zinnia repository locally:

```toml
[dependencies]
zinnia_core = { path = "../path/to/zinnia/crates/core" }
```

### From Git Repository

```toml
[dependencies]
zinnia_core = { git = "https://github.com/username/zinnia", branch = "main" }
```

### Optional Features

Currently, `zinnia_core` has no optional features. All functionality is included by default.

## Basic Integration

### Minimal Example

```rust
use zinnia_core::{NotesApi, Result};

fn main() -> Result<()> {
    // Initialize API
    let mut api = NotesApi::new("/path/to/notes")?;
    api.startup_sync()?;
    
    // Create and save a note
    api.create_note("hello")?;
    api.save_note("hello", "# Hello World\n\nThis is my first note.")?;
    
    // Read the note back
    let note = api.get_note("hello")?;
    println!("{}", note.content);
    
    Ok(())
}
```

### With Default Paths

```rust
use zinnia_core::{NotesApi, Result};

fn main() -> Result<()> {
    let debug = cfg!(debug_assertions);
    let mut api = NotesApi::with_default_path(debug)?;
    api.startup_sync()?;
    
    // Your application logic
    
    Ok(())
}
```

## Tauri App Integration

Perfect for building desktop applications with web frontends.

### Project Structure

```
my-tauri-app/
├── Cargo.toml
├── src-tauri/
│   ├── Cargo.toml
│   ├── src/
│   │   └── main.rs
└── src/           # Frontend code (React, Vue, etc.)
```

### src-tauri/Cargo.toml

```toml
[dependencies]
tauri = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
zinnia_core = { path = "../../zinnia/crates/core" }
```

### src-tauri/src/main.rs

```rust
use std::sync::{Arc, Mutex};
use tauri::State;
use zinnia_core::{NotesApi, Note, NoteMetadata, Result as ZinniaResult, setup_watcher};

// DTO types for JSON serialization
#[derive(serde::Serialize)]
struct NoteDTO {
    id: i64,
    path: String,
    content: String,
    modified: u64,
}

#[derive(serde::Serialize)]
struct NoteMetadataDTO {
    id: i64,
    path: String,
    modified: u64,
    archived: bool,
}

// Convert core types to DTOs
impl From<Note> for NoteDTO {
    fn from(note: Note) -> Self {
        Self {
            id: note.id,
            path: note.path,
            content: note.content,
            modified: note.modified
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

impl From<NoteMetadata> for NoteMetadataDTO {
    fn from(meta: NoteMetadata) -> Self {
        Self {
            id: meta.id,
            path: meta.path,
            modified: meta.modified
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            archived: meta.archived,
        }
    }
}

// Tauri state wrapper
struct AppState {
    api: Arc<Mutex<NotesApi>>,
}

// Tauri commands
#[tauri::command]
fn create_note(path: String, state: State<AppState>) -> Result<NoteDTO, String> {
    let mut api = state.api.lock().unwrap();
    api.create_note(&path)
        .map(NoteDTO::from)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_note(path: String, state: State<AppState>) -> Result<NoteDTO, String> {
    let mut api = state.api.lock().unwrap();
    api.get_note(&path)
        .map(NoteDTO::from)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn save_note(path: String, content: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.api.lock().unwrap();
    api.save_note(&path, &content)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_children(path: String, state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.api.lock().unwrap();
    api.get_children(&path)
        .map(|children| children.into_iter().map(NoteMetadataDTO::from).collect())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn search_notes(query: String, state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.api.lock().unwrap();
    api.search(&query)
        .map(|results| results.into_iter().map(NoteMetadataDTO::from).collect())
        .map_err(|e| format!("{:?}", e))
}

fn main() {
    // Initialize API
    let debug = cfg!(debug_assertions);
    let mut api = NotesApi::with_default_path(debug)
        .expect("Failed to initialize notes API");
    api.startup_sync().expect("Failed to sync notes");
    
    // Wrap in Arc<Mutex<>> for thread safety
    let api = Arc::new(Mutex::new(api));
    
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();
            let api_clone = Arc::clone(&api);
            
            // Setup file watcher
            let _watcher = setup_watcher(
                Arc::clone(&api_clone),
                Some(move |event| {
                    use zinnia_core::WatcherEvent;
                    match event {
                        WatcherEvent::NotesChanged => {
                            app_handle.emit("notes:changed", ()).ok();
                        }
                        WatcherEvent::NotesRenamed => {
                            app_handle.emit("notes:renamed", ()).ok();
                        }
                        WatcherEvent::FrecencyUpdated => {
                            app_handle.emit("notes:frecency", ()).ok();
                        }
                    }
                })
            );
            
            // Keep watcher alive for app lifetime
            app.manage(_watcher);
            
            Ok(())
        })
        .manage(AppState { api })
        .invoke_handler(tauri::generate_handler![
            create_note,
            get_note,
            save_note,
            get_children,
            search_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Frontend Usage (TypeScript)

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface Note {
  id: number;
  path: string;
  content: string;
  modified: number;
}

// Create a note
await invoke<Note>("create_note", { path: "my-note" });

// Save content
await invoke("save_note", { path: "my-note", content: "# Hello" });

// Get note
const note = await invoke<Note>("get_note", { path: "my-note" });

// Listen for file changes
await listen("notes:changed", () => {
  console.log("Notes changed externally!");
  // Refresh UI
});
```

## CLI Application

Build a command-line notes manager.

### Cargo.toml

```toml
[dependencies]
zinnia_core = { path = "../zinnia/crates/core" }
clap = { version = "4.0", features = ["derive"] }
```

### main.rs

```rust
use clap::{Parser, Subcommand};
use zinnia_core::{NotesApi, Result};

#[derive(Parser)]
#[command(name = "notes")]
#[command(about = "A command-line notes manager")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new note
    Create { path: String },
    
    /// Edit a note (opens in $EDITOR)
    Edit { path: String },
    
    /// List all notes
    List,
    
    /// Search notes
    Search { query: String },
    
    /// Delete a note
    Delete { path: String },
    
    /// Archive a note
    Archive { path: String },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    
    let debug = cfg!(debug_assertions);
    let mut api = NotesApi::with_default_path(debug)?;
    api.startup_sync()?;
    
    match cli.command {
        Commands::Create { path } => {
            api.create_note(&path)?;
            println!("Created note: {}", path);
        }
        
        Commands::Edit { path } => {
            // Get or create note
            if !api.note_exists(&path)? {
                api.create_note(&path)?;
            }
            
            let note = api.get_note(&path)?;
            
            // Open in editor
            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
            let temp_file = std::env::temp_dir().join(format!("{}.md", path.replace('/', "-")));
            std::fs::write(&temp_file, &note.content)?;
            
            std::process::Command::new(editor)
                .arg(&temp_file)
                .status()?;
            
            // Save changes
            let new_content = std::fs::read_to_string(&temp_file)?;
            api.save_note(&path, &new_content)?;
            println!("Saved changes to {}", path);
        }
        
        Commands::List => {
            let roots = api.get_root_notes()?;
            for root in roots {
                print_tree(&api, &root.path, 0)?;
            }
        }
        
        Commands::Search { query } => {
            let results = api.search(&query)?;
            println!("Found {} notes:", results.len());
            for result in results {
                println!("  📄 {}", result.path);
            }
        }
        
        Commands::Delete { path } => {
            api.delete_note(&path)?;
            println!("Deleted: {}", path);
        }
        
        Commands::Archive { path } => {
            api.archive_note(&path)?;
            println!("Archived: {}", path);
        }
    }
    
    Ok(())
}

fn print_tree(api: &NotesApi, path: &str, depth: usize) -> Result<()> {
    let indent = "  ".repeat(depth);
    println!("{}📄 {}", indent, path);
    
    let children = api.get_children(path)?;
    for child in children {
        print_tree(api, &child.path, depth + 1)?;
    }
    
    Ok(())
}
```

## Web Server Integration

Build a REST API for notes.

### Cargo.toml

```toml
[dependencies]
zinnia_core = { path = "../zinnia/crates/core" }
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### main.rs

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, delete},
    Json, Router,
};
use zinnia_core::{NotesApi, Note, NoteMetadata};
use std::sync::{Arc, Mutex};

// Shared state
struct AppState {
    api: Arc<Mutex<NotesApi>>,
}

#[derive(serde::Serialize)]
struct NoteResponse {
    id: i64,
    path: String,
    content: String,
    modified: u64,
}

#[derive(serde::Deserialize)]
struct CreateNoteRequest {
    path: String,
}

#[derive(serde::Deserialize)]
struct SaveNoteRequest {
    content: String,
}

impl From<Note> for NoteResponse {
    fn from(note: Note) -> Self {
        Self {
            id: note.id,
            path: note.path,
            content: note.content,
            modified: note.modified
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

async fn get_note_handler(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<NoteResponse>, StatusCode> {
    let mut api = state.api.lock().unwrap();
    
    api.get_note(&path)
        .map(|note| Json(NoteResponse::from(note)))
        .map_err(|_| StatusCode::NOT_FOUND)
}

async fn create_note_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateNoteRequest>,
) -> Result<Json<NoteResponse>, StatusCode> {
    let mut api = state.api.lock().unwrap();
    
    api.create_note(&req.path)
        .map(|note| Json(NoteResponse::from(note)))
        .map_err(|_| StatusCode::BAD_REQUEST)
}

async fn save_note_handler(
    Path(path): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<SaveNoteRequest>,
) -> Result<StatusCode, StatusCode> {
    let mut api = state.api.lock().unwrap();
    
    api.save_note(&path, &req.content)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::BAD_REQUEST)
}

#[tokio::main]
async fn main() {
    let debug = cfg!(debug_assertions);
    let mut api = NotesApi::with_default_path(debug)
        .expect("Failed to initialize API");
    api.startup_sync().expect("Failed to sync");
    
    let state = Arc::new(AppState {
        api: Arc::new(Mutex::new(api)),
    });
    
    let app = Router::new()
        .route("/notes/:path", get(get_note_handler))
        .route("/notes", post(create_note_handler))
        .route("/notes/:path", post(save_note_handler))
        .with_state(state);
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("Server running on http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## Multi-threaded Applications

Handle concurrent access safely.

### Using Arc<Mutex<NotesApi>>

```rust
use std::sync::{Arc, Mutex};
use std::thread;
use zinnia_core::NotesApi;

fn main() {
    let api = NotesApi::new("/path/to/notes").unwrap();
    let api = Arc::new(Mutex::new(api));
    
    let mut handles = vec![];
    
    // Spawn multiple threads
    for i in 0..5 {
        let api_clone = Arc::clone(&api);
        
        let handle = thread::spawn(move || {
            let mut api = api_clone.lock().unwrap();
            
            let path = format!("note-{}", i);
            api.create_note(&path).ok();
            api.save_note(&path, &format!("Content from thread {}", i)).ok();
        });
        
        handles.push(handle);
    }
    
    // Wait for all threads
    for handle in handles {
        handle.join().unwrap();
    }
}
```

### Using Tokio

```rust
use tokio::sync::Mutex;
use std::sync::Arc;
use folio_core::NotesApi;

#[tokio::main]
async fn main() {
    let api = NotesApi::new("/path/to/notes").unwrap();
    let api = Arc::new(Mutex::new(api));
    
    let mut tasks = vec![];
    
    for i in 0..5 {
        let api_clone = Arc::clone(&api);
        
        let task = tokio::spawn(async move {
            let mut api = api_clone.lock().await;
            
            let path = format!("note-{}", i);
            api.create_note(&path).ok();
            api.save_note(&path, &format!("Content {}", i)).ok();
        });
        
        tasks.push(task);
    }
    
    // Wait for all tasks
    for task in tasks {
        task.await.unwrap();
    }
}
```

## Testing with zinnia_core

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use zinnia_core::NotesApi;
    use tempfile::TempDir;
    
    #[test]
    fn test_create_and_read_note() {
        let temp_dir = TempDir::new().unwrap();
        let mut api = NotesApi::new(temp_dir.path()).unwrap();
        
        api.create_note("test").unwrap();
        api.save_note("test", "Test content").unwrap();
        
        let note = api.get_note("test").unwrap();
        assert_eq!(note.content, "Test content");
    }
    
    #[test]
    fn test_search() {
        let temp_dir = TempDir::new().unwrap();
        let mut api = NotesApi::new(temp_dir.path()).unwrap();
        
        api.create_note("rust").unwrap();
        api.save_note("rust", "Rust programming").unwrap();
        
        api.create_note("python").unwrap();
        api.save_note("python", "Python programming").unwrap();
        
        let results = api.search("rust").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "rust");
    }
}
```

### Integration Tests

Create `tests/integration_test.rs`:

```rust
use zinnia_core::{NotesApi, Result};
use tempfile::TempDir;

#[test]
fn test_full_workflow() -> Result<()> {
    let temp_dir = TempDir::new().unwrap();
    let mut api = NotesApi::new(temp_dir.path())?;
    
    // Create hierarchy
    api.create_note("projects")?;
    api.create_note("projects/rust-app")?;
    api.save_note("projects/rust-app", "# Rust App\n\nBuilding...")?;
    
    // Navigate
    let children = api.get_children("projects")?;
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].path, "projects/rust-app");
    
    // Search
    let results = api.search("building")?;
    assert_eq!(results.len(), 1);
    
    // Archive
    api.archive_note("projects/rust-app")?;
    let children_after_archive = api.get_children("projects")?;
    assert_eq!(children_after_archive.len(), 0);
    
    Ok(())
}
```

## Best Practices

### 1. Always Call startup_sync()

```rust
let mut api = NotesApi::new(path)?;
api.startup_sync()?; // Essential!
```

### 2. Use Arc<Mutex<>> for Shared Access

```rust
let api = Arc::new(Mutex::new(api));
// Clone and share across threads/tasks
```

### 3. Handle Errors Gracefully

```rust
match api.get_note("path") {
    Ok(note) => /* handle success */,
    Err(e) => /* handle error */,
}
```

### 4. Use TempDir for Tests

```rust
let temp_dir = TempDir::new().unwrap();
let api = NotesApi::new(temp_dir.path()).unwrap();
// Automatically cleaned up when temp_dir is dropped
```

### 5. Set Up File Watcher for Real-time Sync

```rust
let _watcher = setup_watcher(api_clone, Some(|event| {
    // Handle external changes
}));
// Keep _watcher alive!
```

## Common Patterns

### Lazy Initialization

```rust
use std::sync::OnceLock;

static API: OnceLock<Arc<Mutex<NotesApi>>> = OnceLock::new();

fn get_api() -> Arc<Mutex<NotesApi>> {
    API.get_or_init(|| {
        let mut api = NotesApi::with_default_path(false).unwrap();
        api.startup_sync().unwrap();
        Arc::new(Mutex::new(api))
    }).clone()
}
```

### Async Wrapper

```rust
use tokio::task;

async fn create_note_async(api: Arc<Mutex<NotesApi>>, path: String) -> Result<Note> {
    task::spawn_blocking(move || {
        let mut api = api.lock().unwrap();
        api.create_note(&path)
    }).await.unwrap()
}
```

### Error Conversion for Web APIs

```rust
impl IntoResponse for zinnia_core::Error {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            zinnia_core::Error::NotFound(_) => (StatusCode::NOT_FOUND, "Note not found"),
            zinnia_core::Error::AlreadyExists(_) => (StatusCode::CONFLICT, "Note exists"),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal error"),
        };
        
        (status, message).into_response()
    }
}
```
