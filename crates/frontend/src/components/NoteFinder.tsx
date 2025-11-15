import { createSignal, Show, onMount, createEffect, For } from "solid-js";
import { commands } from "../api/commands";
import type { NoteMetadata } from "../types";

export function NoteFinder(props: {
  showModal: boolean;
  onSelect: (note: NoteMetadata) => void;
  onClose?: () => void;
  placeholder?: string;
  excludePath?: string | null;
}) {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<NoteMetadata[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  let resultsContainerRef: HTMLDivElement | undefined;

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    props.onClose?.();
  };

  createEffect(() => {
    if (props.showModal && inputRef) {
      setTimeout(() => inputRef?.focus(), 0);
    }
  });

  // Fuzzy search as user types, or show top 6 notes if empty
  createEffect(async () => {
    // Only run search when modal is shown
    if (!props.showModal) return;

    const searchQuery = query();

    setIsLoading(true);
    try {
      const searchResults = await commands.fuzzySearchNotes(searchQuery, 6);
      // Filter out the excluded note if provided
      const filtered = props.excludePath
        ? searchResults.filter((note) => note.path !== props.excludePath)
        : searchResults;
      setResults(filtered);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  });

  // Scroll selected item into view
  createEffect(() => {
    const index = selectedIndex();
    const container = resultsContainerRef;
    if (container) {
      const selectedElement = container.children[index] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.showModal) return;

    const resultCount = results().length;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (resultCount > 0) {
          setSelectedIndex((prev) => (prev + 1) % resultCount);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (resultCount > 0) {
          setSelectedIndex((prev) => (prev - 1 + resultCount) % resultCount);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (resultCount > 0) {
          const selected = results()[selectedIndex()];
          if (selected) {
            props.onSelect(selected);
            handleClose();
          }
        }
        break;
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleResultClick = (note: NoteMetadata) => {
    props.onSelect(note);
    handleClose();
  };

  return (
    <Show when={props.showModal}>
      <div
        class="bg-opacity-50 fixed inset-0 z-50 flex items-start justify-center bg-black pt-28"
        onClick={handleBackdropClick}
      >
        <div
          class="bg-paper text-text-muted w-[400px] rounded-md border outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="border-b px-2.5 py-1 pr-4">
            <input
              ref={inputRef}
              type="text"
              class="w-full bg-transparent px-2 py-1.5 outline-none"
              placeholder={props.placeholder || "Search notes..."}
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autofocus
            />
          </div>
          <div
            ref={resultsContainerRef}
            class="max-h-[400px] overflow-y-auto px-2.5 py-1 pr-1"
            onMouseLeave={() => setSelectedIndex(0)}
          >
            <Show when={isLoading()}>
              <div class="px-2 py-1.5 text-sm opacity-60">
                {query().trim() ? "Searching..." : "Loading notes..."}
              </div>
            </Show>
            <Show when={!isLoading() && results().length === 0}>
              <div class="px-2 py-1.5 text-sm opacity-60">
                {query().trim() ? "No results found" : "No notes available"}
              </div>
            </Show>
            <For each={results()}>
              {(note, index) => {
                const path = note.path || "(root)";
                const lastSlashIndex = path.lastIndexOf("/");
                const hasParent = lastSlashIndex !== -1;
                const parentPath = hasParent
                  ? path.substring(0, lastSlashIndex + 1)
                  : "";
                const noteName = hasParent
                  ? path.substring(lastSlashIndex + 1)
                  : path;

                return (
                  <button
                    class="w-full px-2 py-1.5 text-left whitespace-nowrap outline-none select-none hover:underline"
                    classList={{
                      underline: index() === selectedIndex(),
                    }}
                    onClick={() => handleResultClick(note)}
                    onMouseEnter={() => setSelectedIndex(index())}
                  >
                    {hasParent && <span class="opacity-50">{parentPath}</span>}
                    {noteName}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
