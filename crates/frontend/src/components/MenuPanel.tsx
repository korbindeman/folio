import { For } from "solid-js";
import { getPathTitle } from "../utils/paths";
import type { NoteMetadata } from "../types";
import type { MenuItem } from "./ContextMenu";

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
  contextMenuNotePath?: string;

  // Callbacks
  onHoverItem: (level: number, item: NoteMetadata) => void;
  onClickItem: (item: NoteMetadata) => void;
  onArchiveItem: (item: NoteMetadata) => void;
  onCreateChild: (parentPath: string) => void;
  onContextMenu: (e: MouseEvent, note: NoteMetadata, items: MenuItem[]) => void;
  createContextMenuItems: (note: NoteMetadata) => MenuItem[];

  // Ref callbacks for positioning
  setPanelRef: (level: number, el: HTMLDivElement | undefined) => void;
  setRowRef: (path: string, el: HTMLButtonElement | undefined) => void;
}

export function MenuPanel(props: MenuPanelProps) {
  return (
    <div
      ref={(el) => props.setPanelRef(props.level, el)}
      class="bg-paper text-text-muted absolute w-fit min-w-[140px] rounded-md border px-2.5 py-1 pr-4 outline-none"
      style={{
        left: `${props.left}px`,
        top: `${props.top}px`,
        "z-index": `${100 + props.level}`,
      }}
      data-level={props.level}
    >
      <For each={props.items}>
        {(note) => {
          return (
            <div
              class="group flex items-center"
              onMouseEnter={() => props.onHoverItem(props.level, note)}
              onContextMenu={(e) =>
                props.onContextMenu(e, note, props.createContextMenuItems(note))
              }
            >
              <button
                ref={(el) => props.setRowRef(note.path, el)}
                onClick={() => props.onClickItem(note)}
                class="px-2 py-1.5 pr-0 text-left whitespace-nowrap outline-none select-none hover:underline"
                classList={{
                  underline: props.contextMenuNotePath === note.path,
                }}
                title={getPathTitle(note.path)}
              >
                {truncateTitle(getPathTitle(note.path))}
              </button>
              <span class="relative ml-1 inline-flex w-2 items-center">
                {props.hasChildrenMap?.[note.path] && (
                  <span class="text-xs opacity-50 group-hover:hidden">›</span>
                )}
                <span
                  class="hover:text-red hidden -translate-x-0.5 cursor-pointer p-0.5 opacity-50 group-hover:inline-flex hover:opacity-80"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onArchiveItem(note);
                  }}
                >
                  ×
                </span>
              </span>
            </div>
          );
        }}
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
