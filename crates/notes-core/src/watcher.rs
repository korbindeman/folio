use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};

use crate::NotesApi;

/// Event type emitted by the filesystem watcher
#[derive(Debug, Clone)]
pub enum WatcherEvent {
    /// Notes were modified (created, updated, or deleted)
    NotesChanged,
    /// Notes were renamed or moved
    NotesRenamed,
}

/// Sets up a filesystem watcher for the notes directory.
///
/// This watcher monitors the filesystem for changes to notes and automatically
/// syncs the database when changes are detected. It handles:
/// - Note content modifications (_index.md files)
/// - Note folder creation and deletion
/// - Note folder renames and moves
///
/// The watcher uses debouncing to avoid excessive rescans during bulk operations.
///
/// # Arguments
///
/// * `notes_api` - Arc-wrapped NotesApi instance to sync when changes are detected
/// * `on_change` - Optional callback function that will be called when changes are detected
///
/// # Returns
///
/// Returns a `RecommendedWatcher` that must be kept alive for the duration of watching.
/// Dropping the watcher will stop filesystem monitoring.
///
/// # Example
///
/// ```no_run
/// use notes_core::{NotesApi, setup_watcher};
/// use std::sync::{Arc, Mutex};
///
/// let api = NotesApi::new("/path/to/notes").unwrap();
/// let api = Arc::new(Mutex::new(api));
/// let _watcher = setup_watcher(Arc::clone(&api), None);
/// // Keep _watcher alive while you want to monitor filesystem changes
/// ```
pub fn setup_watcher<F>(notes_api: Arc<Mutex<NotesApi>>, on_change: Option<F>) -> RecommendedWatcher
where
    F: Fn(WatcherEvent) + Send + 'static,
{
    let last_rescan = Arc::new(Mutex::new(Instant::now()));
    let notes_root = {
        let api = notes_api.lock().unwrap();
        api.notes_root().to_path_buf()
    };

    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            match result {
                Ok(event) => {
                    // Ignore changes to the database file itself to prevent loops
                    let is_db_change = event.paths.iter().any(|p| {
                        p.file_name()
                            .and_then(|n| n.to_str())
                            .map_or(false, |name| {
                                name == ".notes.db" || name.starts_with(".notes.db-")
                            })
                    });

                    if is_db_change {
                        return;
                    }

                    // Check if this is a note-related change (involves _index.md or note directories)
                    let is_note_related = event.paths.iter().any(|p| {
                        // Check if it's an _index.md file
                        if p.file_name().and_then(|n| n.to_str()) == Some("_index.md") {
                            return true;
                        }

                        // Check if it's a directory that might contain notes
                        if p.is_dir() {
                            // Check if it contains _index.md
                            let index_path = p.join("_index.md");
                            return index_path.exists();
                        }

                        false
                    });

                    use notify::EventKind;
                    match event.kind {
                        // Handle rename/move events first - they need full rescan
                        EventKind::Modify(notify::event::ModifyKind::Name(_)) => {
                            println!("Rename/move event detected - {:?}", event.paths);

                            // Debounce: only rescan if at least 500ms has passed since last rescan
                            let mut last = last_rescan.lock().unwrap();
                            let now = Instant::now();
                            if now.duration_since(*last) < Duration::from_millis(500) {
                                return;
                            }
                            *last = now;

                            if let Ok(mut api) = notes_api.lock() {
                                if let Err(e) = api.rescan() {
                                    eprintln!("Failed to rescan after rename: {:?}", e);
                                } else {
                                    println!(
                                        "Notes database rescanned successfully after rename/move"
                                    );
                                    // Notify callback if provided
                                    if let Some(ref callback) = on_change {
                                        callback(WatcherEvent::NotesRenamed);
                                    }
                                }
                            }
                        }
                        // Handle other filesystem events
                        EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => {
                            if !is_note_related {
                                return;
                            }

                            // Debounce: only rescan if at least 500ms has passed since last rescan
                            let mut last = last_rescan.lock().unwrap();
                            let now = Instant::now();
                            if now.duration_since(*last) < Duration::from_millis(500) {
                                return;
                            }
                            *last = now;

                            println!("Filesystem change detected: {:?}", event.kind);
                            if let Ok(mut api) = notes_api.lock() {
                                if let Err(e) = api.rescan() {
                                    eprintln!("Failed to rescan notes: {:?}", e);
                                } else {
                                    println!("Notes database rescanned successfully");
                                    // Notify callback if provided
                                    if let Some(ref callback) = on_change {
                                        callback(WatcherEvent::NotesChanged);
                                    }
                                }
                            }
                        }
                        _ => {
                            // Ignore other event types
                        }
                    }
                }
                Err(e) => eprintln!("Filesystem watcher error: {:?}", e),
            }
        },
        Config::default(),
    )
    .expect("Failed to create filesystem watcher");

    watcher
        .watch(&notes_root, RecursiveMode::Recursive)
        .expect("Failed to start watching notes directory");

    println!("Watching notes directory: {:?}", notes_root);
    watcher
}
