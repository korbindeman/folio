import { useEffect, useRef, useState } from "react";
import {
  useNavigation,
  getPathSegments,
  getParentPath,
  buildPath,
  getPathTitle,
} from "../hooks/useNavigation";
import { useNotes } from "../hooks/useNotes";
import { NoteMetadata } from "../types";

function Dropdown({
  notes,
  onSelect,
  onClose,
  onCreateNew,
  onArchive,
  toggleButtonRef,
}: {
  notes: NoteMetadata[];
  onSelect: (path: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
  onArchive: (path: string) => void;
  toggleButtonRef?: React.RefObject<HTMLButtonElement>;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInDropdown = dropdownRef.current?.contains(target);
      const isClickOnToggleButton = toggleButtonRef?.current?.contains(target);

      if (!isClickInDropdown && !isClickOnToggleButton) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, toggleButtonRef]);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-1 bg-background backdrop
-blur-lg border rounded-md shadow-lg z-10 min-w-48 max-h-64 overflow-y-auto"
    >
      {notes.length === 0 ? (
        <div className="px-3 py-2 text-sm">No other notes</div>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className="flex items-center group hover:bg-background transition-colors"
          >
            <button
              type="button"
              className="flex-1 text-left px-3 py-2 text-sm"
              onClick={() => onSelect(note.path)}
            >
              {getPathTitle(note.path)}
            </button>
            <button
              type="button"
              className="px-2 py-2 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(note.path);
              }}
              title="Archive note"
            >
              ×
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        className="w-full text-left px-3 py-2 text-sm hover:bg-background transition-colors border-t font-medium"
        onClick={onCreateNew}
      >
        + New note
      </button>
    </div>
  );
}

function Breadcrumb({
  path,
  text,
  active,
  index,
  onDropdownToggle,
  isDropdownOpen,
  dropdownNotes,
  onCreateChild,
  onArchive,
  isEditing,
  editingTitle,
  onEditingTitleChange,
  onStartEditing,
  onSaveTitle,
  onTitleKeyDown,
}: {
  path: string;
  text: string;
  active?: boolean;
  index: number;
  onDropdownToggle: (index: number) => void;
  isDropdownOpen: boolean;
  dropdownNotes: NoteMetadata[];
  onCreateChild: (parentPath: string) => void;
  onArchive: (notePath: string) => void;
  isEditing: boolean;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onStartEditing: (path: string, title: string) => void;
  onSaveTitle: () => void;
  onTitleKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const { navigateToPath } = useNavigation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const arrowButtonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    navigateToPath(path);
  };

  const handleArrowClick = () => {
    if (dropdownNotes.length > 0) {
      onDropdownToggle(index);
    } else if (active) {
      // Create new child for active note with no children
      onCreateChild(path);
    }
  };

  return (
    <div className="relative">
      <div className="rounded">
        {isEditing ? (
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onKeyDown={onTitleKeyDown}
            onBlur={onSaveTitle}
            className={`bg-transparent border-none outline-none font-mono text-sm px-1 py-0.5 rounded transition hover:bg-[#00000009] ${
              active && "font-bold hover:bg-transparent w-fit"
            }`}
            onFocus={(e) => {
              if (editingTitle.toLowerCase() === "untitled") {
                e.target.select();
              }
            }}
            autoFocus
          />
        ) : (
          <button
            ref={buttonRef}
            type="button"
            className={`rounded px-1 py-0.5 transition hover:bg-[#00000009] ${
              active && "font-bold"
            } ${active ? "cursor-text" : ""}`}
            onClick={!active ? handleClick : () => onStartEditing(path, text)}
            onDoubleClick={
              !active ? () => onStartEditing(path, text) : undefined
            }
          >
            {text}
          </button>
        )}
        {!isEditing && (
          <button
            ref={arrowButtonRef}
            type="button"
            className="rounded px-1.5 py-0.5 transition hover:bg-[#00000009]"
            onClick={handleArrowClick}
            disabled={dropdownNotes.length === 0 && !active}
          >
            {dropdownNotes.length === 0 && active ? "+" : ">"}
          </button>
        )}
      </div>
      {isDropdownOpen && (
        <Dropdown
          notes={dropdownNotes}
          onSelect={(selectedPath) => {
            navigateToPath(selectedPath);
            onDropdownToggle(-2); // Close dropdown
          }}
          onClose={() => onDropdownToggle(-2)}
          onCreateNew={() => {
            onCreateChild(path);
            onDropdownToggle(-2); // Close dropdown
          }}
          onArchive={onArchive}
          toggleButtonRef={arrowButtonRef}
        />
      )}
    </div>
  );
}

