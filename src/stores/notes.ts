// @ts-nocheck
import type { JSONContent } from "@tiptap/core";
import { create } from "zustand";
import {
        archiveNote as archiveNoteFile,
        createNote,
        deleteNote,
        initializeNoteDir,
        loadNotes,
        readNote,
        updateNote,
} from "../lib/notes";
import { encryptString } from "../lib/crypto";
import type { Note } from "../types/notes";

interface NoteStore {
        // State
        notes: Map<string, Note>;
        loading: boolean;
        error: string | null;
        lockSessions: Map<string, string>;

	// Actions
	initializeStore: () => Promise<void>;
	createNewNote: (parentId: string | null) => Promise<string | null>;
	loadNote: (noteId: string) => Promise<void>;
	updateNoteTitle: (noteId: string, title: string) => Promise<void>;
	updateNoteContent: (noteId: string, content: JSONContent) => Promise<void>;
	updateNoteData: (noteId: string, updates: Partial<Note>) => Promise<void>;
        removeNote: (noteId: string) => Promise<void>;
        archiveNote: (noteId: string) => Promise<void>;
        refreshNote: (noteId: string) => Promise<void>;
        setLockSession: (lockId: string, password: string) => void;
        clearLockSession: (lockId: string) => void;

	// Selectors
	getNote: (noteId: string) => Note | null;
	getRootNotes: () => Note[];
	getChildNotes: (parentId: string | null) => Note[];
	getNotePath: (noteId: string) => Note[];
	getDescendants: (noteId: string) => Note[];
}

