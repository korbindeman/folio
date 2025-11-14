import { createSignal, Show, For, JSX, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

export type MenuItem =
  | {
      label: string;
      onClick: () => void;
      disabled?: boolean;
      separator?: false;
    }
  | {
      separator: true;
    };

interface ContextMenuContentProps {
  items: MenuItem[];
  onItemClick: (item: Extract<MenuItem, { label: string }>) => void;
}

export function ContextMenuContent(props: ContextMenuContentProps) {
  return (
    <For each={props.items}>
      {(item) => (
        <Show
          when={!("separator" in item && item.separator)}
          fallback={<div class="border-text-muted my-1 border-t opacity-20" />}
        >
          {(() => {
            if ("separator" in item && item.separator) return null;
            return (
              <div class="px-1">
                <button
                  onClick={() => props.onItemClick(item)}
                  disabled={item.disabled}
                  class="hover:bg-button-hover w-full rounded px-1 py-0.5 text-left text-xs outline-none select-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {item.label}
                </button>
              </div>
            );
          })()}
        </Show>
      )}
    </For>
  );
}

interface ContextMenuContainerProps {
  x: number;
  y: number;
  items: MenuItem[];
  onItemClick: (item: Extract<MenuItem, { label: string }>) => void;
}

export function ContextMenuContainer(props: ContextMenuContainerProps) {
  return (
    <div
      class="text-text-muted fixed min-w-[140px] rounded-md py-1 shadow-lg"
      style={{
        left: `${props.x}px`,
        top: `${props.y}px`,
        "z-index": "9999",
        "background-color": "var(--color-context-menu-bg)",
        border: "1px solid var(--color-context-menu-border)",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ContextMenuContent items={props.items} onItemClick={props.onItemClick} />
    </div>
  );
}

interface ContextMenuProps {
  children: JSX.Element;
  items: () => MenuItem[];
}

export function ContextMenu(props: ContextMenuProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  let menuRef: HTMLDivElement | undefined;

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Get menu items to check if we should show anything
    const menuItems = props.items();
    if (menuItems.length === 0) return;

    // Position menu at cursor
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);

    // Close on any click
    const handleClose = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        setIsOpen(false);
        document.removeEventListener("mousedown", handleClose);
      }
    };

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        document.removeEventListener("keydown", handleEscape);
      }
    };

    // Delay adding listener so this click doesn't immediately close it
    setTimeout(() => {
      document.addEventListener("mousedown", handleClose);
      document.addEventListener("keydown", handleEscape);
    }, 0);
  };

  const handleItemClick = (item: Extract<MenuItem, { label: string }>) => {
    if (item.disabled) return;
    item.onClick();
    setIsOpen(false);
  };

  // Cleanup listeners on unmount
  onCleanup(() => {
    setIsOpen(false);
  });

  // Adjust position if menu would go off-screen
  const getAdjustedPosition = () => {
    const pos = position();
    if (!menuRef) return pos;

    const rect = menuRef.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = pos.x;
    let y = pos.y;

    // Adjust horizontal position if off-screen
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }

    // Adjust vertical position if off-screen
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }

    return { x, y };
  };

  return (
    <>
      <div onContextMenu={handleContextMenu} class="contents">
        {props.children}
      </div>

      <Show when={isOpen()}>
        <Portal>
          <div ref={menuRef}>
            <ContextMenuContainer
              x={getAdjustedPosition().x}
              y={getAdjustedPosition().y}
              items={props.items()}
              onItemClick={handleItemClick}
            />
          </div>
        </Portal>
      </Show>
    </>
  );
}
