# Notes - Cargo Workspace

A markdown notes application with multiple frontend implementations.

## Workspace Structure

This project is organized as a Cargo workspace with the following crates:

### `notes-core`

**Framework-agnostic core library** containing:
- `NotesApi` - Main API for notes management (CRUD, search, navigation)
- `NoteFilesystem` - Low-level filesystem operations for `_index.md` files
- SQLite database integration with FTS5 full-text search
- No UI framework dependencies

**Usage in other projects:**
```toml
[dependencies]
notes-core = { path = "path/to/notes/crates/notes-core" }
```

**Build and test:**
```bash
cargo build -p notes-core
cargo test -p notes-core
```

### `notes-gpui`

**GPUI frontend implementation** (currently needs GPUI API updates):
- `NotesService` - GPUI wrapper with event emission
- Text editor UI components
- Main application window

**Note:** This crate currently has compilation errors due to GPUI API version mismatches. It will need to be updated to match the GPUI version being used.

### `folio` (Tauri Frontend)

**Tauri frontend implementation** - already integrated into the workspace:
- Located at `crates/folio/src-tauri`
- Already configured to use `notes-core` as a dependency
- Frontend code in `crates/folio/src` (TypeScript/JavaScript)

**Build the Tauri app:**
```bash
cd crates/folio
npm install  # or bun install
npm run tauri dev
```

## Core API Overview

The `notes-core` crate provides:

- **CRUD Operations**: `create_note()`, `get_note()`, `save_note()`, `delete_note()`, `rename_note()`
- **Navigation**: `get_children()`, `get_parent()`, `get_ancestors()`, `get_root_notes()`
- **Search**: `search()` using FTS5 full-text search
- **Archive**: `archive_note()`, `unarchive_note()`
- **Sync**: `sync_note()`, `rescan()`, `startup_sync()`

See `CLAUDE.md` for detailed architecture documentation.

## Building the Workspace

```bash
# Build all crates
cargo build

# Build specific crate
cargo build -p notes-core
cargo build -p folio

# Run tests
cargo test -p notes-core

# Run the Tauri app
cd crates/folio
npm run tauri dev

# Run the GPUI app (once API issues are fixed)
cargo run -p notes-gpui
```
