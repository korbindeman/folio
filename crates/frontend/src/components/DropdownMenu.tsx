import { createSignal, For, JSX } from "solid-js";
import { useNotes } from "../api";
import { commands } from "../api/commands";
import { InputModal } from "./InputModal";
import { MenuPanel } from "./MenuPanel";
import type { NoteMetadata } from "../types";

interface PanelState {
  parentPath: string;
  items: NoteMetadata[];
  left: number;
  top: number;
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
  const [openPanels, setOpenPanels] = createSignal<PanelState[]>([]);
  const [childrenCache, setChildrenCache] = createSignal(
    new Map<string, NoteMetadata[]>(),
  );
  const [hasChildrenMap, setHasChildrenMap] = createSignal<
    Record<string, boolean>
  >({});

  // Track refs for positioning
  const panelRefs = new Map<number, HTMLDivElement>();
  const rowRefs = new Map<string, HTMLButtonElement>();

  const setPanelRef = (level: number, el: HTMLDivElement | undefined) => {
    if (el) {
      panelRefs.set(level, el);
    } else {
      panelRefs.delete(level);
    }
  };

  const setRowRef = (path: string, el: HTMLButtonElement | undefined) => {
    if (el) {
      rowRefs.set(path, el);
    } else {
      rowRefs.delete(path);
    }
  };

  const handleClick = () => {
    if (dialogRef && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      dialogRef.style.top = `${rect.top}px`;
      dialogRef.style.left = `${rect.left}px`;
      dialogRef.showModal();

      // Initialize root panel
      setOpenPanels([
        {
          parentPath: props.path,
          items: props.content,
          left: 0,
          top: 0,
        },
      ]);

      // Preload hasChildren for root items
      loadHasChildrenForItems(props.content);
    }
  };

  const handleDialogClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      dialogRef?.close();
      setOpenPanels([]);
    }
  };

  const loadHasChildrenForItems = async (items: NoteMetadata[]) => {
    const map = { ...hasChildrenMap() };
    await Promise.all(
      items.map(async (item) => {
        try {
          const hasChildren = await commands.hasChildren(item.path);
          map[item.path] = hasChildren;
        } catch (err) {
          console.error("Failed to check children:", err);
          map[item.path] = false;
        }
      }),
    );
    setHasChildrenMap(map);
  };

  const ensureChildrenLoaded = async (parentPath: string) => {
    const cache = childrenCache();
    if (!cache.has(parentPath)) {
      try {
        const items = await commands.getChildren(parentPath);
        cache.set(parentPath, items);
        setChildrenCache(new Map(cache));
        // Preload hasChildren for these items
        loadHasChildrenForItems(items);
      } catch (err) {
        console.error("Failed to load children:", err);
      }
    }
  };

  const computeSubmenuPosition = (
    parentLevel: number,
    itemPath: string,
  ): { left: number; top: number } => {
    if (!dialogRef) return { left: 0, top: 0 };

    const dialogRect = dialogRef.getBoundingClientRect();
    const parentPanelEl = panelRefs.get(parentLevel);
    const rowEl = rowRefs.get(itemPath);

    if (!parentPanelEl || !rowEl) return { left: 0, top: 0 };

    const panelRect = parentPanelEl.getBoundingClientRect();
    const rowRect = rowEl.getBoundingClientRect();

    // Measure paddings to align titles precisely
    const parentRowStyles = getComputedStyle(rowEl);
    const parentRowPaddingTop = parseFloat(parentRowStyles.paddingTop) || 0;

    const panelStyles = getComputedStyle(parentPanelEl);
    const panelPaddingTop = parseFloat(panelStyles.paddingTop) || 0;

    // Child rows share the same class/padding as parent rows
    const childRowPaddingTop = parentRowPaddingTop;

    // Overlap by 1px to avoid double-width border seam
    const left = Math.round(
      panelRect.left + panelRect.width - dialogRect.left - 1,
    );

    // Align the first child title with the hovered parent title
    const top = Math.round(
      rowRect.top +
        parentRowPaddingTop -
        (dialogRect.top + panelPaddingTop + childRowPaddingTop) -
        1,
    );

    return { left, top };
  };

  const handleHoverItem = async (level: number, note: NoteMetadata) => {
    // Check if note has children
    const hasChildren = hasChildrenMap()[note.path];

    if (!hasChildren) {
      // Trim deeper panels
      setOpenPanels((panels) => panels.slice(0, level + 1));
      return;
    }

    // Load children if needed
    await ensureChildrenLoaded(note.path);

    const cache = childrenCache();
    const items = cache.get(note.path);

    if (!items || items.length === 0) {
      // No children after all, trim panels
      setOpenPanels((panels) => panels.slice(0, level + 1));
      return;
    }

    // Compute position for submenu
    const pos = computeSubmenuPosition(level, note.path);

    // Add/replace submenu panel
    setOpenPanels((panels) => {
      const next = panels.slice(0, level + 1);
      next.push({
        parentPath: note.path,
        items,
        left: pos.left,
        top: pos.top,
      });
      return next;
    });
  };

  const handleClickItem = (item: NoteMetadata) => {
    notes.setCurrentPath(item.path);
    dialogRef?.close();
    setOpenPanels([]);
  };

  const handleArchiveItem = async (item: NoteMetadata) => {
    try {
      await commands.archiveNote(item.path);
      if (notes.currentPath() === item.path) {
        const segments = item.path.split("/");
        segments.pop();
        notes.setCurrentPath(segments.join("/"));
      }

      // Invalidate cache for parent
      const parentPath = item.path.split("/").slice(0, -1).join("/");
      const cache = childrenCache();
      cache.delete(parentPath);
      setChildrenCache(new Map(cache));

      // Clear hasChildren for this item
      const map = { ...hasChildrenMap() };
      delete map[item.path];
      setHasChildrenMap(map);

      props.onRefresh?.();

      // Close dialog and reset
      dialogRef?.close();
      setOpenPanels([]);
    } catch (err) {
      console.error("Failed to archive:", err);
      alert(`Failed to archive: ${err}`);
    }
  };

  const handleCreateChild = async () => {
    setShowModal(true);
    dialogRef?.close();
    setOpenPanels([]);
  };

  const createNewNote = async (title: string) => {
    const newPath = props.path ? `${props.path}/${title}` : title;
    try {
      const newNote = await commands.createNote(newPath);
      setShowModal(false);

      // Invalidate cache
      const cache = childrenCache();
      cache.delete(props.path);
      setChildrenCache(new Map(cache));

      notes.setCurrentPath(newNote.path);
      props.onRefresh?.();
    } catch (err) {
      console.error("Failed to create note:", err);
      alert(`Failed to create note: ${err}`);
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
        class="relative overflow-visible border-none bg-transparent p-0 outline-none backdrop:bg-transparent"
        onClick={handleDialogClick}
      >
        <For each={openPanels()}>
          {(panel, index) => (
            <MenuPanel
              parentPath={panel.parentPath}
              items={panel.items}
              left={panel.left}
              top={panel.top}
              level={index()}
              hasChildrenMap={hasChildrenMap()}
              onHoverItem={handleHoverItem}
              onClickItem={handleClickItem}
              onArchiveItem={handleArchiveItem}
              onCreateChild={handleCreateChild}
              setPanelRef={setPanelRef}
              setRowRef={setRowRef}
            />
          )}
        </For>
      </dialog>
    </>
  );
}
