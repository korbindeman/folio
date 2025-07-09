import { useActiveNote } from "../contexts/ActiveNoteContext";
import { useNote } from "./useNotes";

export function useActiveNoteData() {
	const {
		activeNoteId,
		navigateToNote,
		navigateBack,
		navigateForward,
		canNavigateBack,
		canNavigateForward,
	} = useActiveNote();
	const { note, loading, error, updateNote, deleteNote, refresh, children } =
		useNote(activeNoteId);

	return {
		// Note data
		note,
		loading,
		error,
		children,

		// Note operations
		updateNote,
		deleteNote,
		refresh,

		// Navigation
		activeNoteId,
		navigateToNote,
		navigateBack,
		navigateForward,
		canNavigateBack,
		canNavigateForward,

		// Convenience properties
		hasActiveNote: activeNoteId !== null,
		title: note?.title || "Untitled",
		content: note?.content || { type: "doc", content: [{ type: "paragraph" }] },
		createdAt: note?.createdAt,
		updatedAt: note?.updatedAt,
		parentId: note?.parentId,
	};
}
