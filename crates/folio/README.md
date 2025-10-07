# Folio - Tauri Notes Frontend

A Tauri frontend for the notes-core library with hierarchical navigation.

## Features

- **Hierarchical Navigation** - Breadcrumb-style navigation with dropdown menus
- Create, read, update, and delete notes
- Rename notes with inline editing
- Search notes using full-text search
- Archive/unarchive notes
- Navigate note hierarchies with keyboard and mouse

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Architecture

### Backend (Rust)
- Uses `notes-core` library for all note operations
- Exposes Tauri commands for frontend invocation
- State managed with `Mutex<NotesApi>`

### Frontend (React + TypeScript)
- Minimal UI for testing note operations
- Invokes Rust backend via Tauri commands
- Types match the notes-core API

## Using the Navigation Component

The Navigation component provides a breadcrumb-style interface for browsing and managing notes.

### Setup

Wrap your app with `NavigationProvider`:

```tsx
import { NavigationProvider } from "./hooks";
import Navigation from "./components/Navigation";

function App() {
  return (
    <NavigationProvider>
      <Navigation />
      {/* Your app content */}
    </NavigationProvider>
  );
}
```

### Hooks

#### `useNavigation()`
Access the current navigation state:
```tsx
const { activePath, navigateToPath } = useNavigation();
```

#### `useNotes()`
Interact with the notes API:
```tsx
const { getNote, saveNote, createNote, getChildren, getRootNotes } = useNotes();
```

### Features

- **Breadcrumb Navigation**: Click on any path segment to navigate
- **Dropdown Menus**: Click `>` to view siblings at each level
- **Inline Editing**: Click on the active note name to rename it
- **Create Notes**: Use `+` button when no children exist
- **Archive Notes**: Hover over notes in dropdowns to see archive button (×)

See `src/components/ExampleApp.tsx` for a complete usage example.

## Tauri Commands

- `create_note(path)` - Create a new note
- `get_note(path)` - Get a note by path
- `save_note(path, content)` - Save note content
- `delete_note(path)` - Delete a note
- `rename_note(old_path, new_path)` - Rename a note
- `get_children(path)` - Get child notes
- `get_root_notes()` - Get all root-level notes
- `search_notes(query)` - Full-text search
- `archive_note(path)` - Archive a note
- `unarchive_note(path)` - Unarchive a note

## Path Structure

Notes are identified by paths like `"projects/rust-app"` or `"inbox/todo"`:
- Empty path `""` represents the root
- Paths use forward slashes as separators
- Each path segment becomes a breadcrumb in the navigation
- Child notes are created by adding segments to parent paths

## Notes Directory

Notes are stored at `~/Documents/notes` by default.
