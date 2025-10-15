import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { replaceAll } from "@milkdown/kit/utils";
import { gfm } from "@milkdown/kit/preset/gfm";
import "./editor.css";
import { useNoteContent, useAutoSave } from "../api";

const AUTOSAVE_DELAY = 1000;

export function MdEditor({ path }: { path: string }) {
  const [pathSignal, _setPathSignal] = createSignal(path);

  const content = useNoteContent(pathSignal);

  const autoSave = useAutoSave({
    getPath: pathSignal,
    getContent: content.content,
    delay: AUTOSAVE_DELAY,
  });

  let ref: HTMLDivElement | null = null;
  let editor: Editor;
  const [editorRef, setEditorRef] = createSignal<Editor | null>(null);

  const [isInitialized, setIsInitialized] = createSignal(false);

  onMount(async () => {
    editor = await Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, ref);
        ctx
          .get(listenerCtx)
          .markdownUpdated((_ctx, markdown, _prevMarkdown) => {
            content.setContent(markdown);
            autoSave.scheduleAutoSave(markdown);
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .create();
    setEditorRef(editor);
  });

  onCleanup(() => {
    editor.destroy();
  });

  createEffect(() => {
    content.content();
    editorRef();

    if (!isInitialized() && editorRef() && !content.isLoading()) {
      editor.action(replaceAll(content.content()));
      // Set initial content as last saved to avoid triggering autosave on load
      autoSave.setLastSavedContent(content.content());
      setIsInitialized(true);
    }
  });

  return (
    <div class="flex-1 flex flex-col items-start px-1">
      <div ref={ref!} class="flex-1 flex flex-col w-full" />

      <div class="fixed bottom-2 left-2 text-text-muted text-xs opacity-40">
        {(autoSave.isSaving() && "Saving...") ||
          (autoSave.hasUnsavedChanges() && "Unsaved changes")}
      </div>
    </div>
  );
}

export default MdEditor;
