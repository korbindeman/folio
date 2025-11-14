# Error Handling Guide

⚠️ This document is AI-generated

This document explains error handling in the `zinnia_core` library.

## Error Type

All API methods return `Result<T, Error>` where `Error` is defined as:

```rust
pub enum Error {
    Io(std::io::Error),
    Database(rusqlite::Error),
    DatabaseCorrupted,
    NotFound(String),
    AlreadyExists(String),
    ParentNotFound(String),
}

pub type Result<T> = std::result::Result<T, Error>;
```

## Error Variants

### `Error::Io(std::io::Error)`

Wraps filesystem I/O errors.

**Common causes:**
- File or directory not found
- Permission denied
- Disk full
- Invalid path characters

**Example scenarios:**
```rust
// Reading a note that was deleted externally
let result = api.get_note("deleted-note");
// May return: Error::Io with ErrorKind::NotFound

// Creating a note with invalid characters
let result = api.create_note("invalid/\0/path");
// Returns: Error::Io with ErrorKind::InvalidInput
```

**Handling:**
```rust
match api.get_note("my-note") {
    Ok(note) => println!("Got note: {}", note.content),
    Err(Error::Io(io_err)) => {
        match io_err.kind() {
            std::io::ErrorKind::NotFound => {
                eprintln!("Note file not found on filesystem");
            }
            std::io::ErrorKind::PermissionDenied => {
                eprintln!("Permission denied accessing note file");
            }
            _ => eprintln!("I/O error: {}", io_err),
        }
    }
    Err(e) => eprintln!("Other error: {:?}", e),
}
```

### `Error::Database(rusqlite::Error)`

Wraps SQLite database errors.

**Common causes:**
- Database file locked (another process accessing it)
- SQL constraint violation
- Disk full during write
- Query timeout

**Example scenarios:**
```rust
// Database file is locked by another process
let result = api.create_note("note");
// May return: Error::Database(rusqlite::Error)

// Database file permissions issue
let result = NotesApi::new("/read-only/path");
// Returns: Error::Database with permission error
```

**Handling:**
```rust
match api.save_note("note", "content") {
    Ok(_) => println!("Saved successfully"),
    Err(Error::Database(db_err)) => {
        eprintln!("Database error: {}", db_err);
        // Consider retrying for lock errors
        if db_err.to_string().contains("locked") {
            eprintln!("Database is locked, try again later");
        }
    }
    Err(e) => eprintln!("Other error: {:?}", e),
}
```

### `Error::DatabaseCorrupted`

Database schema is invalid or corrupted.

**Common causes:**
- Database file corrupted
- Wrong schema version
- Missing required tables or indexes
- Manual database modification went wrong

**Example scenarios:**
```rust
// Opening a database with missing tables
let result = NotesApi::new("/path/with/bad/db");
// Returns: Error::DatabaseCorrupted

// Database file is not a SQLite database
// (e.g., file was manually replaced with invalid data)
```

**Handling:**
```rust
match NotesApi::new("/path/to/notes") {
    Ok(api) => println!("Database opened successfully"),
    Err(Error::DatabaseCorrupted) => {
        eprintln!("Database is corrupted!");
        eprintln!("Options:");
        eprintln!("1. Delete .notes.db and rescan (loses metadata)");
        eprintln!("2. Restore from backup");
        eprintln!("3. Try manual recovery");
    }
    Err(e) => eprintln!("Other error: {:?}", e),
}
```

**Recovery strategy:**
```rust
use std::fs;

// Backup corrupted database
fs::rename(
    "/path/to/notes/.notes.db",
    "/path/to/notes/.notes.db.corrupted"
)?;

// Create fresh database (will rescan filesystem)
let mut api = NotesApi::new("/path/to/notes")?;
api.startup_sync()?;
// All notes are re-indexed from filesystem
```

### `Error::NotFound(String)`

Note doesn't exist in the database.

**Common causes:**
- Trying to read a note that was never created
- Note was deleted
- Note path is misspelled
- Database out of sync with filesystem

**Example scenarios:**
```rust
// Reading a non-existent note
let result = api.get_note("does-not-exist");
// Returns: Error::NotFound("does-not-exist")

// Renaming a note that doesn't exist
let result = api.rename_note("old", "new");
// Returns: Error::NotFound("old")
```

**Handling:**
```rust
match api.get_note("my-note") {
    Ok(note) => println!("Note: {}", note.content),
    Err(Error::NotFound(path)) => {
        eprintln!("Note '{}' not found", path);
        println!("Would you like to create it? (y/n)");
        // ... handle user input
    }
    Err(e) => eprintln!("Error: {:?}", e),
}
```

