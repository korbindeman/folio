# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Folio is a hierarchical note-taking application built with:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri (Rust) desktop application
- **Editor**: TipTap rich text editor
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + custom hooks (with some Zustand store remnants)
- **File System**: Tauri's file system API for local note storage

## Development Commands

```bash
# Development server
npm run dev

# Build application
npm run build

# Preview build
npm run preview

# Lint and format code
npm run check

# Tauri commands
npm run tauri dev    # Run Tauri development mode
npm run tauri build  # Build Tauri application
```

## Architecture

### Core Data Flow
1. **Notes Storage**: JSON files stored in `~/Documents/folio/` directory via Tauri's file system API
2. **State Management**: React Context (`ActiveNoteContext`) manages current note and navigation
3. **Data Layer**: Custom hooks (`useNotes`, `useNote`, `useNoteHierarchy`) handle CRUD operations
4. **File Operations**: `src/lib/notes.ts` provides low-level file system operations

### Key Components

**App.tsx** - Main application shell with ActiveNoteProvider context
**Navigation.tsx** - Breadcrumb navigation with hierarchical note structure and dropdown menus
**Editor.tsx** - TipTap-based rich text editor with auto-save functionality
**ActiveNoteContext.tsx** - Context provider for active note state and navigation history

### Data Structure

Notes are stored as JSON files with this structure:
```typescript
interface Note {
  id: string;           // UUID
  title: string;        
  content: JSONContent; // TipTap's JSON format
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null; // For hierarchical structure
}
```

### Key Patterns

1. **Hierarchical Navigation**: Notes can have parent-child relationships creating a tree structure
2. **Auto-save**: Editor auto-saves content changes with 1-second debounce
3. **Context-based State**: Active note and navigation state managed via React Context
4. **Hook Composition**: Multiple custom hooks (`useNotes`, `useNote`, `useNoteHierarchy`) compose functionality

## File Structure

- `src/components/` - React components
- `src/contexts/` - React context providers
- `src/hooks/` - Custom React hooks for data management
- `src/lib/` - Core utilities and file system operations
- `src/types/` - TypeScript type definitions
- `src/stores/` - Zustand store (appears to be deprecated in favor of Context)
- `src-tauri/` - Tauri backend configuration and Rust code

## Code Style

- Uses Biome for linting and formatting
- Tab indentation
- Double quotes for strings
- Tailwind CSS for styling
- Functional components with hooks
- TypeScript strict mode

## Testing

No test framework is currently configured. Tests should be added using a framework like Vitest or Jest.

## Notes

- The application is currently in development (🚧 Work in progress)
- Navigation controls and keyboard shortcuts were recently removed/refactored
- Some legacy Zustand store code exists but is not actively used
- The app uses a hardcoded initial note ID that should be made configurable