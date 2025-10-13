import { createSignal, For, Show, createEffect } from "solid-js";
import { useNotes } from "../api";
import { commands } from "../api/commands";
import { getPathTitle } from "../utils/paths";
import type { NoteMetadata } from "../types";

function Modal(props: {
  showModal: boolean;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = createSignal("");

  return (
    <Show when={props.showModal}>
      <dialog
        open
        class="fixed border rounded p-4 w-[400px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-button-bg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit(title());
          }}
        >
          <input
            type="text"
            class="grow outline-none bg-transparent"
            placeholder="untitled"
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
          />
        </form>
      </dialog>
    </Show>
  );
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
      <Modal showModal={showModal()} onSubmit={createNewNote} />
      <button
        ref={buttonRef}
        class="rounded hover:bg-black/10 px-2"
        onClick={handleClick}
      >
        {props.children}
      </button>
      <dialog
        ref={dialogRef}
        class="backdrop:bg-transparent bg-paper border outline-none rounded-lg translate-x-8 min-w-[100px] *:border-b *:last:border-0 text-text-muted"
        onClick={handleDialogClick}
      >
        <For each={sortedContent()}>
          {(note) => (
            <div class="relative group">
              <button
                onClick={() => {
                  notes.setCurrentPath(note.path);
                  dialogRef?.close();
                }}
                class="hover:bg-button-bg px-2 w-full text-left select-none outline-none py-2"
              >
                {getPathTitle(note.path)}
              </button>
              <div class="absolute right-2 z-50 h-full group-hover:inline-flex hidden items-center">
                <button
                  class="hover:text-red hover:opacity-80 p-0.5"
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
          class="px-2 w-full text-left select-none outline-none py-2 bg-button-bg"
        >
          Create new note +
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
            class={`rounded hover:bg-black/10 px-2 ${props.isActive ? "font-bold" : ""}`}
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
          class="px-2 outline-none bg-transparent "
          ref={setInputRef}
        />
      </Show>
      <Show when={!isEditing()}>
        <Show
          when={children().length > 0}
          fallback={
            <button
              class="rounded hover:bg-black/10 px-2"
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

export function Breadcrumbs() {
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
    <nav class="font-mono flex mb-2 text-sm items-center">
      <div class="flex flex-1">
        <RootCrumb />
        <For each={items()}>
          {(item, index) => {
            const isActive = () => index() === items().length - 1;
            return <Breadcrumb item={item} isActive={isActive()} />;
          }}
        </For>
      </div>
      <div class="flex gap-1 ml-4">
        <button
          class="rounded hover:bg-black/10 px-2 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => notes.goBack()}
          disabled={!notes.canGoBack()}
          title="Go back"
        >
          ←
        </button>
        <button
          class="rounded hover:bg-black/10 px-2 disabled:opacity-30 disabled:cursor-not-allowed"
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
