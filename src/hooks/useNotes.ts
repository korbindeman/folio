import { useCallback, useEffect, useState } from "react";
import {
	createNote,
	deleteNote,
	initializeNoteDir,
	loadNotes,
	readNote,
	updateNote,
} from "../lib/notes";
import type { Note } from "../types/notes";

interface UseNotesReturn {
	notes: Map<string, Note>;
	loading: boolean;
	error: string | null;
	createNewNote: (parentId: string | null) => Promise<string | null>;
	loadNote: (noteId: string) => Promise<void>;
	saveNote: (noteId: string, note: Note) => Promise<void>;
	removeNote: (noteId: string) => Promise<void>;
	getChildNotes: (parentId: string | null) => Note[];
	refreshNote: (noteId: string) => Promise<void>;
}

export function useNotes(): UseNotesReturn {
	const [notes, setNotes] = useState<Map<string, Note>>(new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		initializeNoteDir().catch((err) =>
			setError(`Failed to initialize notes directory: ${err.message}`),
		);

		loadNotes().then((notes) => {
			const map = new Map();
			notes.map((note) => map.set(note.id, note));
			setNotes(map);
		});
		// setNotes(loadNotes());
	}, []);

	const createNewNote = useCallback(
		async (parentId: string | null): Promise<string | null> => {
			setLoading(true);
			setError(null);
			try {
				const { id } = await createNote(parentId);
				const newNote = await readNote(id);
				setNotes((prev) => new Map(prev).set(id, newNote));
				return id;
			} catch (err) {
				setError(`Failed to create note: ${(err as Error).message}`);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const loadNote = useCallback(
		async (noteId: string): Promise<void> => {
			if (notes.has(noteId)) return;

			setLoading(true);
			setError(null);
			try {
				const note = await readNote(noteId);
				setNotes((prev) => new Map(prev).set(noteId, note));
			} catch (err) {
				setError(`Failed to load note: ${(err as Error).message}`);
			} finally {
				setLoading(false);
			}
		},
		[notes],
	);

	const saveNote = useCallback(
		async (noteId: string, note: Note): Promise<void> => {
			setLoading(true);
			setError(null);
			try {
				const updatedNote = { ...note, updatedAt: new Date() };
				await updateNote(noteId, updatedNote);
				setNotes((prev) => new Map(prev).set(noteId, updatedNote));
			} catch (err) {
				setError(`Failed to save note: ${(err as Error).message}`);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const removeNote = useCallback(async (noteId: string): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			await deleteNote(noteId);
			setNotes((prev) => {
				const newMap = new Map(prev);
				newMap.delete(noteId);
				return newMap;
			});
		} catch (err) {
			setError(`Failed to delete note: ${(err as Error).message}`);
		} finally {
			setLoading(false);
		}
	}, []);

	const getChildNotes = useCallback(
		(parentId: string | null): Note[] => {
			return Array.from(notes.values()).filter(
				(note) => note.parentId === parentId,
			);
		},
		[notes],
	);

	const refreshNote = useCallback(async (noteId: string): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const note = await readNote(noteId);
			setNotes((prev) => new Map(prev).set(noteId, note));
		} catch (err) {
			setError(`Failed to refresh note: ${(err as Error).message}`);
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		notes,
		loading,
		error,
		createNewNote,
		loadNote,
		saveNote,
		removeNote,
		getChildNotes,
		refreshNote,
	};
}

interface UseNoteReturn {
	note: Note | null;
	loading: boolean;
	error: string | null;
	updateNote: (updates: Partial<Note>) => Promise<void>;
	deleteNote: () => Promise<void>;
	refresh: () => Promise<void>;
	children: Note[];
}

export function useNote(noteId: string | null): UseNoteReturn {
	const [note, setNote] = useState<Note | null>(null);
	const [children, _setChildren] = useState<Note[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadNoteData = useCallback(async () => {
		if (!noteId) return;

		setLoading(true);
		setError(null);
		try {
			const noteData = await readNote(noteId);
			setNote(noteData);
		} catch (err) {
			setError(`Failed to load note: ${(err as Error).message}`);
		} finally {
			setLoading(false);
		}
	}, [noteId]);

	useEffect(() => {
		loadNoteData();
	}, [loadNoteData]);

	const updateNoteData = useCallback(
		async (updates: Partial<Note>): Promise<void> => {
			if (!note || !noteId) return;

			setLoading(true);
			setError(null);
			try {
				const updatedNote = { ...note, ...updates, updatedAt: new Date() };
				await updateNote(noteId, updatedNote);
				setNote(updatedNote);
			} catch (err) {
				setError(`Failed to update note: ${(err as Error).message}`);
			} finally {
				setLoading(false);
			}
		},
		[note, noteId],
	);

	const deleteNoteData = useCallback(async (): Promise<void> => {
		if (!noteId) return;

		setLoading(true);
		setError(null);
		try {
			await deleteNote(noteId);
			setNote(null);
		} catch (err) {
			setError(`Failed to delete note: ${(err as Error).message}`);
		} finally {
			setLoading(false);
		}
	}, [noteId]);

	const refresh = useCallback(async (): Promise<void> => {
		await loadNoteData();
	}, [loadNoteData]);

	return {
		note,
		loading,
		error,
		updateNote: updateNoteData,
		deleteNote: deleteNoteData,
		refresh,
		children,
	};
}

export function useNoteHierarchy() {
	const { notes, loadNote, createNewNote, removeNote, error, loading } =
		useNotes();

	const getRootNotes = useCallback((): Note[] => {
		return Array.from(notes.values()).filter((note) => note.parentId === null);
	}, [notes]);

	const getNotePath = useCallback(
		(noteId: string): Note[] => {
			const path: Note[] = [];
			let currentNote = notes.get(noteId);

			while (currentNote) {
				path.unshift(currentNote);
				currentNote = currentNote.parentId
					? notes.get(currentNote.parentId)
					: undefined;
			}

			return path;
		},
		[notes],
	);

	const getDescendants = useCallback(
		(noteId: string): Note[] => {
			const descendants: Note[] = [];
			const stack = [noteId];

			while (stack.length > 0) {
				// biome-ignore lint/style/noNonNullAssertion: stack will always have a length greater than 0
				const currentId = stack.pop()!;
				const children = Array.from(notes.values()).filter(
					(note) => note.parentId === currentId,
				);

				descendants.push(...children);
				stack.push(...children.map((child) => child.id));
			}

			return descendants;
		},
		[notes],
	);

	return {
		notes,
		loading,
		error,
		loadNote,
		createNewNote,
		removeNote,
		getRootNotes,
		getNotePath,
		getDescendants,
	};
}
