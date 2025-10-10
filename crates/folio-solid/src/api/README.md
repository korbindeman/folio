# Notes API for SolidJS

Idiomatic SolidJS bindings for the Rust notes API via Tauri.

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
- `currentNote: Resource<Note>` - Currently loaded note
- `currentPath: Accessor<string>` - Current note path
- `setCurrentPath: (path: string) => void` - Navigate to a note
- `children: Resource<NoteMetadata[]>` - Children of current note
- `ancestors: Resource<NoteMetadata[]>` - Breadcrumb trail to current note
- `rootNotes: Resource<NoteMetadata[]>` - Top-level notes

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
- `refetchCurrent()` - Reload current note
- `refetchChildren()` - Reload children list
- `refetchAncestors()` - Reload ancestors/breadcrumbs
- `refetchRootNotes()` - Reload root notes

## Using Standalone Hooks

For more granular control, use individual hooks:

```tsx
import { useNote, useChildren, useSearch } from "./api";

function MyComponent() {
  // Fetch a specific note
  const note = useNote(() => "projects/rust-app");

  // Fetch children
  const children = useChildren(() => "projects");

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

## Direct Command Usage

For one-off operations, use commands directly:

```tsx
import { commands } from "./api";

async function quickSave(path: string, content: string) {
  await commands.saveNote(path, content);
}
```

## Example: Complete Note Editor

```tsx
import { useNotes } from "./api";
import { createSignal, Show, For } from "solid-js";

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

## Architecture

- **commands.ts** - Raw Tauri command bindings
- **NotesProvider.tsx** - Context provider with reactive state
- **hooks.ts** - Standalone reactive hooks
- **index.ts** - Barrel exports

All data fetching uses SolidJS `createResource` for automatic reactivity and loading states.
