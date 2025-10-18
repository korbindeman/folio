import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { replaceAll } from "@milkdown/kit/utils";
import { gfm } from "@milkdown/kit/preset/gfm";
import "./editor.css";
import "prosemirror-view/style/prosemirror.css";
import { useNoteContent, useAutoSave } from "../api";

const AUTOSAVE_DELAY = 1000;

// function toInternal(markdown: string): string {
//   const paragraphs = markdown.split("\n\n");
//   const processedParagraphs = paragraphs.map((para) =>
//     para.replace(/\n/g, "\n\n"),
//   );

//   const output: string[] = [];
//   for (let i = 0; i < processedParagraphs.length; i++) {
//     output.push(processedParagraphs[i]);

//     if (i < processedParagraphs.length - 1) {
//       const isFirst = i === 0;
//       const nextHasSoftBreak = paragraphs[i + 1].includes("\n");

//       if (isFirst || nextHasSoftBreak) {
//         output.push("\n\n");
//       } else {
//         output.push("\n\n<br />\n\n");
//       }
//     }
//   }

//   return output.join("");
// }

// function toStorage(markdown: string): string {
//   let result = markdown.replace(/\n\n<br \/>\n\n/g, "\n\n");

//   const paragraphs = result.split("\n\n");
//   const output: string[] = [];

//   for (let i = 0; i < paragraphs.length; i++) {
//     const para = paragraphs[i];

//     if (
//       i > 0 &&
//       para.trim().length > 0 &&
//       para.trim().length < 50 &&
//       !para.match(/^[A-Z#]/) &&
//       output.length > 0
//     ) {
//       output[output.length - 1] = output[output.length - 1] + "\n" + para;
//     } else {
//       output.push(para);
//     }
//   }

//   return output.join("\n\n");
// }

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
            let processedMarkdown = markdown;
            autoSave.scheduleAutoSave(processedMarkdown);
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
      const translatedMarkdown = content.content();
      editor.action(replaceAll(translatedMarkdown));
      // Set initial content as last saved to avoid triggering autosave on load
      autoSave.setLastSavedContent(content.content());
      setIsInitialized(true);
    }
  });

  return (
    <div class="flex-1 flex flex-col items-start px-1">
      <div ref={ref!} class="flex-1 flex flex-col w-full" />

      <div class="fixed bottom-2 left-2 text-text-muted text-xs opacity-40 pointer-events-none">
        {(autoSave.isSaving() && "Saving...") ||
          (autoSave.hasUnsavedChanges() && "Unsaved changes")}
      </div>
    </div>
  );
}

export default MdEditor;
