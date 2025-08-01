import BulletList from "@tiptap/extension-bullet-list";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Text from "@tiptap/extension-text";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { all, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef } from "react";
import { useNoteStore } from "../stores/notes";

const lowlight = createLowlight(all);

interface EditorProps {
	noteId: string | null;
	autoSave?: boolean;
	autoSaveDelay?: number;
	isActive?: boolean;
}

const Editor = ({
	noteId,
	autoSave = true,
	autoSaveDelay = 1000,
	isActive = false,
}: EditorProps) => {
	const { getNote, updateNoteContent, loading, error } = useNoteStore();
	const note = noteId ? getNote(noteId) : null;
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const lastSavedContentRef = useRef<string>("");
	const isSavingRef = useRef<boolean>(false);
	const prevActiveRef = useRef<boolean>(false);

	const editor = useEditor({
		extensions: [
			Document,
			Paragraph,
			Text,
			History,
			BulletList,
			OrderedList,
			ListItem,
			TaskList.configure({}),
			TaskItem.configure({
				nested: true,
				HTMLAttributes: {
					class: "flex items-start gap-1",
				},
			}),
			Heading.configure({
				HTMLAttributes: {
					class: "font-bold",
				},
				levels: [1], // for now only level 1
			}),
			CodeBlockLowlight.configure({
				lowlight,
			}),
		],
		content: note?.content || { type: "doc", content: [{ type: "paragraph" }] },
		editorProps: {
			attributes: {
				class: "focus:outline-none min-h-full cursor-text pb-6",
			},
		},
		onUpdate: ({ editor }) => {
			const json = editor.getJSON();
			debouncedSave(json);
		},
		editable: !loading,
	});

	// Update editor content when note changes (external updates only)
	useEffect(() => {
		if (!editor || !note) return;

		const newContent = note.content;
		const newContentString = JSON.stringify(newContent);

		// Only update if content is different and we're not currently saving and editor doesn't have focus
		const shouldUpdateForExternalChange =
			!isSavingRef.current &&
			!editor.isFocused &&
			newContentString !== JSON.stringify(editor.getJSON()) &&
			newContentString !== lastSavedContentRef.current;

		if (shouldUpdateForExternalChange) {
			editor.commands.setContent(newContent, false);
			lastSavedContentRef.current = newContentString;
		}
	}, [note, editor]);

	const debouncedSave = useCallback(
		(content: JSONContent) => {
			if (!noteId) return;

			const contentString = JSON.stringify(content);
			if (!autoSave || contentString === lastSavedContentRef.current) return;

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			isSavingRef.current = true;

			saveTimeoutRef.current = setTimeout(async () => {
				try {
					await updateNoteContent(noteId, content);
					lastSavedContentRef.current = contentString;
				} catch (err) {
					console.error("Failed to save note:", err);
				} finally {
					isSavingRef.current = false;
				}
			}, autoSaveDelay);
		},
		[noteId, updateNoteContent, autoSave, autoSaveDelay],
	);

	// Update editor content when note changes (external updates only)
	useEffect(() => {
		if (!editor || !note) return;

		const newContent = note.content;
		const newContentString = JSON.stringify(newContent);

		// Only update if content is different and we're not currently saving and editor doesn't have focus
		const shouldUpdateForExternalChange =
			!isSavingRef.current &&
			!editor.isFocused &&
			newContentString !== JSON.stringify(editor.getJSON()) &&
			newContentString !== lastSavedContentRef.current;

		if (shouldUpdateForExternalChange) {
			editor.commands.setContent(newContent, false);
			lastSavedContentRef.current = newContentString;
		}
	}, [note, editor]);

	// Set initial content ref when editor is created
	useEffect(() => {
		if (editor && note) {
			lastSavedContentRef.current = JSON.stringify(note.content);
		}
	}, [editor, noteId]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			isSavingRef.current = false;
		};
	}, []);

	// Reset saving state when switching notes
	useEffect(() => {
		isSavingRef.current = false;
	}, [noteId]);

	useEffect(() => {
		if (isActive && !prevActiveRef.current && editor) {
			// Scroll to top
			editor.commands.scrollIntoView();
			editor.commands.setTextSelection(0);
			// Blur the editor
			editor.commands.blur();
		}

		prevActiveRef.current = isActive;
	}, [isActive, editor, noteId]);

	// Force save before unmount
	useEffect(() => {
		return () => {
			if (editor && autoSave && noteId) {
				const content = editor.getJSON();
				const contentString = JSON.stringify(content);
				if (contentString !== lastSavedContentRef.current) {
					updateNoteContent(noteId, content);
				}
			}
		};
	}, [editor, updateNoteContent, autoSave, noteId]);

	if (!noteId) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-gray-500">No note selected</div>
			</div>
		);
	}

	if (loading && !note) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-gray-500">Loading note...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-red-500">Error: {error}</div>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex-1 flex flex-col grow py-2">
			<div className="px-5 h-full flex flex-col">
				<EditorContent editor={editor} className="h-full" />
			</div>
		</div>
	);
};

export default Editor;
