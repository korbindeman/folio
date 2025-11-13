import { createSignal, For, JSX } from "solid-js";
import { useNotes } from "../api";
import { commands } from "../api/commands";
import { getPathTitle } from "../utils/paths";
import { InputModal } from "./InputModal";
import type { NoteMetadata } from "../types";

const MAX_TITLE_LENGTH = 18;

function truncateTitle(
  title: string,
  maxLength: number = MAX_TITLE_LENGTH,
): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength).trimEnd() + "…";
}

interface DropdownMenuProps {
  content: NoteMetadata[];
  path: string;
  onRefresh?: () => void;
  children: JSX.Element;
}

export function DropdownMenu(props: DropdownMenuProps) {
  let buttonRef: HTMLButtonElement | undefined;
  let dialogRef: HTMLDialogElement | undefined;

  const notes = useNotes();
  const [showModal, setShowModal] = createSignal(false);

  // Sort notes by modification time (most recent first)
  const sortedContent = () => {
    return [...props.content].sort((a, b) => b.modified - a.modified);
  };

  const handleClick = () => {
    if (dialogRef && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      dialogRef.style.top = `${rect.top}px`;
      dialogRef.style.left = `${rect.left}px`;
      dialogRef.showModal();
    }
  };

  const handleDialogClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      dialogRef?.close();
    }
  };

  const createNewNote = async (title: string) => {
    const newPath = props.path ? `${props.path}/${title}` : title;
    try {
      const newNote = await commands.createNote(newPath);
      dialogRef?.close();
      setShowModal(false);
      notes.setCurrentPath(newNote.path);
      props.onRefresh?.();
    } catch (err) {
      console.error("Failed to create note:", err);
      alert(`Failed to create note: ${err}`);
    }
  };

  const handleArchive = async (notePath: string) => {
    try {
      await commands.archiveNote(notePath);
      if (notes.currentPath() === notePath) {
        const segments = notePath.split("/");
        segments.pop();
        notes.setCurrentPath(segments.join("/"));
      }
      props.onRefresh?.();
    } catch (err) {
      console.error("Failed to archive:", err);
      alert(`Failed to archive: ${err}`);
    }
  };

  return (
    <>
      <InputModal
        showModal={showModal()}
        onSubmit={createNewNote}
        placeholder="untitled"
        onClose={() => setShowModal(false)}
      />
      <button
        ref={buttonRef}
        class="hover:bg-button-hover rounded px-2 font-mono"
        onClick={handleClick}
      >
        {props.children}
      </button>
      <dialog
        ref={dialogRef}
        class="bg-paper text-text-muted max-w-[200px] min-w-[140px] translate-x-8 rounded-md border px-2.5 py-1 outline-none backdrop:bg-transparent"
        onClick={handleDialogClick}
      >
        <For each={sortedContent()}>
          {(note) => (
            <div class="group flex items-center">
              <button
                onClick={() => {
                  notes.setCurrentPath(note.path);
                  dialogRef?.close();
                }}
                class="px-2 py-1.5 pr-1 text-left outline-none select-none hover:underline"
                title={getPathTitle(note.path)}
              >
                {truncateTitle(getPathTitle(note.path))}
              </button>
              <div class="z-50 hidden h-full items-center group-hover:inline-flex">
                <button
                  class="hover:text-red p-0.5 hover:opacity-80"
                  onClick={() => handleArchive(note.path)}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </For>
        <button
          onClick={() => {
            setShowModal(true);
            dialogRef?.close();
          }}
          class="w-full px-2 py-2 text-left opacity-60 outline-none select-none hover:underline"
        >
          New +
        </button>
      </dialog>
    </>
  );
}
