import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { commands } from "../api/commands";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { replaceAll } from "@milkdown/kit/utils";
import { gfm } from "@milkdown/kit/preset/gfm";
import "./editor.css";
import { useNoteContent, useAutoSave } from "../api";

const AUTOSAVE_DELAY = 1000;

export function MdEditor({ path }: { path: string }) {
  const [pathSignal, setPathSignal] = createSignal(path);

  const content = useNoteContent(pathSignal);

  const autoSave = useAutoSave({
    getPath: pathSignal,
    getContent: content.content,
    delay: AUTOSAVE_DELAY,
  });

  let ref: HTMLDivElement | null = null;
  let editor: Editor;

  const [isInitialized, setIsInitialized] = createSignal(false);

  onMount(async () => {
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, ref);
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown, prevMarkdown) => {
          content.setContent(markdown);
          autoSave.scheduleAutoSave(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .create();
  });

  onCleanup(() => {
    editor.destroy();
  });

  createEffect(() => {
    console.log(content);
    console.log(content.content());

    if (!isInitialized()) {
      editor.action(replaceAll(content.content()));
      // Set initial content as last saved to avoid triggering autosave on load
      autoSave.setLastSavedContent(content.content());
    }
    setIsInitialized(true);
  });

  return (
    <div class="flex-1 flex flex-col items-start">
      <div ref={ref!} class="flex-1 flex flex-col w-full pb-16" />

      <div class="fixed bottom-2 left-2 text-text-muted text-xs opacity-40">
        {(autoSave.isSaving() && "Saving...") ||
          (autoSave.hasUnsavedChanges() && "Unsaved changes")}
      </div>
    </div>
  );
}

export default MdEditor;
