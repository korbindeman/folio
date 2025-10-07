pub mod filesystem;
pub mod notes;

// Re-export main types for convenience
pub use filesystem::{FSNoteMetadata, NoteFilesystem};
pub use notes::{Error, Note, NoteMetadata, NotesApi, Result};
