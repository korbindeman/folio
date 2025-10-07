import { useState, useEffect } from "react";
import Navigation from "./components/Navigation";
import { NavigationProvider, useNavigation } from "./hooks";
import { useNotes } from "./hooks/useNotes";
import type { Note } from "./types";
import "./App.css";

function NoteEditor() {
  const { activePath } = useNavigation();
  const { getNote, saveNote } = useNotes();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load note when activePath changes
  useEffect(() => {
    if (activePath) {
      loadNote(activePath);
    } else {
      setNote(null);
      setContent("");
    }
  }, [activePath]);

  const loadNote = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const loadedNote = await getNote(path);
      setNote(loadedNote);
      setContent(loadedNote.content);
    } catch (err) {
      setError(`Failed to load note: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activePath) return;

    setLoading(true);
    setError(null);
    try {
      await saveNote(activePath, content);
      // Reload to get updated metadata
      await loadNote(activePath);
    } catch (err) {
      setError(`Failed to save note: ${err}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && <div className="text-gray-500 mb-4">Loading...</div>}

      {activePath && note ? (
        <div className="flex flex-col gap-4 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full font-mono text-sm resize-none outline-none"
            placeholder="Write your note here (Markdown supported)..."
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-background border-border border rounded disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 text-gray-500">
          {activePath
            ? "Select a note from the navigation or create a new one"
            : "No note selected. Use the navigation above to browse or create notes."}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <NavigationProvider>
      <div className="h-screen flex flex-col">
        <Navigation />
        <NoteEditor />
      </div>
    </NavigationProvider>
  );
}

export default App;