export const useNoteStore = create<NoteStore>()(
        (
                set: (
                        partial:
                                | Partial<NoteStore>
                                | ((state: NoteStore) => Partial<NoteStore>),
                ) => void,
                get: () => NoteStore,
        ) => ({
        // State
        notes: new Map(),
        loading: false,
        error: null,
        lockSessions: new Map(),

	// Actions
	initializeStore: async () => {
		set({ loading: true, error: null });
		try {
			await initializeNoteDir();
			const notes = await loadNotes();
			const notesMap = new Map();
			notes.forEach((note) => notesMap.set(note.id, note));
			set({ notes: notesMap });
		} catch (err) {
			console.error("Store initialization error:", err);
			const errorMessage = err instanceof Error ? err.message : String(err);
			set({ error: `Failed to initialize store: ${errorMessage}` });
		} finally {
			set({ loading: false });
		}
	},

        createNewNote: async (parentId: string | null) => {
                set({ loading: true, error: null });
                try {
                        const { id } = await createNote(parentId);
                        let newNote = await readNote(id);
                        const parent = parentId ? get().notes.get(parentId) : null;
                        newNote = { ...newNote, lockId: parent?.lockId ?? null };
                        if (parent?.lockId) {
                                const pwd = get().lockSessions.get(parent.lockId);
                                if (pwd) {
                                        const { ciphertext, iv } = await encryptString(
                                                pwd,
                                                JSON.stringify(newNote.content),
                                        );
                                        newNote = {
                                                ...newNote,
                                                content: null,
                                                encryptedContent: ciphertext,
                                                iv,
                                        };
                                        await updateNote(id, newNote);
                                }
                        }
                        set((state) => ({
                                notes: new Map(state.notes).set(id, newNote),
                        }));
                        return id;
                } catch (err) {
                        set({ error: `Failed to create note: ${(err as Error).message}` });
                        return null;
                } finally {
                        set({ loading: false });
		}
	},

	loadNote: async (noteId: string) => {
		const { notes } = get();
		if (notes.has(noteId)) return;

		set({ loading: true, error: null });
		try {
			const note = await readNote(noteId);
			set((state) => ({
				notes: new Map(state.notes).set(noteId, note),
			}));
		} catch (err) {
			set({ error: `Failed to load note: ${(err as Error).message}` });
		} finally {
			set({ loading: false });
		}
	},

	updateNoteTitle: async (noteId: string, title: string) => {
		const { notes } = get();
		const note = notes.get(noteId);
		if (!note) return;

		set({ loading: true, error: null });
		try {
			const updatedNote = { ...note, title, updatedAt: new Date() };
			await updateNote(noteId, updatedNote);
			set((state) => ({
				notes: new Map(state.notes).set(noteId, updatedNote),
			}));
		} catch (err) {
			set({ error: `Failed to update note title: ${(err as Error).message}` });
		} finally {
			set({ loading: false });
		}
	},

        updateNoteContent: async (noteId: string, content: JSONContent) => {
                const { notes, lockSessions } = get();
                const note = notes.get(noteId);
                if (!note) return;

                set({ loading: true, error: null });
                try {
                        let updatedNote = { ...note, content, updatedAt: new Date() };
                        if (note.lockId) {
                                const pwd = lockSessions.get(note.lockId);
                                if (!pwd) throw new Error("Locked note not unlocked");
                                const { ciphertext, iv } = await encryptString(
                                        pwd,
                                        JSON.stringify(content),
                                );
                                updatedNote = {
                                        ...updatedNote,
                                        encryptedContent: ciphertext,
                                        iv,
                                };
                                const toSave = { ...updatedNote, content: null };
                                await updateNote(noteId, toSave);
                        } else {
                                await updateNote(noteId, updatedNote);
                        }
                        set((state) => ({
                                notes: new Map(state.notes).set(noteId, updatedNote),
                        }));
                } catch (err) {
                        set({
                                error: `Failed to update note content: ${(err as Error).message}`,
                        });
                } finally {
                        set({ loading: false });
                }
        },

	updateNoteData: async (noteId: string, updates: Partial<Note>) => {
		const { notes } = get();
		const note = notes.get(noteId);
		if (!note) return;

		set({ loading: true, error: null });
		try {
			const updatedNote = { ...note, ...updates, updatedAt: new Date() };
			await updateNote(noteId, updatedNote);
			set((state) => ({
				notes: new Map(state.notes).set(noteId, updatedNote),
			}));
		} catch (err) {
			set({ error: `Failed to update note: ${(err as Error).message}` });
		} finally {
			set({ loading: false });
		}
	},

	removeNote: async (noteId: string) => {
		set({ loading: true, error: null });
		try {
			const descendants = get().getDescendants(noteId);
			const idsToDelete = [noteId, ...descendants.map((d) => d.id)];
			await Promise.all(idsToDelete.map((id) => deleteNote(id)));
			set((state) => {
				const newNotes = new Map(state.notes);
				idsToDelete.forEach((id) => newNotes.delete(id));
				return { notes: newNotes };
			});
		} catch (err) {
			set({ error: `Failed to delete note: ${(err as Error).message}` });
		} finally {
			set({ loading: false });
		}
	},

	archiveNote: async (noteId: string) => {
		set({ loading: true, error: null });
		try {
			const descendants = get().getDescendants(noteId);
			const idsToArchive = [noteId, ...descendants.map((d) => d.id)];
			await Promise.all(idsToArchive.map((id) => archiveNoteFile(id)));
			set((state) => {
				const newNotes = new Map(state.notes);
				idsToArchive.forEach((id) => newNotes.delete(id));
				return { notes: newNotes };
			});
		} catch (err) {
			set({ error: `Failed to archive note: ${(err as Error).message}` });
		} finally {
			set({ loading: false });
		}
	},

        refreshNote: async (noteId: string) => {
                set({ loading: true, error: null });
                try {
                        const note = await readNote(noteId);
                        set((state) => ({
                                notes: new Map(state.notes).set(noteId, note),
                        }));
                } catch (err) {
                        set({ error: `Failed to refresh note: ${(err as Error).message}` });
                } finally {
                        set({ loading: false });
                }
        },

        setLockSession: (lockId: string, password: string) => {
                set((state) => {
                        const sessions = new Map(state.lockSessions);
                        sessions.set(lockId, password);
                        return { lockSessions: sessions };
                });
        },

        clearLockSession: (lockId: string) => {
                set((state) => {
                        const sessions = new Map(state.lockSessions);
                        sessions.delete(lockId);
                        return { lockSessions: sessions };
                });
        },

	// Selectors
	getNote: (noteId: string) => {
		const { notes } = get();
		return notes.get(noteId) || null;
	},

	getRootNotes: () => {
		const { notes } = get();
		return Array.from(notes.values()).filter((note) => note.parentId === null);
	},

	getChildNotes: (parentId: string | null) => {
		const { notes } = get();
		return Array.from(notes.values()).filter(
			(note) => note.parentId === parentId,
		);
	},

	getNotePath: (noteId: string) => {
		const { notes } = get();
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

        getDescendants: (noteId: string) => {
                const { notes } = get();
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
}));
