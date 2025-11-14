# Zinnia Core API Reference

⚠️ This document is AI-generated

This document provides a complete reference for the `zinnia_core` Rust library.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Types](#core-types)
- [NotesApi](#notesapi)
  - [Initialization](#initialization)
  - [CRUD Operations](#crud-operations)
  - [Navigation](#navigation)
  - [Archive Operations](#archive-operations)
  - [Search and Sync](#search-and-sync)
  - [Frecency Tracking](#frecency-tracking)
- [NoteFilesystem](#notefilesystem)
- [File Watcher](#file-watcher)
- [Default Paths](#default-paths)

## Getting Started

Add `zinnia_core` to your `Cargo.toml`:

```toml
[dependencies]
zinnia_core = { path = "../path/to/zinnia/crates/core" }
```

Basic usage:

```rust
use zinnia_core::{NotesApi, Result};

fn main() -> Result<()> {
    // Create API instance
    let mut api = NotesApi::new("/path/to/notes")?;
    
    // Sync filesystem on startup
    api.startup_sync()?;
    
    // Create and edit notes
    let note = api.create_note("my-note")?;
    api.save_note("my-note", "# Hello World\n\nMy first note.")?;
    
    // Read notes
    let note = api.get_note("my-note")?;
    println!("Content: {}", note.content);
    
    Ok(())
}
```

## Core Types

### Note

Represents a complete note with content.

```rust
pub struct Note {
    pub id: i64,              // Database ID
    pub path: String,         // Note path (e.g., "projects/rust-app")
    pub content: String,      // Full markdown content
    pub modified: SystemTime, // Last modification time
}
```

### NoteMetadata

Represents note metadata without content (lighter weight for listings).

```rust
pub struct NoteMetadata {
    pub id: i64,              // Database ID
    pub path: String,         // Note path
    pub modified: SystemTime, // Last modification time
    pub archived: bool,       // Whether note is archived
}
```

### Error

Error types returned by API operations.

```rust
pub enum Error {
    Io(std::io::Error),           // Filesystem errors
    Database(rusqlite::Error),    // Database errors
    DatabaseCorrupted,            // Database schema is invalid
    NotFound(String),             // Note doesn't exist (includes path)
    AlreadyExists(String),        // Note already exists (includes path)
    ParentNotFound(String),       // Parent note doesn't exist (includes path)
}
```

### Result

Type alias for `Result<T, Error>`.

```rust
pub type Result<T> = std::result::Result<T, Error>;
```

## NotesApi

The main API for managing notes. Orchestrates filesystem operations and database indexing.

### Initialization

#### `NotesApi::new(notes_root: impl AsRef<Path>) -> Result<Self>`

Creates a new API instance at the specified directory.

- Creates the notes directory if it doesn't exist
- Creates `.notes.db` SQLite database if it doesn't exist
- Runs database migrations
- Verifies database schema

**Example:**
```rust
let mut api = NotesApi::new("/Users/alice/notes")?;
```

#### `NotesApi::with_default_path(debug: bool) -> Result<Self>`

Creates a new API instance using platform-specific default paths.

- **Debug mode**: `~/Documents/notes-dev` (all platforms)
- **macOS release**: `~/Library/Mobile Documents/com~apple~CloudDocs/notes` (iCloud), fallback to `~/Documents/notes`
- **Windows release**: `~/OneDrive/notes` (OneDrive), fallback to `~/Documents/notes`
- **Linux release**: `~/.local/share/folio/notes`

**Example:**
```rust
let debug = cfg!(debug_assertions);
let mut api = NotesApi::with_default_path(debug)?;
```

#### `startup_sync(&mut self) -> Result<()>`

Scans filesystem and syncs database index. **Call this after initialization** to handle external changes.

**Example:**
```rust
let mut api = NotesApi::new("/path/to/notes")?;
api.startup_sync()?; // Important!
```

#### `notes_root(&self) -> &Path`

Returns the root directory path.

#### `set_frecency_callback<F>(&mut self, callback: F)`

Sets a callback to be invoked when frecency scores are updated. Useful for refreshing UI navigation.

**Example:**
```rust
api.set_frecency_callback(|| {
    println!("Frecency scores updated!");
});
```

### CRUD Operations

#### `create_note(&mut self, path: &str) -> Result<Note>`

Creates a new **empty** note at the specified path.

- Path is relative to notes root (e.g., `"projects/rust-app"`)
- Creates directory and `_index.md` file
- Returns error if parent doesn't exist (notes must be created top-down)
- Returns error if note already exists
- Creates database entry and FTS index
- Returns the created note

**Example:**
```rust
// Create top-level note
let note = api.create_note("inbox")?;

// Create child note (parent must exist)
api.create_note("inbox/todo")?;
```

**Important:** `create_note` only creates an empty note. Use `save_note` to add content.

#### `get_note(&mut self, path: &str) -> Result<Note>`

Retrieves a note with full content.

- Reads content from filesystem
- Reads metadata from database
- **Records an access** for frecency tracking (propagates to ancestors)
- Returns `Error::NotFound` if note doesn't exist

**Example:**
```rust
let note = api.get_note("projects/rust-app")?;
println!("Content: {}", note.content);
println!("Modified: {:?}", note.modified);
```

#### `save_note(&mut self, path: &str, content: &str) -> Result<()>`

Updates note content.

- Writes content to filesystem
- Updates database: modification time, content hash, FTS index
- **Records an access** for frecency tracking
- Note must already exist (use `create_note` first)

**Example:**
```rust
api.create_note("notes")?;
api.save_note("notes", "# My Notes\n\nContent here.")?;
```

#### `delete_note(&mut self, path: &str) -> Result<()>`

Deletes a note and **all descendants recursively**.

- Removes directory from filesystem
- Removes database entries for note and all children
- Cannot be undone (use `archive_note` for soft delete)

**Example:**
```rust
api.delete_note("old-project")?;
// "old-project/notes" and all children are also deleted
```

#### `rename_note(&mut self, old_path: &str, new_path: &str) -> Result<()>`

Renames/moves a note and updates all descendant paths.

- Moves note in filesystem
- Updates database paths for note and all children
- Handles **case-only renames** (e.g., `"test"` → `"Test"`) using temporary path
- Returns `Error::NotFound` if old path doesn't exist
- Returns `Error::AlreadyExists` if new path exists (except for case-only renames)

**Example:**
```rust
// Simple rename
api.rename_note("old-name", "new-name")?;

// Move to different parent
api.rename_note("inbox/note", "projects/note")?;

// Case-only rename (safe on case-insensitive filesystems)
api.rename_note("myNote", "MyNote")?;
```

#### `note_exists(&self, path: &str) -> Result<bool>`

Checks if a note exists (fast database lookup, no content read).

**Example:**
```rust
if api.note_exists("projects")? {
    println!("Projects note exists");
}
```

### Navigation

#### `get_children(&self, path: &str) -> Result<Vec<NoteMetadata>>`

Returns all direct children of a note.

- Returns metadata only (no content)
- **Sorted by frecency score** (descending), then alphabetically
- Only includes notes where `parent_path == path`

**Example:**
```rust
let children = api.get_children("projects")?;
for child in children {
    println!("{} (modified: {:?})", child.path, child.modified);
}
```

#### `has_children(&self, path: &str) -> Result<bool>`

Returns `true` if the note has at least one non-archived child.

**Example:**
```rust
if api.has_children("projects")? {
    println!("Projects has children");
}
```

#### `get_parent(&self, path: &str) -> Result<Option<NoteMetadata>>`

Returns parent note metadata.

- Returns `None` for root-level notes
- Returns metadata only (no content)

**Example:**
```rust
if let Some(parent) = api.get_parent("projects/rust-app")? {
    println!("Parent: {}", parent.path); // "projects"
}
```

#### `get_ancestors(&self, path: &str) -> Result<Vec<NoteMetadata>>`

Returns all ancestor notes from root to current note.

- Returns full path hierarchy **including the current note itself**
- Ordered from root to current note
- Useful for breadcrumb navigation

**Example:**
```rust
let ancestors = api.get_ancestors("projects/rust-app/architecture")?;
// Returns: ["projects", "projects/rust-app", "projects/rust-app/architecture"]
for ancestor in ancestors {
    print!("{} > ", ancestor.path);
}
```

#### `get_root_notes(&self) -> Result<Vec<NoteMetadata>>`

Returns all top-level notes (notes without a parent).

- **Sorted by frecency score** (descending), then alphabetically
- Useful for main navigation

**Example:**
```rust
let roots = api.get_root_notes()?;
for root in roots {
    println!("📁 {}", root.path);
}
```

### Archive Operations

#### `archive_note(&mut self, path: &str) -> Result<()>`

Archives a note by moving it to `_archive` subfolder.

- Moves note to `parent/_archive/name` in filesystem
- Updates database: sets `archived = 1`, records `archived_at` timestamp
- Archives all descendants recursively
- This is a **soft delete** that can be undone with `unarchive_note`

**Example:**
```rust
// Archives "projects/old" to "projects/_archive/old"
api.archive_note("projects/old")?;
```

#### `unarchive_note(&mut self, path: &str) -> Result<()>`

Restores an archived note to its original location.

- Moves note from `_archive` back to parent directory
- Updates database: sets `archived = 0`, clears `archived_at`
- Unarchives all descendants recursively
- Path parameter should be the **current archived path** (containing `/_archive/`)

**Example:**
```rust
// Unarchives "projects/_archive/old" back to "projects/old"
api.unarchive_note("projects/_archive/old")?;
```

### Search and Sync

#### `search(&self, query: &str) -> Result<Vec<NoteMetadata>>`

Performs full-text search across all note content and paths.

- Uses SQLite FTS5 (Full-Text Search)
- Searches both note paths and content
- Supports FTS5 query syntax: phrases (`"exact match"`), boolean operators (`AND`, `OR`, `NOT`)

**Example:**
```rust
// Simple search
let results = api.search("rust programming")?;

// Phrase search
let results = api.search("\"error handling\"")?;

// Boolean search
let results = api.search("rust AND (web OR cli)")?;
```

#### `sync_note(&mut self, path: &str) -> Result<bool>`

Syncs a single note from filesystem to database.

- Reads note from filesystem
- Updates (or creates) database entry: mtime, content hash, FTS index
- Returns `true` if content actually changed, `false` if hash unchanged
- Used by file watcher to handle external changes

**Example:**
```rust
let changed = api.sync_note("projects/rust-app")?;
if changed {
    println!("Note was updated");
}
```

#### `rescan(&mut self) -> Result<()>`

Performs a full filesystem scan and rebuilds database index.

- Scans all notes in filesystem
- Syncs each note to database
- Removes database entries for notes that no longer exist
- Use after external filesystem changes or corruption

**Example:**
```rust
// After manually editing filesystem
api.rescan()?;
```

### Frecency Tracking

The API automatically tracks note access using a **frecency algorithm** (frequency + recency).

**Formula:** `access_count × (100 / (days_since_access + 1))`

- Higher scores for frequently accessed notes
- Recent access provides a significant boost
- Access is **propagated to all ancestors** (opening a child updates parent scores)
- Children and root notes are **sorted by frecency score** (descending)

**Tracked automatically by:**
- `get_note()` - Records access when reading content
- `save_note()` - Records access when saving

**Updates trigger `frecency_callback` if set**, allowing UI to refresh navigation.

## NoteFilesystem

Low-level filesystem operations. Generally you should use `NotesApi` instead, but this is available for direct filesystem access.

```rust
pub struct NoteFilesystem {
    // ...
}

impl NoteFilesystem {
    pub fn new<P: AsRef<Path>>(root_path: P) -> io::Result<Self>;
    pub fn root_path(&self) -> &Path;
    pub fn read_note(&self, path: &str) -> io::Result<String>;
    pub fn write_note(&self, path: &str, content: &str) -> io::Result<()>;
    pub fn create_note(&self, path: &str) -> io::Result<()>;
    pub fn delete_note(&self, path: &str) -> io::Result<()>;
    pub fn scan_all(&self) -> io::Result<Vec<FSNoteMetadata>>;
    pub fn get_ancestors(&self, path: &str) -> Vec<String>;
}
```

## File Watcher

Set up filesystem watching to automatically sync database when notes change externally.

### `setup_watcher<F>(notes_api: Arc<Mutex<NotesApi>>, on_change: Option<F>) -> RecommendedWatcher`

Creates a filesystem watcher that monitors the notes directory.

**Features:**
- Monitors `_index.md` files for content changes
- Detects note creation, modification, and deletion
- Detects note renames and moves
- Uses content hash comparison to avoid triggering on identical writes
- Automatically syncs database when changes detected
- Calls optional callback with event type

**Events:**
- `WatcherEvent::NotesChanged` - Note content modified
- `WatcherEvent::NotesRenamed` - Note renamed or moved
- `WatcherEvent::FrecencyUpdated` - Frecency scores changed

**Example:**
```rust
use folio_core::{NotesApi, setup_watcher, WatcherEvent};
use std::sync::{Arc, Mutex};

let mut api = NotesApi::new("/path/to/notes")?;
api.startup_sync()?;

let api = Arc::new(Mutex::new(api));

let _watcher = setup_watcher(
    Arc::clone(&api),
    Some(|event: WatcherEvent| {
        match event {
            WatcherEvent::NotesChanged => println!("Notes changed!"),
            WatcherEvent::NotesRenamed => println!("Notes renamed!"),
            WatcherEvent::FrecencyUpdated => println!("Frecency updated!"),
        }
    })
);

// Keep _watcher alive for the duration of your application
// Dropping it will stop filesystem monitoring
```

## Default Paths

### `get_default_notes_path(debug: bool) -> Option<PathBuf>`

Returns platform-specific default notes directory.

**Debug mode (`debug = true`):**
- All platforms: `~/Documents/notes-dev`

**Release mode (`debug = false`):**
- **macOS**: 
  1. Try `~/Library/Mobile Documents/com~apple~CloudDocs/notes` (iCloud Drive)
  2. Fallback to `~/Documents/notes`
- **Windows**: 
  1. Try `$OneDrive/notes` (OneDrive)
  2. Fallback to `~/Documents/notes`
- **Linux**: `~/.local/share/zinnia/notes` (XDG standard)

**Example:**
```rust
use zinnia_core::get_default_notes_path;

let debug = cfg!(debug_assertions);
if let Some(path) = get_default_notes_path(debug) {
    println!("Default notes path: {:?}", path);
}
```

## Complete Example

```rust
use zinnia_core::{NotesApi, Result, setup_watcher, WatcherEvent};
use std::sync::{Arc, Mutex};

fn main() -> Result<()> {
    // Initialize API with default path
    let debug = cfg!(debug_assertions);
    let mut api = NotesApi::with_default_path(debug)?;
    
    // Sync filesystem on startup
    api.startup_sync()?;
    
    // Set frecency callback
    api.set_frecency_callback(|| {
        println!("📊 Frecency scores updated");
    });
    
    // Create notes
    api.create_note("inbox")?;
    api.save_note("inbox", "# Inbox\n\nCapture thoughts here.")?;
    
    api.create_note("projects")?;
    api.create_note("projects/rust-app")?;
    api.save_note("projects/rust-app", "# Rust App\n\nBuilding a notes app.")?;
    
    // Navigate hierarchy
    let roots = api.get_root_notes()?;
    for root in roots {
        println!("📁 {}", root.path);
        
        let children = api.get_children(&root.path)?;
        for child in children {
            println!("  📄 {}", child.path);
        }
    }
    
    // Search
    let results = api.search("rust")?;
    println!("Search found {} notes", results.len());
    
    // Archive
    api.archive_note("inbox")?;
    println!("Archived inbox");
    
    // Setup watcher
    let api = Arc::new(Mutex::new(api));
    let _watcher = setup_watcher(
        Arc::clone(&api),
        Some(|event: WatcherEvent| {
            println!("File system event: {:?}", event);
        })
    );
    
    // Keep running...
    // _watcher must stay in scope
    
    Ok(())
}
```