**Auto-recovery:**
```rust
fn get_or_create_note(api: &mut NotesApi, path: &str) -> Result<Note> {
    match api.get_note(path) {
        Ok(note) => Ok(note),
        Err(Error::NotFound(_)) => {
            // Auto-create if not found
            api.create_note(path)
        }
        Err(e) => Err(e),
    }
}
```

### `Error::AlreadyExists(String)`

Note already exists at the specified path.

**Common causes:**
- Trying to create a note that already exists
- Renaming a note to a path that's already taken
- Race condition (note created between check and creation)

**Example scenarios:**
```rust
// Creating a note twice
api.create_note("note")?;
let result = api.create_note("note");
// Returns: Error::AlreadyExists("note")

// Renaming to existing path
api.create_note("old")?;
api.create_note("new")?;
let result = api.rename_note("old", "new");
// Returns: Error::AlreadyExists("new")
```

**Handling:**
```rust
match api.create_note("projects") {
    Ok(note) => {
        println!("Created note: {}", note.path);
    }
    Err(Error::AlreadyExists(path)) => {
        eprintln!("Note '{}' already exists", path);
        // Option 1: Use existing note
        let note = api.get_note(&path)?;
        println!("Using existing note");
        
        // Option 2: Generate unique name
        let unique_path = format!("{}-{}", path, uuid::Uuid::new_v4());
        api.create_note(&unique_path)?;
    }
    Err(e) => eprintln!("Error: {:?}", e),
}
```

**Safe creation pattern:**
```rust
fn ensure_note_exists(api: &mut NotesApi, path: &str) -> Result<Note> {
    if api.note_exists(path)? {
        api.get_note(path)
    } else {
        api.create_note(path)
    }
}
```

### `Error::ParentNotFound(String)`

Parent note doesn't exist (notes must be created top-down).

**Common causes:**
- Trying to create a child note before creating the parent
- Parent path is misspelled
- Parent was deleted

**Example scenarios:**
```rust
// Creating child without parent
let result = api.create_note("projects/rust-app");
// Returns: Error::ParentNotFound("projects")

// Creating deeply nested note without intermediate parents
let result = api.create_note("a/b/c/d");
// Returns: Error::ParentNotFound("a")
```

**Handling:**
```rust
match api.create_note("projects/rust-app") {
    Ok(note) => println!("Created: {}", note.path),
    Err(Error::ParentNotFound(parent)) => {
        eprintln!("Parent '{}' doesn't exist", parent);
        eprintln!("Creating parent first...");
        api.create_note(&parent)?;
        api.create_note("projects/rust-app")?;
        println!("Created note and parent");
    }
    Err(e) => eprintln!("Error: {:?}", e),
}
```

**Recursive creation helper:**
```rust
fn create_note_with_parents(api: &mut NotesApi, path: &str) -> Result<Note> {
    match api.create_note(path) {
        Ok(note) => Ok(note),
        Err(Error::ParentNotFound(parent)) => {
            // Recursively create parent
            create_note_with_parents(api, &parent)?;
            // Now create the original note
            api.create_note(path)
        }
        Err(e) => Err(e),
    }
}
```

## Error Conversion

The `Error` type implements `From` for automatic conversion:

```rust
// std::io::Error automatically converts
impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Error::Io(err)
    }
}

// rusqlite::Error automatically converts
impl From<rusqlite::Error> for Error {
    fn from(err: rusqlite::Error) -> Self {
        Error::Database(err)
    }
}
```

This enables the `?` operator:

```rust
fn read_file(path: &str) -> Result<String> {
    // io::Error automatically converts to Error::Io
    let content = std::fs::read_to_string(path)?;
    Ok(content)
}
```

## Best Practices

### 1. Always Handle Errors

Don't use `.unwrap()` or `.expect()` in production code:

```rust
// ❌ Bad: Will panic on error
let note = api.get_note("my-note").unwrap();

// ✅ Good: Handle errors gracefully
let note = match api.get_note("my-note") {
    Ok(note) => note,
    Err(e) => {
        eprintln!("Failed to get note: {:?}", e);
        return;
    }
};
```

### 2. Provide Context

Add context to errors when propagating:

```rust
fn load_config(api: &mut NotesApi) -> Result<Config> {
    let note = api.get_note("config").map_err(|e| {
        eprintln!("Failed to load config note: {:?}", e);
        e
    })?;
    
    parse_config(&note.content)
}
```

### 3. Use Specific Error Handling

Match specific error variants when appropriate:

```rust
match api.create_note("note") {
    Ok(note) => handle_success(note),
    Err(Error::AlreadyExists(_)) => handle_existing_note(),
    Err(Error::ParentNotFound(_)) => create_parent_then_retry(),
    Err(e) => handle_unexpected_error(e),
}
```

### 4. Implement Retry Logic

For transient errors (database locks, network issues):

