// SolidJS Context Provider for Notes API
import {
  createContext,
  useContext,
  createSignal,
  createResource,
  createMemo,
  onCleanup,
  type ParentProps,
  type Resource,
  type Accessor,
} from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { commands } from "./commands";
import type { Note, NoteMetadata } from "../types";

interface NotesContextValue {
  // Current note state
  currentNote: Resource<Note | undefined>;
  currentPath: Accessor<string>;
  setCurrentPath: (path: string) => void;

  // Navigation
  children: Resource<NoteMetadata[]>;
  ancestors: Resource<NoteMetadata[]>;
  rootNotes: Resource<NoteMetadata[]>;

  // Search
  searchQuery: Accessor<string>;
  setSearchQuery: (query: string) => void;
  searchResults: Resource<NoteMetadata[]>;

  // Mutations
  createNote: (path: string) => Promise<Note>;
  saveNote: (path: string, content: string) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  renameNote: (oldPath: string, newPath: string) => Promise<void>;
  archiveNote: (path: string) => Promise<void>;
  unarchiveNote: (path: string) => Promise<void>;

  // Refresh helpers
  refetchCurrent: () => void;
  refetchChildren: () => void;
  refetchAncestors: () => void;
  refetchRootNotes: () => void;
}

const NotesContext = createContext<NotesContextValue>();

export function NotesProvider(props: ParentProps) {
  // Current note path
  const [currentPath, setCurrentPath] = createSignal("");

  // Search state
  const [searchQuery, setSearchQuery] = createSignal("");

  // Resources for data fetching
  const [currentNote, { refetch: refetchCurrent }] = createResource(
    currentPath,
    commands.getNote,
  );

  const [children, { refetch: refetchChildren }] = createResource(
    currentPath,
    commands.getChildren,
  );

  const [ancestors, { refetch: refetchAncestors }] = createResource(
    currentPath,
    commands.getAncestors,
  );

  const [rootNotes, { refetch: refetchRootNotes }] = createResource(
    commands.getRootNotes,
  );

  const [searchResults] = createResource(
    // Only fetch when query is not empty
    createMemo(() => {
      const query = searchQuery();
      return query.trim() ? query : null;
    }),
    (query) => commands.searchNotes(query),
  );

  // Mutation functions with automatic refetching
  const createNote = async (path: string) => {
    const note = await commands.createNote(path);
    refetchRootNotes();
    refetchChildren();
    return note;
  };

  const saveNote = async (path: string, content: string) => {
    await commands.saveNote(path, content);
    if (path === currentPath()) {
      refetchCurrent();
    }
  };

  const deleteNote = async (path: string) => {
    await commands.deleteNote(path);
    if (path === currentPath()) {
      setCurrentPath("");
    }
    refetchChildren();
    refetchRootNotes();
  };

  const renameNote = async (oldPath: string, newPath: string) => {
    await commands.renameNote(oldPath, newPath);
    if (currentPath() === oldPath) {
      setCurrentPath(newPath);
    }
    refetchChildren();
    refetchAncestors();
  };

  const archiveNote = async (path: string) => {
    await commands.archiveNote(path);
    refetchChildren();
    refetchCurrent();
  };

  const unarchiveNote = async (path: string) => {
    await commands.unarchiveNote(path);
    refetchChildren();
    refetchCurrent();
  };

  // Listen for filesystem watcher events from Tauri backend
  const setupWatcherListeners = async () => {
    // Listen for note changes (create, update, delete) and renames/moves
    const unlistenChanged = await listen("notes:changed", () => {
      console.log("File watcher detected changes, reloading current note...");
      // Force reload by toggling the path
      const path = currentPath();
      if (path) {
        setCurrentPath("");
        // Use setTimeout to ensure the effect runs twice
        setTimeout(() => setCurrentPath(path), 0);
      }
    });

    const unlistenRenamed = await listen("notes:renamed", () => {
      console.log(
        "File watcher detected rename/move, reloading current note...",
      );
      // Force reload by toggling the path
      const path = currentPath();
      if (path) {
        setCurrentPath("");
        setTimeout(() => setCurrentPath(path), 0);
      }
    });

    // Cleanup listeners when component unmounts
    onCleanup(() => {
      unlistenChanged();
      unlistenRenamed();
    });
  };

  // Setup listeners on mount
  setupWatcherListeners();

  const value: NotesContextValue = {
    currentNote,
    currentPath,
    setCurrentPath,
    children,
    ancestors,
    rootNotes,
    searchQuery,
    setSearchQuery,
    searchResults,
    createNote,
    saveNote,
    deleteNote,
    renameNote,
    archiveNote,
    unarchiveNote,
    refetchCurrent,
    refetchChildren,
    refetchAncestors,
    refetchRootNotes,
  };

  return (
    <NotesContext.Provider value={value}>
      {props.children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
