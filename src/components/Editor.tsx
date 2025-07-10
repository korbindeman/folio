import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { useNoteStore } from "../stores/notes";

interface EditorProps {
	noteId: string | null;
	autoSave?: boolean;
	autoSaveDelay?: number;
}

const Editor = ({
	noteId,
	autoSave = true,
	autoSaveDelay = 1000,
}: EditorProps) => {
	const { getNote, updateNoteContent, loading, error } = useNoteStore();
	const note = noteId ? getNote(noteId) : null;
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const lastSavedContentRef = useRef<string>("");

	const debouncedSave = useCallback(
		(content: JSONContent) => {
			if (!noteId) return;

			const contentString = JSON.stringify(content);
			if (!autoSave || contentString === lastSavedContentRef.current) return;

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			saveTimeoutRef.current = setTimeout(async () => {
				try {
					await updateNoteContent(noteId, content);
					lastSavedContentRef.current = contentString;
				} catch (err) {
					console.error("Failed to save note:", err);
				}
			}, autoSaveDelay);
		},
		[noteId, updateNoteContent, autoSave, autoSaveDelay],
	);

	const editor = useEditor({
		extensions: [
			StarterKit,
			TaskList.configure({}),
			TaskItem.configure({
				nested: true,
				HTMLAttributes: {
					class: "flex items-start gap-1",
				},
			}),
		],
		content: note?.content || { type: "doc", content: [{ type: "paragraph" }] },
		editorProps: {
			attributes: {
				class: "focus:outline-none h-screen prose prose-sm",
			},
		},
		onUpdate: ({ editor }) => {
			const json = editor.getJSON();
			debouncedSave(json);
		},
		editable: !loading,
	});

	// Update editor content when note changes (external updates)
	useEffect(() => {
		if (!editor || !note) return;

		const newContent = note.content;
		const currentContent = editor.getJSON();
		const newContentString = JSON.stringify(newContent);
		const currentContentString = JSON.stringify(currentContent);

		if (
			newContentString !== currentContentString &&
			newContentString !== lastSavedContentRef.current
		) {
			editor.commands.setContent(newContent, false);
			lastSavedContentRef.current = newContentString;
		}
	}, [note, editor]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

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
		<div className="flex flex-col h-screen">
			<div className="flex-1 overflow-auto">
				<EditorContent editor={editor} />
			</div>
		</div>
	);
};

export default Editor;
