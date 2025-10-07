# Navigation Component Migration Guide

This document explains the changes made to the Navigation component to work with the new path-based notes API.

## Overview

The Navigation component has been completely rewritten to work with the new `notes-core` API, which uses file paths instead of database IDs for note identification.

## Key Changes

### 1. From ID-Based to Path-Based

**Old Approach:**
- Notes identified by database IDs
- Navigation tracked by note ID chain
- Required complex parent/child relationship queries

**New Approach:**
- Notes identified by file paths (e.g., `"projects/rust-app"`)
- Navigation is derived from path segments
- Path hierarchy is implicit in the path string

### 2. New Hook Architecture

#### `useNavigation()` Hook
Manages the active note path and navigation state:

```tsx
const { activePath, navigateToPath } = useNavigation();
```

- `activePath`: Current note path (e.g., `"inbox/todo"`) or `null`
- `navigateToPath(path)`: Navigate to a specific path

#### `useNotes()` Hook
Provides access to all Tauri commands for note operations:

```tsx
const { 
  createNote, 
  getNote, 
  saveNote, 
  getChildren, 
  getRootNotes,
  archiveNote,
  renameNote 
} = useNotes();
```

### 3. Navigation Provider

The `NavigationProvider` must wrap your app:

```tsx
import { NavigationProvider } from "./hooks";

function App() {
  return (
    <NavigationProvider>
      {/* Your app */}
    </NavigationProvider>
  );
}
```

### 4. Path Helper Functions

Several helper functions are available for working with paths:

- `getPathSegments(path)` - Split path into array of segments
- `getParentPath(path)` - Get parent path or `null` for root
- `buildPath(segments)` - Join segments into a path string
- `getPathTitle(path)` - Get the last segment (display name)

Example:
```tsx
getPathSegments("inbox/todo/urgent") // ["inbox", "todo", "urgent"]
getParentPath("inbox/todo") // "inbox"
getPathTitle("inbox/todo") // "todo"
```

### 5. Component Architecture

The Navigation component now consists of:

1. **Navigation** (main component)
   - Manages state and API calls
   - Renders breadcrumb chain
   - Handles navigation logic

2. **Breadcrumb**
   - Individual path segment display
   - Inline editing for renaming
   - Dropdown toggle for children

3. **Dropdown**
   - Shows siblings at current level
   - Create new child notes
   - Archive notes

4. **RootDropdown**
   - Special dropdown for root-level notes

## Migration Steps

If you have existing code using the old Navigation component:

### Step 1: Install Dependencies
The Navigation component now requires:
- `@tauri-apps/api` for command invocations

### Step 2: Add NavigationProvider
Wrap your app with the provider:

```tsx
import { NavigationProvider } from "./hooks";
import Navigation from "./components/Navigation";

function App() {
  return (
    <NavigationProvider>
      <Navigation />
      {/* Your content */}
    </NavigationProvider>
  );
}
```

### Step 3: Update Your Components
Replace old hooks with new ones:

```tsx
// Old
const { activeNoteId } = useActiveNote();
const { getNote } = useNoteStore();

// New
const { activePath } = useNavigation();
const { getNote } = useNotes();
```

### Step 4: Update Note Loading
Change from ID-based to path-based loading:

```tsx
// Old
useEffect(() => {
  if (activeNoteId) {
    const note = getNote(activeNoteId);
    setContent(note.content);
  }
}, [activeNoteId]);

// New
useEffect(() => {
  if (activePath) {
    loadNote(activePath);
  }
}, [activePath]);

const loadNote = async (path: string) => {
  const note = await getNote(path);
  setContent(note.content);
};
```

## Features

### Breadcrumb Navigation
- Click any segment to navigate to that level
- Active segment is bold and editable
- Click active segment to start editing

### Dropdown Menus
- Click `>` to view siblings at that level
- Shows all notes at the same level in hierarchy
- Create new notes at any level

### Inline Editing
- Click active note name to edit
- Press Enter to save, Escape to cancel
- Automatically renames the note file

### Archive Support
- Hover over dropdown items to see archive button (×)
- Archives are moved to `_archive` subfolder
- Archived notes can be restored with `unarchiveNote()`

## Removed Features

The following features were removed because they're not yet implemented in the Rust backend:

- **Locking/Unlocking notes** - No encryption support in `notes-core` yet
- **Password protection** - Removed `PasswordPrompt` integration

If you need these features, you'll need to:
1. Implement encryption in `notes-core`
2. Add Tauri commands for lock/unlock
3. Re-add the lock button and `PasswordPrompt` integration

## Example Usage

See `src/components/ExampleApp.tsx` for a complete working example that demonstrates:

- Setting up NavigationProvider
- Using Navigation component
- Loading and editing notes based on activePath
- Saving note content
- Error handling

## API Reference

### NavigationProvider Props
No props required. Simply wrap your app.

### Navigation Component Props
No props required. Uses context from NavigationProvider.

### useNavigation() Return Value
```typescript
{
  activePath: string | null;
  setActivePath: (path: string | null) => void;
  navigateToPath: (path: string) => void;
}
```

### useNotes() Return Value
```typescript
{
  createNote: (path: string) => Promise<Note>;
  getNote: (path: string) => Promise<Note>;
  saveNote: (path: string, content: string) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  renameNote: (oldPath: string, newPath: string) => Promise<void>;
  getChildren: (path: string) => Promise<NoteMetadata[]>;
  getRootNotes: () => Promise<NoteMetadata[]>;
  searchNotes: (query: string) => Promise<NoteMetadata[]>;
  archiveNote: (path: string) => Promise<void>;
  unarchiveNote: (path: string) => Promise<void>;
}
```

## Troubleshooting

### "useNavigation must be used within a NavigationProvider"
Make sure your app is wrapped with `<NavigationProvider>`.

### Navigation doesn't show any notes
1. Check that the Tauri backend is running
2. Verify notes directory exists (`~/Documents/notes`)
3. Check browser console for API errors

### Can't create new notes
The component prompts for a note name. If you cancel the prompt, no note is created. Check that:
1. You're clicking the `+` button (visible when no children exist)
2. You're clicking "New note" in a dropdown menu
3. You're entering a valid note name (non-empty)

### Renaming doesn't work
1. Click the active (bold) note name to start editing
2. Make sure to press Enter to save (not just clicking away)
3. Check console for API errors

## Future Improvements

Potential enhancements for the Navigation component:

1. **Keyboard Navigation** - Arrow keys to move between notes
2. **Drag and Drop** - Reorder or move notes
3. **Search Integration** - Quick search from navigation bar
4. **Favorites/Bookmarks** - Star frequently accessed notes
5. **Recent Notes** - Track recently viewed notes
6. **Visual Indicators** - Show note types, sizes, or modification dates
7. **Breadcrumb Overflow** - Collapse long paths with ellipsis
8. **Touch Gestures** - Swipe navigation for mobile/tablet