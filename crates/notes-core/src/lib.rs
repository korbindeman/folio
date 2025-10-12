pub mod filesystem;
pub mod notes;
pub mod watcher;

// Re-export main types for convenience
pub use filesystem::{FSNoteMetadata, NoteFilesystem};
pub use notes::{Error, Note, NoteMetadata, NotesApi, Result};
pub use watcher::setup_watcher;
