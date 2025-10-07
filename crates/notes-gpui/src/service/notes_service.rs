use std::path::Path;

use gpui::{Context, EventEmitter, Global};
use notes_core::{Error, Note, NoteMetadata, NotesApi, Result};

/// Events emitted by NotesService for all mutation operations
#[derive(Debug, Clone)]
pub enum NotesEvent {
    NoteCreated { path: String },
    NoteUpdated { path: String },
    NoteDeleted { path: String },
    NoteRenamed { old_path: String, new_path: String },
    NoteArchived { path: String },
    NoteUnarchived { path: String },
    NoteSynced { path: String },
    NotesReindexed,
}

/// GPUI wrapper around NotesApi that emits events for mutation operations.
///
/// This service is framework-aware (depends on GPUI) while keeping the underlying
/// NotesApi pure Rust and framework-agnostic for reuse in other contexts.
pub struct NotesService {
    api: NotesApi,
}

impl NotesService {
    /// Creates a new NotesService instance.
    ///
    /// Initializes the underlying NotesApi with the specified notes_root directory.
    pub fn new<P: AsRef<Path>>(notes_root: P) -> Result<Self> {
        let api = NotesApi::new(notes_root)?;
        Ok(Self { api })
    }

    /// Syncs the database index with the filesystem on startup.
    ///
    /// Emits NotesReindexed event after successful sync.
    pub fn startup_sync(&mut self, cx: &mut Context<Self>) -> Result<()> {
        self.api.startup_sync()?;
        cx.emit(NotesEvent::NotesReindexed);
        Ok(())
    }

    // Core CRUD operations (mutations - emit events)

    /// Creates a new empty note at the specified path.
    ///
    /// Emits NoteCreated event after successful creation.
    pub fn create_note(&mut self, path: &str, cx: &mut Context<Self>) -> Result<Note> {
        let note = self.api.create_note(path)?;
        cx.emit(NotesEvent::NoteCreated {
            path: path.to_string(),
        });
        Ok(note)
    }

    /// Updates an existing note's content.
    ///
    /// Emits NoteUpdated event after successful save.
    pub fn save_note(
        &mut self,
        path: &str,
        content: &str, // , cx: &mut Context<Self>
    ) -> Result<()> {
        self.api.save_note(path, content)?;
        // cx.emit(NotesEvent::NoteUpdated {
        //     path: path.to_string(),
        // });
        Ok(())
    }

    /// Deletes a note and all its descendants recursively.
    ///
    /// Emits NoteDeleted event after successful deletion.
    pub fn delete_note(&mut self, path: &str, cx: &mut Context<Self>) -> Result<()> {
        self.api.delete_note(path)?;
        cx.emit(NotesEvent::NoteDeleted {
            path: path.to_string(),
        });
        Ok(())
    }

    /// Renames a note and updates all descendant paths.
    ///
    /// Emits NoteRenamed event after successful rename.
    pub fn rename_note(
        &mut self,
        old_path: &str,
        new_path: &str,
        cx: &mut Context<Self>,
    ) -> Result<()> {
        self.api.rename_note(old_path, new_path)?;
        cx.emit(NotesEvent::NoteRenamed {
            old_path: old_path.to_string(),
            new_path: new_path.to_string(),
        });
        Ok(())
    }

    // Archive operations (mutations - emit events)

    /// Archives a note by moving it to an _archive subfolder.
    ///
    /// Emits NoteArchived event after successful archive.
    pub fn archive_note(&mut self, path: &str, cx: &mut Context<Self>) -> Result<()> {
        self.api.archive_note(path)?;
        cx.emit(NotesEvent::NoteArchived {
            path: path.to_string(),
        });
        Ok(())
    }

    /// Restores an archived note to its original location.
    ///
    /// Emits NoteUnarchived event after successful restore.
    pub fn unarchive_note(&mut self, path: &str, cx: &mut Context<Self>) -> Result<()> {
        self.api.unarchive_note(path)?;
        cx.emit(NotesEvent::NoteUnarchived {
            path: path.to_string(),
        });
        Ok(())
    }

    // Search and sync operations

    /// Syncs a single note from filesystem to database.
    ///
    /// Emits NoteSynced event after successful sync.
    pub fn sync_note(&mut self, path: &str, cx: &mut Context<Self>) -> Result<()> {
        self.api.sync_note(path)?;
        cx.emit(NotesEvent::NoteSynced {
            path: path.to_string(),
        });
        Ok(())
    }

    /// Performs a full filesystem scan and rebuilds the database index.
    ///
    /// Emits NotesReindexed event after successful rescan.
    pub fn rescan(&mut self, cx: &mut Context<Self>) -> Result<()> {
        self.api.rescan()?;
        cx.emit(NotesEvent::NotesReindexed);
        Ok(())
    }

    // Read operations (no events emitted)

    /// Retrieves a note with its full content.
    pub fn get_note(&self, path: &str) -> Result<Note> {
        self.api.get_note(path)
    }

    /// Checks if a note exists at the specified path.
    pub fn note_exists(&self, path: &str) -> Result<bool> {
        self.api.note_exists(path)
    }

    /// Returns all direct children of a note.
    pub fn get_children(&self, path: &str) -> Result<Vec<NoteMetadata>> {
        self.api.get_children(path)
    }

    /// Returns the parent note's metadata.
    pub fn get_parent(&self, path: &str) -> Result<Option<NoteMetadata>> {
        self.api.get_parent(path)
    }

    /// Returns all ancestor notes from root to parent.
    pub fn get_ancestors(&self, path: &str) -> Result<Vec<NoteMetadata>> {
        self.api.get_ancestors(path)
    }

    /// Returns all top-level notes (notes without a parent).
    pub fn get_root_notes(&self) -> Result<Vec<NoteMetadata>> {
        self.api.get_root_notes()
    }

    /// Performs full-text search across all note content.
    pub fn search(&self, query: &str) -> Result<Vec<NoteMetadata>> {
        self.api.search(query)
    }
}

impl EventEmitter<NotesEvent> for NotesService {}

impl Global for NotesService {}
