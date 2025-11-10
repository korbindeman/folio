import { createSignal, For, Show, createEffect } from "solid-js";
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

function CrumbButton(props: {
  content: NoteMetadata[];
  path: string;
  onRefresh?: () => void;
  children: string;
}) {
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

function Breadcrumb(props: { item: NoteMetadata; isActive: boolean }) {
  const notes = useNotes();
  const [children, setChildren] = createSignal<NoteMetadata[]>([]);
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [isEditing, setIsEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");

  createEffect(() => {
    refreshKey(); // Track refresh key
    commands.getChildren(props.item.path).then(setChildren);
  });

  const handleCreateNote = async () => {
    const newPath = `${props.item.path}/untitled`;
    try {
      await commands.createNote(newPath);
      notes.setCurrentPath(newPath);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to create note:", err);
      alert(`Failed to create note: ${err}`);
    }
  };

  const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null);

  const handleClick = () => {
    if (props.isActive) {
      // Enter edit mode
      setEditTitle(getPathTitle(props.item.path));
      setIsEditing(true);
      inputRef()!.focus();
    } else {
      // Navigate
      notes.setCurrentPath(props.item.path);
    }
  };

  const handleRename = async () => {
    const newTitle = editTitle().trim() || "untitled";
    const currentTitle = getPathTitle(props.item.path);

    if (newTitle !== currentTitle) {
      const parentPath = props.item.path.split("/").slice(0, -1).join("/");
      const newPath = parentPath ? `${parentPath}/${newTitle}` : newTitle;

      try {
        await commands.renameNote(props.item.path, newPath);
        notes.setCurrentPath(newPath);
      } catch (err) {
        console.error("Failed to rename:", err);
        alert(`Failed to rename: ${err}`);
      }
    }
    setIsEditing(false);
  };

  return (
    <>
      <Show
        when={isEditing()}
        fallback={
          <button
            class={`hover:bg-button-hover rounded px-2 ${props.isActive ? "font-bold" : ""}`}
            onClick={handleClick}
          >
            {getPathTitle(props.item.path)}
          </button>
        }
      >
        <input
          type="text"
          value={editTitle()}
          onInput={(e) => setEditTitle(e.currentTarget.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setIsEditing(false);
          }}
          class="bg-transparent px-2 outline-none"
          ref={setInputRef}
        />
      </Show>
      <Show when={!isEditing()}>
        <Show
          when={children().length > 0}
          fallback={
            <button
              class="hover:bg-button-hover rounded px-2"
              onClick={handleCreateNote}
            >
              +
            </button>
          }
        >
          <CrumbButton
            content={children()}
            path={props.item.path}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          >
            {">"}
          </CrumbButton>
        </Show>
      </Show>
    </>
  );
}

function RootCrumb() {
  const [rootNotes, setRootNotes] = createSignal<NoteMetadata[]>([]);
  const [refreshKey, setRefreshKey] = createSignal(0);

  createEffect(() => {
    refreshKey(); // Track refresh key
    commands.getRootNotes().then(setRootNotes);
  });

  return (
    <CrumbButton
      content={rootNotes()}
      path=""
      onRefresh={() => setRefreshKey((k) => k + 1)}
    >
      {">"}
    </CrumbButton>
  );
}

export function Navigation() {
  const notes = useNotes();
  const [items, setItems] = createSignal<NoteMetadata[]>([]);

  createEffect(() => {
    const path = notes.currentPath();
    if (path) {
      commands.getAncestors(path).then(setItems);
    } else {
      setItems([]);
    }
  });

  return (
    <nav class="bg-background font-editor fixed top-0 left-0 z-10 flex h-8 w-full items-center px-4 pb-2 text-sm select-none">
      <div class="flex flex-1">
        <RootCrumb />
        <For each={items()}>
          {(item, index) => {
            const isActive = () => index() === items().length - 1;
            return <Breadcrumb item={item} isActive={isActive()} />;
          }}
        </For>
      </div>
      <div class="ml-4 flex gap-1">
        <button
          class="hover:bg-button-hover rounded px-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => notes.goBack()}
          disabled={!notes.canGoBack()}
          title="Go back"
        >
          ←
        </button>
        <button
          class="hover:bg-button-hover rounded px-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => notes.goForward()}
          disabled={!notes.canGoForward()}
          title="Go forward"
        >
          →
        </button>
      </div>
    </nav>
  );
}