```rust
fn save_with_retry(api: &mut NotesApi, path: &str, content: &str) -> Result<()> {
    const MAX_RETRIES: u32 = 3;
    
    for attempt in 0..MAX_RETRIES {
        match api.save_note(path, content) {
            Ok(_) => return Ok(()),
            Err(Error::Database(e)) if e.to_string().contains("locked") => {
                if attempt < MAX_RETRIES - 1 {
                    eprintln!("Database locked, retrying... (attempt {})", attempt + 1);
                    std::thread::sleep(std::time::Duration::from_millis(100));
                } else {
                    return Err(Error::Database(e));
                }
            }
            Err(e) => return Err(e),
        }
    }
    
    unreachable!()
}
```

### 5. Sync After External Changes

If you suspect filesystem and database are out of sync:

```rust
// After external filesystem modification
if let Err(Error::NotFound(_)) = api.get_note("note") {
    eprintln!("Note not found in database, resyncing...");
    api.rescan()?;
    
    // Try again after rescan
    let note = api.get_note("note")?;
}
```

### 6. Validate Before Operations

Prevent errors by validating first:

```rust
// Check parent exists before creating child
fn create_child_safely(api: &mut NotesApi, parent: &str, child: &str) -> Result<Note> {
    if !api.note_exists(parent)? {
        api.create_note(parent)?;
    }
    
    let child_path = format!("{}/{}", parent, child);
    api.create_note(&child_path)
}
```

## Common Error Scenarios

### Scenario 1: Import Notes from External Source

```rust
fn import_notes(api: &mut NotesApi, import_dir: &Path) -> Result<usize> {
    let mut imported = 0;
    
    for entry in std::fs::read_dir(import_dir)? {
        let entry = entry?;
        let content = std::fs::read_to_string(entry.path())?;
        let name = entry.file_name().to_string_lossy().to_string();
        
        match api.create_note(&name) {
            Ok(_) => {
                api.save_note(&name, &content)?;
                imported += 1;
            }
            Err(Error::AlreadyExists(_)) => {
                eprintln!("Skipping '{}' (already exists)", name);
            }
            Err(e) => {
                eprintln!("Failed to import '{}': {:?}", name, e);
                // Continue with other notes
            }
        }
    }
    
    Ok(imported)
}
```

### Scenario 2: Batch Operations with Error Collection

```rust
fn delete_multiple(api: &mut NotesApi, paths: &[&str]) -> (usize, Vec<(String, Error)>) {
    let mut deleted = 0;
    let mut errors = Vec::new();
    
    for path in paths {
        match api.delete_note(path) {
            Ok(_) => deleted += 1,
            Err(e) => errors.push((path.to_string(), e)),
        }
    }
    
    (deleted, errors)
}

// Usage
let (count, errors) = delete_multiple(&mut api, &["note1", "note2", "note3"]);
println!("Deleted {} notes", count);
if !errors.is_empty() {
    eprintln!("Errors:");
    for (path, error) in errors {
        eprintln!("  {}: {:?}", path, error);
    }
}
```

### Scenario 3: Safe Rename with Conflict Resolution

```rust
fn rename_with_conflict_resolution(
    api: &mut NotesApi,
    old_path: &str,
    new_path: &str
) -> Result<String> {
    match api.rename_note(old_path, new_path) {
        Ok(_) => Ok(new_path.to_string()),
        Err(Error::AlreadyExists(_)) => {
            // Generate unique name
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let unique_path = format!("{}-{}", new_path, timestamp);
            
            api.rename_note(old_path, &unique_path)?;
            Ok(unique_path)
        }
        Err(e) => Err(e),
    }
}
```

## Debugging Tips

### Enable Database Logging

```rust
// Set RUST_LOG=rusqlite=debug to see SQL queries
env_logger::init();
```

### Check Database Integrity

```rust
fn check_database_health(api: &NotesApi) -> Result<()> {
    let conn = &api.db; // If exposed publicly
    
    // Run SQLite integrity check
    let result: String = conn.pragma_query_value(None, "integrity_check", |row| {
        row.get(0)
    })?;
    
    if result == "ok" {
        println!("Database integrity: OK");
        Ok(())
    } else {
        eprintln!("Database integrity issues: {}", result);
        Err(Error::DatabaseCorrupted)
    }
}
```

### Verify Filesystem Sync

```rust
fn verify_sync(api: &NotesApi) -> Result<Vec<String>> {
    let mut out_of_sync = Vec::new();
    
    // Get all database paths
    let db_paths: Vec<String> = /* query database */;
    
    for path in db_paths {
        // Check if file exists on filesystem
        let fs_path = api.notes_root().join(&path).join("_index.md");
        if !fs_path.exists() {
            out_of_sync.push(path);
        }
    }
    
    Ok(out_of_sync)
}
```
