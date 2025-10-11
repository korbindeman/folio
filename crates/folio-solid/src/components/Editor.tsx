import { createSignal, createEffect, Show, onCleanup, onMount } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNotes } from "../api";
import { commands } from "../api/commands";

const AUTOSAVE_DELAY = 1000;

export function Editor() {
  const notes = useNotes();
  const [content, setContent] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  let debounceTimer: number | undefined;
  let lastSavedContent = "";

  createEffect(async () => {
    const path = notes.currentPath();

    if (path) {
      setIsLoading(true);
      try {
        const note = await commands.getNote(path);
        setContent(note.content);
        lastSavedContent = note.content;
      } catch (err) {
        console.error("Failed to load note:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setContent("");
      lastSavedContent = "";
    }
  });

  const performSave = async (path: string, contentToSave: string) => {
    if (!path) return;
    setIsSaving(true);
    try {
      await commands.saveNote(path, contentToSave);
      lastSavedContent = contentToSave;
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const path = notes.currentPath();
    if (!path) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    await performSave(path, content());
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const path = notes.currentPath();
    if (path && newContent !== lastSavedContent) {
      debounceTimer = setTimeout(() => {
        performSave(path, newContent);
      }, AUTOSAVE_DELAY) as unknown as number;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const hasUnsavedChanges = () => content() !== lastSavedContent;

  onMount(async () => {
    const window = getCurrentWindow();
    const unlisten = await window.onCloseRequested(async (event) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        const path = notes.currentPath();
        if (path) {
          await performSave(path, content());
        }
        await window.close();
      }
    });
    return () => {
      unlisten();
    };
  });

  onCleanup(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const path = notes.currentPath();
    if (hasUnsavedChanges() && path) {
      performSave(path, content());
    }
  });

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
          when={!isLoading()}
          fallback={<div class="text-gray-500 p-4">Loading...</div>}
        >
          <textarea
            value={content()}
            onInput={(e) => handleContentChange(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            class="flex-1 w-full font-mono text-sm resize-none outline-none px-1"
            placeholder="Write your note here..."
            disabled={isSaving()}
          />
          <div class="px-4 pb-4">
            <div class="text-sm opacity-40">
              {isSaving()
                ? "Saving..."
                : hasUnsavedChanges()
                  ? "Unsaved changes"
                  : ""}
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
