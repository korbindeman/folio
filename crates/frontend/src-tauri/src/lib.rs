use folio_core::{Note, NoteMetadata, NotesApi, WatcherEvent, setup_watcher};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, State};

// Application state holding the NotesApi instance
pub struct AppState {
    notes_api: Arc<Mutex<NotesApi>>,
}

// Serializable versions of the core types for Tauri/JSON
#[derive(Serialize, Deserialize)]
pub struct NoteDTO {
    id: i64,
    path: String,
    content: String,
    modified: u64, // Unix timestamp
}

#[derive(Serialize, Deserialize)]
pub struct NoteMetadataDTO {
    id: i64,
    path: String,
    modified: u64, // Unix timestamp
    archived: bool,
}

// Convert core types to DTOs
impl From<Note> for NoteDTO {
    fn from(note: Note) -> Self {
        NoteDTO {
            id: note.id,
            path: note.path,
            content: note.content,
            modified: note
                .modified
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

impl From<NoteMetadata> for NoteMetadataDTO {
    fn from(meta: NoteMetadata) -> Self {
        NoteMetadataDTO {
            id: meta.id,
            path: meta.path,
            modified: meta
                .modified
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            archived: meta.archived,
        }
    }
}

// Tauri Commands

#[tauri::command]
fn create_note(path: String, state: State<AppState>) -> Result<NoteDTO, String> {
    let mut api = state.notes_api.lock().unwrap();
    api.create_note(&path)
        .map(|note| note.into())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_note(path: String, state: State<AppState>) -> Result<NoteDTO, String> {
    let mut api = state.notes_api.lock().unwrap();
    api.get_note(&path)
        .map(|note| note.into())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn save_note(path: String, content: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.notes_api.lock().unwrap();
    api.save_note(&path, &content)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn delete_note(path: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.notes_api.lock().unwrap();
    api.delete_note(&path).map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn rename_note(old_path: String, new_path: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.notes_api.lock().unwrap();
    api.rename_note(&old_path, &new_path)
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_children(path: String, state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.notes_api.lock().unwrap();
    api.get_children(&path)
        .map(|children| children.into_iter().map(|c| c.into()).collect())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn has_children(path: String, state: State<AppState>) -> Result<bool, String> {
    let api = state.notes_api.lock().unwrap();
    api.has_children(&path).map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_ancestors(path: String, state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.notes_api.lock().unwrap();
    api.get_ancestors(&path)
        .map(|ancestors| ancestors.into_iter().map(|a| a.into()).collect())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn get_root_notes(state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.notes_api.lock().unwrap();
    api.get_root_notes()
        .map(|notes| notes.into_iter().map(|n| n.into()).collect())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn search_notes(query: String, state: State<AppState>) -> Result<Vec<NoteMetadataDTO>, String> {
    let api = state.notes_api.lock().unwrap();
    api.search(&query)
        .map(|results| results.into_iter().map(|r| r.into()).collect())
        .map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn archive_note(path: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.notes_api.lock().unwrap();
    api.archive_note(&path).map_err(|e| format!("{:?}", e))
}

#[tauri::command]
fn unarchive_note(path: String, state: State<AppState>) -> Result<(), String> {
    let mut api = state.notes_api.lock().unwrap();
    api.unarchive_note(&path).map_err(|e| format!("{:?}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut api =
        NotesApi::with_default_path(cfg!(debug_assertions)).expect("Failed to initialize NotesApi");
    api.startup_sync().expect("Failed to sync notes database");

    let notes_api = Arc::new(Mutex::new(api));

    let state = AppState {
        notes_api: Arc::clone(&notes_api),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            create_note,
            get_note,
            save_note,
            delete_note,
            rename_note,
            get_children,
            has_children,
            get_ancestors,
            get_root_notes,
            search_notes,
            archive_note,
            unarchive_note,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // Setup filesystem watcher with event emission
            let _watcher = setup_watcher(
                notes_api,
                Some(move |event| {
                    let event_name = match event {
                        WatcherEvent::NotesChanged => "notes:changed",
                        WatcherEvent::NotesRenamed => "notes:renamed",
                    };

                    // Emit event to frontend
                    if let Err(e) = app_handle.emit(event_name, ()) {
                        eprintln!("Failed to emit watcher event: {:?}", e);
                    }
                }),
            );

            // Keep watcher alive for app lifetime
            app.manage(_watcher);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
