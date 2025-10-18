import { createEffect, createSignal, For, Show } from "solid-js";
import { useNotes } from "../api";
import MdLoader from "./MdEditor";

export default function EditorManager() {
  const notes = useNotes();

  const [activeEditors, setActiveEditors] = createSignal<string[]>([]);

  createEffect(async () => {
    const path = notes.currentPath();

    if (!path) return;

    if (activeEditors().includes(path)) return;

    setActiveEditors((prev) => [...prev, path]);
  });

  return (
    <>
      <Show
        when={activeEditors().length > 0}
        fallback={
          <div class="flex items-center justify-center flex-1 text-text-muted select-none">
            No note selected
          </div>
        }
      >
        <For each={activeEditors()}>
          {(item, _index) => (
            <Show when={item === notes.currentPath()}>
              <MdLoader path={item} />
            </Show>
          )}
        </For>
      </Show>
    </>
  );
}
