import { createContext, useContext, useState, ReactNode } from "react";
import { Note } from "../types";

interface NotesContextValue {
  notes: Note[];
  activeNotePath: string | null;
  setActiveNotePath: (path: string | null) => void;
  addNote: (note: Note) => void;
  updateNote: (path: string, updates: Partial<Note>) => void;
  unloadNote: (path: string) => void;
  // setNotes: (notes: Note[]) => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({
  children,
  initialNotePath,
}: {
  children: ReactNode;
  initialNotePath: string | null;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNotePath, setActiveNotePath] = useState<string | null>(
    initialNotePath,
  );

  const addNote = (note: Note) => {
    setNotes((prev) => [...prev, note]);
  };

  const updateNote = (path: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) => (note.path === path ? { ...note, ...updates } : note)),
    );
  };

  const unloadNote = (path: string) => {
    setNotes((prev) => prev.filter((note) => note.path !== path));
    if (activeNotePath === path) {
      setActiveNotePath(null);
    }
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNotePath,
        setActiveNotePath,
        addNote,
        updateNote,
        unloadNote,
        // setNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotesContext() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return context;
}
