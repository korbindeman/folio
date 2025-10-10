# Folio - SolidJS Frontend

A clean, idiomatic SolidJS frontend for the notes application.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run Tauri app
npm run tauri dev
```

## Architecture

### API Layer (`src/api/`)

- **commands.ts** - Raw Tauri command bindings
- **NotesProvider.tsx** - Context provider with reactive state
- **hooks.ts** - Standalone reactive hooks
- **index.ts** - Barrel exports

### Components (`src/components/`)

- **Breadcrumbs.tsx** - Navigation breadcrumb with dropdowns
- **Editor.tsx** - Markdown editor with auto-save

### Utils (`src/utils/`)

- **paths.ts** - Path manipulation utilities

## Key Features

- **Reactive by default** - Uses SolidJS signals and resources
- **Simplified from React** - Cleaner, more idiomatic SolidJS patterns
- **Context API** - Single `useNotes()` hook for all functionality
- **Auto-save** - Cmd/Ctrl+S to save notes
- **Breadcrumb navigation** - Create, rename, and archive notes inline

## Usage

```tsx
import { useNotes } from "./api";

function MyComponent() {
  const notes = useNotes();
  
  // Access reactive data
  const note = notes.currentNote;
  const children = notes.children;
  
  // Navigate
  notes.setCurrentPath("my-note");
  
  // Mutations
  await notes.createNote("new-note");
  await notes.saveNote(path, content);
}
```

## Differences from React Version

1. **Simplified state management** - Uses SolidJS resources instead of manual useState/useEffect
2. **No separate context file** - Context is built into NotesProvider
3. **Cleaner component structure** - Less boilerplate, more reactive primitives
4. **Better TypeScript** - Fully typed with inference
