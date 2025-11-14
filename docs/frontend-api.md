# Zinnia Notes API

⚠️ This document is AI-generated

SolidJS bindings for the Zinnia notes system via Tauri.

## Setup

Wrap your app with the `NotesProvider`:

```tsx
import { NotesProvider } from "./api";

function App() {
  return (
    <NotesProvider>
      <YourApp />
    </NotesProvider>
  );
}
```

## Types

```tsx
interface Note {
  id: number;
  path: string;
  content: string;
  modified: number; // Unix timestamp
}

interface NoteMetadata {
  id: number;
  path: string;
  modified: number; // Unix timestamp
  archived: boolean;
}
```

## Using the Context API

The `useNotes()` hook provides access to all notes functionality:

```tsx
import { useNotes } from "./api";

function NoteEditor() {
  const notes = useNotes();

  // Access current note (reactive)
  const note = notes.currentNote;

  // Navigate to a note
  notes.setCurrentPath("projects/my-project");

  // Save changes
  const handleSave = async () => {
    await notes.saveNote(notes.currentPath(), content);
  };

  return (
    <Show when={!note.loading} fallback={<div>Loading...</div>}>
      <div>{note()?.content}</div>
    </Show>
  );
}
```

## Available Context Properties

### State

- `currentNote: Resource<Note | undefined>` - Currently loaded note
- `currentPath: Accessor<string>` - Current note path
- `setCurrentPath: (path: string) => void` - Navigate to a note
- `children: Resource<NoteMetadata[]>` - Children of current note
- `ancestors: Resource<NoteMetadata[]>` - Breadcrumb trail to current note
- `rootNotes: Resource<NoteMetadata[]>` - Top-level notes

### Navigation

- `canGoBack: Accessor<boolean>` - Check if back is available
- `canGoForward: Accessor<boolean>` - Check if forward is available
- `goBack: () => void` - Navigate back in history
- `goForward: () => void` - Navigate forward in history

### Search

- `searchQuery: Accessor<string>` - Current search query
- `setSearchQuery: (query: string) => void` - Set search query
- `searchResults: Resource<NoteMetadata[]>` - Search results

### Mutations

- `createNote: (path: string) => Promise<Note>`
- `saveNote: (path: string, content: string) => Promise<void>`
- `deleteNote: (path: string) => Promise<void>`
- `renameNote: (oldPath: string, newPath: string) => Promise<void>`
- `archiveNote: (path: string) => Promise<void>`
- `unarchiveNote: (path: string) => Promise<void>`

### Refetch Helpers

- `refetchCurrent: () => void` - Reload current note
- `refetchChildren: () => void` - Reload children list
- `refetchAncestors: () => void` - Reload ancestors/breadcrumbs
- `refetchRootNotes: () => void` - Reload root notes

## Using Standalone Hooks

For more granular control, use individual hooks:

```tsx
import {
  useNote,
  useNoteContent,
  useAutoSave,
  useChildren,
  useSearch,
} from "./api";

function MyComponent() {
  // Fetch a specific note
  const note = useNote(() => "projects/rust-app");

  // Load and track note content with error handling
  const { content, setContent, isLoading, error } = useNoteContent(
    () => "some/path",
  );

  // Autosave with debounce
  const { isSaving, hasUnsavedChanges, forceSave, scheduleAutoSave } =
    useAutoSave({
      getPath: () => "some/path",
      getContent: () => content(),
      delay: 1000,
    });

  // Search
  const [query, setQuery] = createSignal("");
  const results = useSearch(query);

  return (
    <Show when={!note.loading}>
      <h1>{note()?.path}</h1>
      <div>{note()?.content}</div>
    </Show>
  );
}
```

## Utility Hooks

### `useNote(path: () => string): Resource<Note | undefined>`

Fetches a specific note by path.

### `useNoteContent(path: Accessor<string | null>): NoteContent`

Loads and tracks note content with automatic error handling.

Returns:
```tsx
{
  content: Accessor<string>;
  setContent: Setter<string>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | null>;
}
```

### `useAutoSave(options): AutoSaveResult`

Handles debounced autosaving.

Options:
```tsx
{
  getPath: Accessor<string | null>;
  getContent: Accessor<string>;
  delay?: number; // default 1000ms
}
```

Returns:
```tsx
{
  isSaving: Accessor<boolean>;
  hasUnsavedChanges: () => boolean;
  forceSave: () => Promise<void>;
  scheduleAutoSave: (content: string) => void;
  setLastSavedContent: Setter<string>;
}
```

### `useSaveShortcut(onSave: () => void)`

Listens for Cmd/Ctrl+S and calls the provided callback.

