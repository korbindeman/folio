import { For } from "solid-js";
import { getPathTitle } from "../utils/paths";
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

interface MenuPanelProps {
  parentPath: string;
  items: NoteMetadata[];
  left: number;
  top: number;
  level: number;
  hasChildrenMap?: Record<string, boolean>;

  // Callbacks
  onHoverItem: (level: number, item: NoteMetadata) => void;
  onClickItem: (item: NoteMetadata) => void;
  onArchiveItem: (item: NoteMetadata) => void;
  onCreateChild: (parentPath: string) => void;

  // Ref callbacks for positioning
  setPanelRef: (level: number, el: HTMLDivElement | undefined) => void;
  setRowRef: (path: string, el: HTMLButtonElement | undefined) => void;
}

export function MenuPanel(props: MenuPanelProps) {
  // Sort notes by modification time (most recent first)
  const sortedContent = () => {
    return [...props.items].sort((a, b) => b.modified - a.modified);
  };

  return (
    <div
      ref={(el) => props.setPanelRef(props.level, el)}
      class="bg-paper text-text-muted absolute max-w-[200px] min-w-[160px] rounded-md border px-2.5 py-1 outline-none"
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        "z-index": `${100 + props.level}`,
      }}
      data-level={props.level}
    >
      <For each={sortedContent()}>
        {(note) => (
          <div
            class="group flex items-center"
            onMouseEnter={() => props.onHoverItem(props.level, note)}
          >
            <button
              ref={(el) => props.setRowRef(note.path, el)}
              onClick={() => props.onClickItem(note)}
              class="px-2 py-1.5 pr-0 text-left outline-none select-none hover:underline"
              title={getPathTitle(note.path)}
            >
              {truncateTitle(getPathTitle(note.path))}
            </button>
            <span class="relative ml-1 inline-flex items-center">
              {props.hasChildrenMap?.[note.path] && (
                <span class="text-xs opacity-50 group-hover:hidden">›</span>
              )}
              <span
                class="hover:text-red hidden cursor-pointer p-0.5 group-hover:inline-flex hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onArchiveItem(note);
                }}
              >
                ×
              </span>
            </span>
          </div>
        )}
      </For>
      <button
        onClick={() => props.onCreateChild(props.parentPath)}
        class="w-full px-2 py-2 text-left opacity-60 outline-none select-none hover:underline"
      >
        New +
      </button>
    </div>
  );
}
