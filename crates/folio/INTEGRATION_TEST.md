# Folio Integration Testing Guide

## Verify the Build

```bash
cd crates/folio
cargo build --manifest-path=src-tauri/Cargo.toml
```

Expected: ✅ Build completes successfully

## Manual Testing Steps

### 1. Start the App
```bash
npm run tauri dev
```

### 2. Create Your First Note
- Path: `test-note`
- Click "Create"
- Expected: Note appears with empty content
- Type some markdown: `# Hello World`
- Click "Save"
- Expected: No errors

### 3. Load an Existing Note
- Path: `test-note`
- Click "Load"
- Expected: Content appears: `# Hello World`

### 4. Test Hierarchical Notes
- Path: `inbox/todo`
- Click "Create"
- Expected: Error "ParentNotFound" (parent doesn't exist)
- Path: `inbox`
- Click "Create"
- Path: `inbox/todo`
- Click "Create"
- Expected: ✅ Success

### 5. Test Search
- Enter search query: `Hello`
- Click "Search"
- Expected: Shows `test-note` in results
- Click on result
- Expected: Path field updates to `test-note`

### 6. Verify Filesystem
```bash
ls -la ~/.my-notes/
```
Expected:
```
.notes.db           # SQLite database
test-note/
  _index.md         # Your note content
inbox/
  _index.md
  todo/
    _index.md
```

### 7. Test Database
```bash
sqlite3 ~/.my-notes/.notes.db "SELECT path FROM notes;"
```
Expected output:
```
test-note
inbox
inbox/todo
```

## All Available Commands

Test these via the UI or DevTools console:

```javascript
// In browser console
invoke('get_root_notes')
invoke('get_children', { path: 'inbox' })
invoke('search_notes', { query: 'hello' })
invoke('delete_note', { path: 'test-note' })
invoke('rename_note', { oldPath: 'inbox', newPath: 'archive' })
invoke('archive_note', { path: 'inbox/todo' })
```

## Success Criteria

- ✅ App starts without errors
- ✅ Can create notes
- ✅ Can save/load note content
- ✅ Search returns correct results
- ✅ Files created at ~/.my-notes
- ✅ Database properly indexes notes
- ✅ All 10 Tauri commands work
