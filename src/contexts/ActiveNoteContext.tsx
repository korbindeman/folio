import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { useNoteHierarchy } from "../hooks/useNotes";
import { setLastOpenedNote } from "../lib/settings";
import type { Note } from "../types/notes";

interface ActiveNoteContextType {
	activeNoteId: string | null;
	setActiveNoteId: (noteId: string | null) => void;
	navigateToNote: (noteId: string) => void;
	navigateToParent: () => void;
	canNavigateBack: boolean;
	canNavigateForward: boolean;
	navigateBack: () => void;
	navigateForward: () => void;
	navigationHistory: string[];
	getCurrentNote: () => Note | null;
}

const ActiveNoteContext = createContext<ActiveNoteContextType | undefined>(
	undefined,
);

interface ActiveNoteProviderProps {
	children: ReactNode;
	initialNoteId?: string | null;
}

export function ActiveNoteProvider({
	children,
	initialNoteId = null,
}: ActiveNoteProviderProps) {
	const [activeNoteId, setActiveNoteIdState] = useState<string | null>(
		initialNoteId,
	);
	const [navigationHistory, setNavigationHistory] = useState<string[]>(
		initialNoteId ? [initialNoteId] : [],
	);
	const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(
		initialNoteId ? 0 : -1,
	);
	const { notes } = useNoteHierarchy();

	const setActiveNoteId = useCallback((noteId: string | null) => {
		setActiveNoteIdState(noteId);
		if (noteId) {
			setLastOpenedNote(noteId);
		}
	}, []);

	const navigateToNote = useCallback(
		(noteId: string) => {
			setActiveNoteId(noteId);
			setNavigationHistory((prev) => {
				const newHistory = prev.slice(0, currentHistoryIndex + 1);
				newHistory.push(noteId);
				return newHistory;
			});
			setCurrentHistoryIndex((prev) => prev + 1);
			// Persist the last opened note
			setLastOpenedNote(noteId);
		},
		[currentHistoryIndex],
	);

	const navigateToParent = useCallback(() => {
		// This would need to be implemented with note hierarchy logic
		// For now, it's a placeholder
		console.log("Navigate to parent not implemented yet");
	}, []);

	const canNavigateBack = currentHistoryIndex > 0;
	const canNavigateForward = currentHistoryIndex < navigationHistory.length - 1;

	const navigateBack = useCallback(() => {
		if (canNavigateBack) {
			const newIndex = currentHistoryIndex - 1;
			setCurrentHistoryIndex(newIndex);
			setActiveNoteId(navigationHistory[newIndex]);
		}
	}, [
		canNavigateBack,
		currentHistoryIndex,
		navigationHistory,
		setActiveNoteId,
	]);

	const navigateForward = useCallback(() => {
		if (canNavigateForward) {
			const newIndex = currentHistoryIndex + 1;
			setCurrentHistoryIndex(newIndex);
			setActiveNoteId(navigationHistory[newIndex]);
		}
	}, [
		canNavigateForward,
		currentHistoryIndex,
		navigationHistory,
		setActiveNoteId,
	]);

	const getCurrentNote = useCallback((): Note | null => {
		if (!activeNoteId) return null;
		return notes.get(activeNoteId) || null;
	}, [activeNoteId, notes]);

	const contextValue = {
		activeNoteId,
		setActiveNoteId,
		navigateToNote,
		navigateToParent,
		canNavigateBack,
		canNavigateForward,
		navigateBack,
		navigateForward,
		navigationHistory,
		getCurrentNote,
	};

	return (
		<ActiveNoteContext.Provider value={contextValue}>
			{children}
		</ActiveNoteContext.Provider>
	);
}

export function useActiveNote() {
	const context = useContext(ActiveNoteContext);
	if (context === undefined) {
		throw new Error("useActiveNote must be used within an ActiveNoteProvider");
	}
	return context;
}