### `useUnsavedChangesWarning(hasUnsavedChanges: Accessor<boolean>, onSave: () => Promise<void>)`

Prompts to save before closing the window if there are unsaved changes.

### `useChildren(path: () => string): Resource<NoteMetadata[] | undefined>`

Fetches child notes of the given path.

### `useAncestors(path: () => string): Resource<NoteMetadata[] | undefined>`

Fetches ancestor notes (breadcrumb trail).

### `useRootNotes(): Resource<NoteMetadata[] | undefined>`

Fetches all root-level notes.

### `useSearch(query: () => string | null): Resource<NoteMetadata[] | undefined>`

Searches notes by query. Returns empty when query is null.

## Direct Command Usage

For one-off operations, use commands directly:

```tsx
import { commands } from "./api";

// Available commands:
await commands.createNote(path: string): Promise<Note>
await commands.getNote(path: string): Promise<Note>
await commands.saveNote(path: string, content: string): Promise<void>
await commands.deleteNote(path: string): Promise<void>
await commands.renameNote(oldPath: string, newPath: string): Promise<void>
await commands.getChildren(path: string): Promise<NoteMetadata[]>
await commands.hasChildren(path: string): Promise<boolean>
await commands.getAncestors(path: string): Promise<NoteMetadata[]>
await commands.getRootNotes(): Promise<NoteMetadata[]>
await commands.searchNotes(query: string): Promise<NoteMetadata[]>
await commands.archiveNote(path: string): Promise<void>
await commands.unarchiveNote(path: string): Promise<void>
```

## Example: Complete Note Editor

```tsx
import { useNotes } from "./api";
import { createSignal, createEffect, Show, For } from "solid-js";

function NoteApp() {
  const notes = useNotes();
  const [content, setContent] = createSignal("");

  // Sync content with current note
  createEffect(() => {
    const note = notes.currentNote();
    if (note) setContent(note.content);
  });

  const handleSave = async () => {
    await notes.saveNote(notes.currentPath(), content());
  };

  const handleCreateChild = async () => {
    const childPath = `${notes.currentPath()}/new-note`;
    await notes.createNote(childPath);
    notes.setCurrentPath(childPath);
  };

  return (
    <div>
      {/* Back/forward buttons */}
      <button onClick={() => notes.goBack()} disabled={!notes.canGoBack()}>
        ← Back
      </button>
      <button
        onClick={() => notes.goForward()}
        disabled={!notes.canGoForward()}
      >
        Forward →
      </button>

      {/* Breadcrumbs */}
      <nav>
        <For each={notes.ancestors()}>
          {(ancestor) => (
            <button onClick={() => notes.setCurrentPath(ancestor.path)}>
              {ancestor.path || "Home"}
            </button>
          )}
        </For>
      </nav>

      {/* Editor */}
      <Show when={!notes.currentNote.loading}>
        <textarea
          value={content()}
          onInput={(e) => setContent(e.currentTarget.value)}
        />
        <button onClick={handleSave}>Save</button>
      </Show>

      {/* Children sidebar */}
      <aside>
        <button onClick={handleCreateChild}>New Child Note</button>
        <For each={notes.children()}>
          {(child) => (
            <div onClick={() => notes.setCurrentPath(child.path)}>
              {child.path}
            </div>
          )}
        </For>
      </aside>

      {/* Search */}
      <div>
        <input
          type="search"
          value={notes.searchQuery()}
          onInput={(e) => notes.setSearchQuery(e.currentTarget.value)}
          placeholder="Search notes..."
        />
        <Show when={notes.searchQuery()}>
          <For each={notes.searchResults()}>
            {(result) => (
              <div onClick={() => notes.setCurrentPath(result.path)}>
                {result.path}
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
```

## File Watcher Events

The API automatically listens for file system changes from the Tauri backend and updates the UI accordingly:

- **`notes:changed`** - Fired when note content is modified externally (uses content hash comparison to avoid triggering on saves with identical content)
- **`notes:renamed`** - Fired when a note is renamed or moved
- **`notes:frecency`** - Fired when frecency scores are updated, triggers refresh of children and root notes to reflect new sort order

These events are handled automatically by the `NotesProvider` - no manual setup required.

## Architecture

- **commands.ts** - Raw Tauri command bindings to the backend
- **NotesProvider.tsx** - Context provider with navigation history and reactive state
- **hooks.ts** - Utility hooks for content loading, autosaving, and keyboard shortcuts
- **index.ts** - Barrel exports

All data fetching uses SolidJS `createResource` for automatic reactivity and loading states. File changes are automatically detected through Tauri's file watcher and synced to the UI.
