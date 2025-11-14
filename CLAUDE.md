# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A markdown notes application built with Rust (backend) and SolidJS + Tauri (frontend). Notes are stored as `directory/_index.md` files on the filesystem with a SQLite database for indexing and full-text search.

**Key Design Principle**: The core `zinnia_core` library is framework-agnostic (pure Rust) to enable reuse across different frontends (Tauri, mobile apps, etc.).

## Workspace Structure

This is a Cargo workspace with the following crates:

- **`crates/core`** - Framework-agnostic core library (`zinnia_core` package)
  - `notes.rs` - `NotesApi`: Core API orchestrating filesystem + database operations
  - `filesystem.rs` - `NoteFilesystem`: Low-level filesystem operations for `_index.md` files
  - `watcher.rs` - File system watcher using `notify` crate
  - `lib.rs` - Public exports

- **`crates/frontend`** - Tauri application (`zinnia_frontend` package)
  - `src-tauri/` - Rust backend with Tauri commands
  - `src/` - SolidJS frontend with Milkdown editor
  - Uses Vite as build tool, Tailwind CSS for styling

## Build & Test Commands

### Rust (Backend)

```bash
# Build all workspace crates
cargo build

# Build specific crate
cargo build -p zinnia_core
cargo build -p zinnia_frontend

# Run all tests
cargo test

# Run tests for specific crate
cargo test -p zinnia_core

# Run specific test module
cargo test -p zinnia_core notes::
cargo test -p zinnia_core filesystem::

# Run single test
cargo test -p zinnia_core test_create_note

# Check compilation without building
cargo check
```

### Frontend (Tauri App)

```bash
cd crates/frontend

# Install dependencies
npm install  # or bun install

# Run in development mode (hot reload)
npm run tauri dev

# Build for production
npm run tauri build

# Format frontend code
npm run format

# Run Vite dev server only (without Tauri)
npm run dev
```

## Architecture

### Layer Separation

**Core (Framework-Agnostic)** - `crates/core`:
- Pure Rust library with no UI framework dependencies
- Handles all business logic, filesystem operations, and database management
- Can be integrated into any Rust application (Tauri, mobile apps, CLI tools)

**Tauri Integration** - `crates/frontend/src-tauri`:
- Thin wrapper exposing `NotesApi` methods as Tauri commands
- DTO types for JSON serialization (`NoteDTO`, `NoteMetadataDTO`)
- File watcher setup that emits events to frontend (`notes:changed`, `notes:renamed`)
- Uses `Arc<Mutex<NotesApi>>` for thread-safe state management

**Frontend** - `crates/frontend/src`:
- SolidJS reactive UI framework
- Milkdown markdown editor
- Tailwind CSS for styling
- Communicates with Rust backend via Tauri IPC

### Data Flow

```
User Input → SolidJS UI → Tauri Commands → NotesApi
                                              ↓
                                         (orchestration)
                                        ↙            ↘
                                NoteFilesystem    SQLite Database
                                (_index.md)       (index + FTS5)
                                        ↓
                                File Watcher → Frontend Events
```

**Filesystem is source of truth**, database is derived index.

### NotesApi Architecture

`NotesApi` (in `crates/core/src/notes.rs`) orchestrates two layers:

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

### File Watcher System

The `watcher` module (in `crates/core/src/watcher.rs`) provides real-time filesystem monitoring:

- Uses the `notify` crate to watch for file changes
- Debounces events to avoid excessive updates
- Emits two event types:
  - `WatcherEvent::NotesChanged` - Note content modified
  - `WatcherEvent::NotesRenamed` - Note renamed or moved
- In Tauri app, these are forwarded to frontend as `notes:changed` and `notes:renamed` events

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

### Using zinnia_core in Other Projects

To use the core library in a Tauri or other Rust project:

```toml
[dependencies]
zinnia_core = { path = "../path/to/zinnia/crates/core" }
```

Then import and use:

```rust
use zinnia_core::{NotesApi, Note, Error};

fn main() -> Result<(), Error> {
    let mut api = NotesApi::new("/path/to/notes")?;
    api.startup_sync()?;
    
    let note = api.create_note("my-note")?;
    api.save_note("my-note", "# Hello World")?;
    
    let results = api.search("hello")?;
    Ok(())
}
```

### Notes Directory Locations

The Tauri app stores notes in different locations based on build mode:

- **Development** (`debug_assertions`): `~/Documents/notes-dev`
- **Production**: `~/Library/Mobile Documents/com~apple~CloudDocs/notes` (iCloud Drive on macOS)
  - Falls back to `~/Documents/notes` if iCloud path not available
