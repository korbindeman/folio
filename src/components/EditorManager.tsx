import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveNote } from "../contexts/ActiveNoteContext";
import Editor from "./Editor";

interface LoadedEditor {
	noteId: string;
	lastAccessTime: number;
}

const EditorManager = () => {
	const { activeNoteId } = useActiveNote();
	const [loadedEditors, setLoadedEditors] = useState<Map<string, LoadedEditor>>(
		new Map(),
	);
	const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	// Maximum number of editors to keep in memory
	const MAX_EDITORS = 10;
	// Time before cleaning up unused editors (5 minutes)
	const CLEANUP_DELAY = 5 * 60 * 1000;

	// Add/update editor when accessing a note
	const updateEditorAccess = useCallback((noteId: string) => {
		setLoadedEditors((prev) => {
			const updated = new Map(prev);
			updated.set(noteId, {
				noteId,
				lastAccessTime: Date.now(),
			});
			return updated;
		});
	}, []);

	// Clean up least recently used editors when we exceed MAX_EDITORS
	const cleanupEditors = useCallback(() => {
		setLoadedEditors((prev) => {
			if (prev.size <= MAX_EDITORS) return prev;

			const sorted = Array.from(prev.values()).sort(
				(a, b) => b.lastAccessTime - a.lastAccessTime,
			);
			const toKeep = sorted.slice(0, MAX_EDITORS);
			const newMap = new Map();
			toKeep.forEach((editor) => newMap.set(editor.noteId, editor));
			return newMap;
		});
	}, [MAX_EDITORS]);

	// Schedule cleanup of old editors
	const scheduleCleanup = useCallback(() => {
		if (cleanupTimeoutRef.current) {
			clearTimeout(cleanupTimeoutRef.current);
		}

		cleanupTimeoutRef.current = setTimeout(() => {
			const cutoffTime = Date.now() - CLEANUP_DELAY;
			setLoadedEditors((prev) => {
				const filtered = new Map();
				for (const [noteId, editor] of prev.entries()) {
					// Keep active editor and recently accessed editors
					if (noteId === activeNoteId || editor.lastAccessTime > cutoffTime) {
						filtered.set(noteId, editor);
					}
				}
				return filtered;
			});
		}, CLEANUP_DELAY);
	}, [activeNoteId, CLEANUP_DELAY]);

	// Update access time when active note changes
	useEffect(() => {
		if (activeNoteId) {
			updateEditorAccess(activeNoteId);
			cleanupEditors();
			scheduleCleanup();
		}
	}, [activeNoteId, updateEditorAccess, cleanupEditors, scheduleCleanup]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
			}
		};
	}, []);

	if (!activeNoteId) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-gray-500">No note selected</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{Array.from(loadedEditors.keys()).map((noteId) => (
				<div
					key={noteId}
					className={
						noteId === activeNoteId ? "h-full flex flex-col grow" : "hidden"
					}
				>
					<Editor noteId={noteId} />
				</div>
			))}
		</div>
	);
};

export default EditorManager;
