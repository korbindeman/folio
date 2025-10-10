# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A markdown notes application with multiple frontend implementations. Notes are stored as `directory/_index.md` files on the filesystem with a SQLite database for indexing and full-text search.

**Key Design Principle**: The core `NotesApi` is framework-agnostic (pure Rust, no GPUI dependencies) to enable reuse in mobile apps, Tauri, or other frontends.

## Workspace Structure

This is a Cargo workspace with the following crates:

- **`crates/notes-core`** - Framework-agnostic core library (NotesApi, NoteFilesystem)
- **`crates/notes-gpui`** - GPUI frontend (currently needs API updates)
- **`crates/folio/src-tauri`** - Tauri frontend (fully integrated)

## Build & Test Commands

```bash
# Build all workspace crates
cargo build

# Build specific crate
cargo build -p notes-core
cargo build -p notes-gpui

# Run all tests
cargo test

# Run tests for specific crate
cargo test -p notes-core

# Run specific test module
cargo test -p notes-core notes::
cargo test -p notes-core filesystem::

# Run single test
cargo test -p notes-core test_create_note

# Check compilation without building
cargo check
```

## Architecture

### Layer Separation

**Core (Framework-Agnostic)** - `crates/notes-core`:
- `notes.rs` - `NotesApi`: Core API orchestrating filesystem + database operations
- `filesystem.rs` - `NoteFilesystem`: Low-level filesystem operations for `_index.md` files
- `lib.rs` - Public exports for library consumers

**GPUI Integration** - `crates/notes-gpui`:
- `service/notes_service.rs` - `NotesService`: GPUI wrapper emitting events for mutations
- `app.rs` - `Main`: Root GPUI component
- `ui/` - UI components (editor, breadcrumb)
- `actions.rs` - GPUI actions for keyboard bindings

### Data Flow

```
User Input → GPUI Actions → NotesService (emits events)
                                ↓
                           NotesApi (orchestration)
                          ↙            ↘
                  NoteFilesystem    SQLite Database
                  (_index.md)       (index + FTS5)
```

**Filesystem is source of truth**, database is derived index.

### NotesApi Architecture

`NotesApi` orchestrates two layers:

1. **Filesystem** (`NoteFilesystem`):
   - Stores notes at `directory/_index.md`
   - Paths are relative to notes root (e.g., `"projects/rust-app"`)
   - Methods: `read_note()`, `write_note()`, `create_note()`, `delete_note()`, `scan_all()`, `get_ancestors()`

2. **Database** (SQLite at `notes_root/.notes.db`):
   - `notes` table: indexes paths, mtime, content_hash, parent_path, archived status
   - `notes_fts` FTS5 virtual table: full-text search on paths and content
   - Migration system using `PRAGMA user_version`

**Key Methods**:
- **CRUD**: `create_note()` (creates empty), `save_note()` (updates content), `get_note()`, `delete_note()`, `rename_note()`
- **Navigation**: `get_children()`, `get_parent()`, `get_ancestors()`, `get_root_notes()`
- **Archive**: `archive_note()` (moves to `_archive` subfolder), `unarchive_note()`
- **Search/Sync**: `search()` (FTS5), `sync_note()` (single), `rescan()` (full), `startup_sync()`

**Important**: `create_note()` only creates empty notes. Use `save_note()` to add content afterward.

### NotesService Event System

`NotesService` wraps `NotesApi` and implements `EventEmitter<NotesEvent>` + `Global`:

**Events emitted**:
- `NoteCreated`, `NoteUpdated`, `NoteDeleted`
- `NoteRenamed { old_path, new_path }`
- `NoteArchived`, `NoteUnarchived`
- `NoteSynced`, `NotesReindexed`

**Pattern**: Mutation methods take `&mut Context<Self>` and call `cx.emit()` after successful operations. Read methods don't emit events.

### Database Schema

```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    parent_path TEXT,              -- derived from path for fast queries
    mtime INTEGER NOT NULL,         -- Unix timestamp
    content_hash TEXT NOT NULL,     -- for change detection
    archived INTEGER DEFAULT 0,
    archived_at INTEGER
);

CREATE VIRTUAL TABLE notes_fts USING fts5(
    path UNINDEXED,
    content
);
```

**Indexes**: `idx_parent_path`, `idx_archived`

### File Structure Conventions

- Notes stored as `{root}/{path}/_index.md`
  - Empty path `""` → `{root}/_index.md` (root note)
  - Path `"projects"` → `{root}/projects/_index.md`
  - Path `"projects/rust"` → `{root}/projects/rust/_index.md`
- Archived notes move to `_archive` subfolder within parent directory

### Testing

Tests use `tempfile::TempDir` for isolated filesystems. Database is automatically created at `.notes.db` in temp directory.

When writing tests:
- Tests for `NotesApi` should test both filesystem and database effects
- Use `api.note_exists()` to verify database state
- Read filesystem directly to verify file creation
- Tests for `NoteFilesystem` only test filesystem operations

### Using notes-core in Other Projects

To use the core library in a Tauri or other Rust project:

```toml
[dependencies]
notes-core = { path = "../notes-core" }
```

Then import and use:

```rust
use notes_core::{NotesApi, Note, Error};

fn main() -> Result<(), Error> {
    let mut api = NotesApi::new("/path/to/notes")?;
    api.startup_sync()?;
    
    let note = api.create_note("my-note")?;
    api.save_note("my-note", "# Hello World")?;
    
    let results = api.search("hello")?;
    Ok(())
}
```

### Current State

- **notes-core**: ✅ Fully functional, all 38 tests passing
- **notes-gpui**: ⚠️ Needs GPUI API updates to match current version
- **folio (Tauri)**: ✅ Integrated into workspace, ready to use `notes-core`

Notes directory: `~/.my-notes` (configurable)

### Running the Tauri App

```bash
cd crates/folio
npm install  # or bun install
npm run tauri dev
```