function RootDropdown({
  isOpen,
  onToggle,
  notes,
  onSelect,
  onClose,
  onCreateNew,
  onArchive,
}: {
  isOpen: boolean;
  onToggle: () => void;
  notes: NoteMetadata[];
  onSelect: (path: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
  onArchive: (path: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="rounded px-1 py-0.5 transition hover:bg-[#00000009]"
        onClick={onToggle}
      >
        &gt;
      </button>
      {isOpen && (
        <Dropdown
          notes={notes}
          onSelect={onSelect}
          onClose={onClose}
          onCreateNew={onCreateNew}
          onArchive={onArchive}
          toggleButtonRef={buttonRef}
        />
      )}
    </div>
  );
}

function Navigation() {
  const { activePath, navigateToPath } = useNavigation();
  const { getRootNotes, getChildren, createNote, renameNote, archiveNote } =
    useNotes();

  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(
    null,
  );
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [rootNotes, setRootNotes] = useState<NoteMetadata[]>([]);
  const [childrenCache, setChildrenCache] = useState<
    Map<string, NoteMetadata[]>
  >(new Map());

  // Load root notes on mount
  useEffect(() => {
    loadRootNotes();
  }, []);

  // Preload children for current path segments
  useEffect(() => {
    if (activePath) {
      const segments = getPathSegments(activePath);
      for (let i = 0; i < segments.length; i++) {
        const segmentPath = buildPath(segments.slice(0, i + 1));
        loadChildren(segmentPath);
      }
    }
  }, [activePath]);

  const loadRootNotes = async () => {
    try {
      const notes = await getRootNotes();
      setRootNotes(notes);
    } catch (err) {
      console.error("Failed to load root notes:", err);
    }
  };

  const loadChildren = async (path: string) => {
    try {
      const children = await getChildren(path);
      setChildrenCache((prev) => new Map(prev).set(path, children));
    } catch (err) {
      console.error(`Failed to load children for ${path}:`, err);
    }
  };

  const handleDropdownToggle = (index: number) => {
    if (index === -2) {
      setOpenDropdownIndex(null);
    } else {
      setOpenDropdownIndex((prev) => (prev === index ? null : index));
    }
  };

  const handleRootDropdownToggle = () => {
    setOpenDropdownIndex((prev) => (prev === -1 ? null : -1));
  };

  const handleCreateChild = async (parentPath: string) => {
    try {
      // Prompt for note name
      const noteName = prompt("Enter note name:");
      if (!noteName) return;

      const newPath = parentPath ? `${parentPath}/${noteName}` : noteName;
      await createNote(newPath);
      navigateToPath(newPath);

      // Reload children cache
      if (parentPath) {
        await loadChildren(parentPath);
      } else {
        await loadRootNotes();
      }
    } catch (err) {
      console.error("Failed to create note:", err);
      alert(`Failed to create note: ${err}`);
    }
  };

  const getChildNotesForDropdown = (index: number): NoteMetadata[] => {
    if (index === -1) {
      return rootNotes;
    }

    if (!activePath) return [];
    const segments = getPathSegments(activePath);
    if (index >= segments.length) return [];

    const segmentPath = buildPath(segments.slice(0, index + 1));
    return childrenCache.get(segmentPath) || [];
  };

  const startEditingTitle = (path: string, currentTitle: string) => {
    setEditingPath(path);
    setEditingTitle(currentTitle);
  };

  const saveTitle = async () => {
    if (!editingPath) return;

    const finalTitle = editingTitle.trim() || "untitled";
    const oldPath = editingPath;
    const parentPath = getParentPath(oldPath);
    const newPath = parentPath ? `${parentPath}/${finalTitle}` : finalTitle;

    if (oldPath === newPath) {
      setEditingPath(null);
      setEditingTitle("");
      return;
    }

    try {
      await renameNote(oldPath, newPath);
      navigateToPath(newPath);

      // Reload children cache
      if (parentPath) {
        await loadChildren(parentPath);
      } else {
        await loadRootNotes();
      }

      setEditingPath(null);
      setEditingTitle("");
    } catch (err) {
      console.error("Failed to rename note:", err);
      alert(`Failed to rename note: ${err}`);
    }
  };

  const cancelEditing = () => {
    setEditingPath(null);
    setEditingTitle("");
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleArchive = async (path: string) => {
    try {
      await archiveNote(path);

      // If the archived note was the active note, navigate to parent
      if (path === activePath) {
        const parentPath = getParentPath(path);
        if (parentPath !== null) {
          navigateToPath(parentPath);
        } else {
          // Navigate to first root note
          const roots = await getRootNotes();
          if (roots.length > 0) {
            navigateToPath(roots[0].path);
          } else {
            navigateToPath("");
          }
        }
      }

      // Reload appropriate cache
      const parentPath = getParentPath(path);
      if (parentPath) {
        await loadChildren(parentPath);
      } else {
        await loadRootNotes();
      }
    } catch (err) {
      console.error("Failed to archive note:", err);
      alert(`Failed to archive note: ${err}`);
    }
  };

  // Build breadcrumb segments from active path
  const segments = activePath ? getPathSegments(activePath) : [];
  const breadcrumbPaths = segments.map((_, index) =>
    buildPath(segments.slice(0, index + 1)),
  );

  return (
    <nav className="px-2 pb-0.5 bg-background w-screen z-20 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center font-mono text-sm tracking-tight">
          {/* Root dropdown */}
          <RootDropdown
            isOpen={openDropdownIndex === -1}
            onToggle={handleRootDropdownToggle}
            notes={rootNotes}
            onSelect={(selectedPath) => {
              navigateToPath(selectedPath);
              handleDropdownToggle(-2);
            }}
            onClose={() => handleDropdownToggle(-2)}
            onCreateNew={() => {
              handleCreateChild("");
              handleDropdownToggle(-2);
            }}
            onArchive={handleArchive}
          />

          {/* Breadcrumb segments */}
          {segments.map((segment, index) => {
            const path = breadcrumbPaths[index];
            const isActive = index === segments.length - 1;

            return (
              <Breadcrumb
                key={path}
                path={path}
                text={segment}
                active={isActive}
                index={index}
                onDropdownToggle={handleDropdownToggle}
                isDropdownOpen={openDropdownIndex === index}
                dropdownNotes={getChildNotesForDropdown(index)}
                onCreateChild={handleCreateChild}
                onArchive={handleArchive}
                isEditing={editingPath === path}
                editingTitle={editingTitle}
                onEditingTitleChange={setEditingTitle}
                onStartEditing={startEditingTitle}
                onSaveTitle={saveTitle}
                onTitleKeyDown={handleTitleKeyDown}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
