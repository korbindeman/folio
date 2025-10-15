import { createEffect, createSignal, For, Show } from "solid-js";
import { useNotes } from "../api";
import MdEditor from "./MdEditor";

export default function EditorManager() {
  const notes = useNotes();

  const [activeEditors, setActiveEditors] = createSignal<string[]>([]);

  createEffect(async () => {
    const path = notes.currentPath();

    if (activeEditors().includes(path)) return;

    setActiveEditors((prev) => [...prev, path]);
  });

  return (
    <div>
      {/*<Show
        when={notes.currentPath()}
        fallback={
          <div class="flex items-center justify-center flex-1 text-text-muted select-none">
            No note selected
          </div>
        }
      >*/}
      <For each={activeEditors()}>
        {(item, index) => (
          <Show when={item === notes.currentPath()}>
            <MdEditor path={item} />
          </Show>
        )}
      </For>
    </div>
  );
}
