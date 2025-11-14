import { createSignal, Show, onMount, createEffect, For } from "solid-js";
import { commands } from "../api/commands";
import type { NoteMetadata } from "../types";

export function NoteFinder(props: {
  showModal: boolean;
  onSelect: (note: NoteMetadata) => void;
  onClose?: () => void;
  placeholder?: string;
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

  // Fuzzy search as user types, or show all notes if empty
  createEffect(async () => {
    const searchQuery = query();

    setIsLoading(true);
    try {
      const searchResults = await commands.fuzzySearchNotes(searchQuery);
      setResults(searchResults);
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
        class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
        onClick={handleBackdropClick}
      >
        <div
          class="bg-button-bg w-[600px] rounded border"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="border-b p-4">
            <input
              ref={inputRef}
              type="text"
              class="text-text w-full bg-transparent outline-none"
              placeholder={props.placeholder || "Search notes..."}
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autofocus
            />
          </div>
          <div ref={resultsContainerRef} class="max-h-[400px] overflow-y-auto">
            <Show when={isLoading()}>
              <div class="text-text-muted p-4 text-sm">
                {query().trim() ? "Searching..." : "Loading notes..."}
              </div>
            </Show>
            <Show when={!isLoading() && results().length === 0}>
              <div class="text-text-muted p-4 text-sm">
                {query().trim() ? "No results found" : "No notes available"}
              </div>
            </Show>
            <For each={results()}>
              {(note, index) => (
                <div
                  class={`text-text cursor-pointer border-b p-3 transition-colors ${
                    index() === selectedIndex() ? "bg-hover" : "hover:bg-hover"
                  }`}
                  onClick={() => handleResultClick(note)}
                  onMouseEnter={() => setSelectedIndex(index())}
                >
                  <div class="font-medium">{note.path || "(root)"}</div>
                  <div class="text-text-muted text-xs">
                    {new Date(note.modified * 1000).toLocaleDateString()}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
