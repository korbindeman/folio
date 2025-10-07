import { useEffect, useRef, useState } from "react";
import { useNotesContext } from "../context/notes";
import { useNotes } from "../hooks/useNotes";
import { NoteMetadata } from "../types";
import { getPathTitle } from "../utils/paths";

function Breadcrumb({ item: note }: { item: NoteMetadata }) {
  const { getChildren, createNote } = useNotes();
  const { setActiveNotePath } = useNotesContext();

  const [children, setChildren] = useState<NoteMetadata[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getChildren(note.path).then(setChildren);
  }, [getChildren, refreshKey]);

  return (
    <>
      <button
        className="rounded hover:bg-black/10 px-2"
        onClick={() => setActiveNotePath(note.path)}
      >
        {getPathTitle(note.path)}
      </button>
      {children.length > 0 ? (
        <CrumbButton
          content={children}
          path={note.path}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        >
          {">"}
        </CrumbButton>
      ) : (
        <button
          className="rounded hover:bg-black/10 px-2"
          onClick={() => {
            createNote(`${note.path}/untitled`);
            setActiveNotePath(`${note.path}/untitled`);
          }}
        >
          +
        </button>
      )}
    </>
  );
}

function CrumbButton({
  content,
  children,
  path,
  onRefresh,
}: {
  content: NoteMetadata[];
  children: React.ReactNode;
  path: string;
  onRefresh?: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { setActiveNotePath } = useNotesContext();
  const { createNote, archiveNote } = useNotes();

  const handleClick = () => {
    if (dialogRef.current && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      dialogRef.current.style.top = `${rect.top}px`;
      dialogRef.current.style.left = `${rect.left}px`;
      dialogRef.current.showModal();
    }
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="rounded hover:bg-black/10 px-2"
        onClick={handleClick}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="backdrop:bg-transparent bg-paper border outline-none rounded-lg translate-x-8 min-w-[100px] *:border-b *:last:border-0 text-text-muted"
        onClick={handleDialogClick}
      >
        {content.map((note) => (
          <div className="relative group">
            <button
              key={note.id}
              onClick={() => {
                setActiveNotePath(note.path);
                dialogRef.current?.close();
              }}
              className="hover:bg-button-bg px-2 w-full text-left select-none outline-none py-2"
            >
              {getPathTitle(note.path)}
            </button>
            <div className="absolute right-2 z-50 h-full group-hover:inline-flex hidden items-center">
              <button
                className="text-red-500 hover:text-red-700 p-0.5"
                onClick={() => {
                  archiveNote(note.path).then(() => onRefresh?.());
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            createNote(`${path ? path + "/" : ""}untitled`);
            setActiveNotePath(`${path ? path + "/" : ""}untitled`);
            dialogRef.current?.close();
          }}
          className="px-2 w-full text-left select-none outline-none py-2 bg-button-bg"
        >
          Create new note +
        </button>
      </dialog>
    </>
  );
}
const RootCrumb = () => {
  const { getRootNotes } = useNotes();
  const [rootNotes, setRootNotes] = useState<NoteMetadata[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchRootNotes = async () => {
      const rootNotes = await getRootNotes();
      setRootNotes(rootNotes);
    };
    fetchRootNotes();
  }, [getRootNotes, refreshKey]);

  return (
    <CrumbButton
      content={rootNotes}
      path=""
      onRefresh={() => setRefreshKey((k) => k + 1)}
    >
      {">"}
    </CrumbButton>
  );
};

export default function Breadcrumbs() {
  const { activeNotePath } = useNotesContext();
  const { getAncestors } = useNotes();

  const [items, setItems] = useState<NoteMetadata[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const ancestors = await getAncestors(activeNotePath!);
      setItems(ancestors);
    };
    fetchItems();
  }, [activeNotePath, getAncestors]);

  return (
    <nav className="font-mono flex mb-2 text-sm">
      <RootCrumb />
      {items.map((item, index) => (
        <Breadcrumb key={index} item={item} />
      ))}
    </nav>
  );
}
