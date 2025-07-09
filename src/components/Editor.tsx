import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef } from "react";
import { useNote } from "../hooks/useNotes";

interface EditorProps {
	noteId: string | null;
	autoSave?: boolean;
	autoSaveDelay?: number;
}

const Editor = ({
	noteId,
	autoSave = true,
	autoSaveDelay = 100,
}: EditorProps) => {
	const { note, updateNote, loading, error } = useNote(noteId);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const lastSavedContentRef = useRef<string>("");

	const debouncedSave = useCallback(
		(content: JSONContent) => {
			const contentString = JSON.stringify(content);
			if (!autoSave || contentString === lastSavedContentRef.current) return;

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			saveTimeoutRef.current = setTimeout(async () => {
				try {
					await updateNote({ content });
					lastSavedContentRef.current = contentString;
				} catch (err) {
					console.error("Failed to save note:", err);
				}
			}, autoSaveDelay);
		},
		[updateNote, autoSave, autoSaveDelay],
	);

	const editor = useEditor({
		extensions: [StarterKit],
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
			if (editor && autoSave) {
				const content = editor.getJSON();
				const contentString = JSON.stringify(content);
				if (contentString !== lastSavedContentRef.current) {
					updateNote({ content });
				}
			}
		};
	}, [editor, updateNote, autoSave]);

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
