import { createSignal, createEffect, Show } from "solid-js";
import { useNotes } from "../api";

export function Editor() {
  const notes = useNotes();
  const [content, setContent] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);

  // Sync content with current note
  createEffect(() => {
    const note = notes.currentNote();
    if (note) {
      setContent(note.content);
    } else {
      setContent("");
    }
  });

  const handleSave = async () => {
    const path = notes.currentPath();
    if (!path) return;

    setIsSaving(true);
    try {
      await notes.saveNote(path, content());
    } catch (err) {
      console.error("Failed to save:", err);
      alert(`Failed to save: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save on Cmd+S / Ctrl+S
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div class="flex-1 flex flex-col">
      <Show
        when={notes.currentPath()}
        fallback={
          <div class="flex items-center justify-center flex-1 text-gray-500">
            No note selected
          </div>
        }
      >
        <Show
          when={!notes.currentNote.loading}
          fallback={<div class="text-gray-500">Loading...</div>}
        >
          <textarea
            value={content()}
            onInput={(e) => setContent(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            class="flex-1 w-full font-mono text-sm resize-none outline-none p-4"
            placeholder="Write your note here..."
            disabled={isSaving()}
          />
          <div class="flex items-center justify-between p-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving()}
              class="px-4 py-2 bg-black text-white rounded disabled:opacity-50 hover:bg-gray-800"
            >
              {isSaving() ? "Saving..." : "Save"}
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
}
