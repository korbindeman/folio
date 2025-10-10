import { createSignal, For, Show, createEffect, onMount } from "solid-js";
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
            autofocus
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
        <For each={props.content}>
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
                  class="text-red-500 hover:text-red-700 p-0.5"
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

function Breadcrumb(props: { item: NoteMetadata }) {
  const notes = useNotes();
  const [children, setChildren] = createSignal<NoteMetadata[]>([]);
  const [refreshKey, setRefreshKey] = createSignal(0);

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

  return (
    <>
      <button
        class="rounded hover:bg-black/10 px-2"
        onClick={() => notes.setCurrentPath(props.item.path)}
      >
        {getPathTitle(props.item.path)}
      </button>
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
    <nav class="font-mono flex mb-2 text-sm">
      <RootCrumb />
      <For each={items()}>{(item) => <Breadcrumb item={item} />}</For>
    </nav>
  );
}
