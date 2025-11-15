pub mod default_paths;
pub mod filesystem;
pub mod notes;
pub mod watcher;

// Re-export main types for convenience
pub use default_paths::{get_default_notes_path, migrate_legacy_notes_path};
pub use filesystem::{FSNoteMetadata, NoteFilesystem};
pub use notes::{Error, Note, NoteMetadata, NotesApi, Result};
pub use watcher::{WatcherEvent, setup_watcher};
