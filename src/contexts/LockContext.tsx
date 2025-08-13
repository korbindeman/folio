import {
        createContext,
        type ReactNode,
        useCallback,
        useContext,
        useEffect,
        useState,
} from "react";
import { useActiveNote } from "./ActiveNoteContext";
import { useNoteStore } from "../stores/notes";
import { decryptString, encryptString, hashPassword } from "../lib/crypto";
import { updateNote } from "../lib/notes";
import type { Note } from "../types/notes";

interface LockContextType {
        unlockedLockId: string | null;
        unlock: (noteId: string, password: string) => Promise<boolean>;
        lock: () => Promise<void>;
        lockNote: (noteId: string, password: string) => Promise<void>;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

export function LockProvider({ children }: { children: ReactNode }) {
        const { activeNoteId } = useActiveNote();
        const {
                getNote,
                getDescendants,
                refreshNote,
                setLockSession,
                clearLockSession,
        } = useNoteStore();
        const [unlockedLockId, setUnlockedLockId] = useState<string | null>(null);

        const unlock = useCallback(
                async (noteId: string, password: string) => {
                        const root = getNote(noteId);
                        if (!root || !root.lockHash) return false;
                        const hashed = await hashPassword(password);
                        if (root.lockHash !== hashed) return false;
                        const notes: Note[] = [root, ...getDescendants(noteId)];
                        for (const n of notes) {
                                if (n.encryptedContent && n.iv) {
                                        const decrypted = await decryptString(
                                                password,
                                                n.encryptedContent,
                                                n.iv,
                                        );
                                        n.content = JSON.parse(decrypted);
                                }
                        }
                        useNoteStore.setState((state) => {
                                const newMap = new Map(state.notes);
                                notes.forEach((n) => newMap.set(n.id, n));
                                return { notes: newMap };
                        });
                        setLockSession(noteId, password);
                        setUnlockedLockId(noteId);
                        return true;
                },
                [getNote, getDescendants, setLockSession],
        );

        const lock = useCallback(async () => {
                if (!unlockedLockId) return;
                const root = getNote(unlockedLockId);
                const notes = root
                        ? [root, ...getDescendants(unlockedLockId)]
                        : [];
                for (const n of notes) {
                        await refreshNote(n.id);
                }
                clearLockSession(unlockedLockId);
                setUnlockedLockId(null);
        }, [unlockedLockId, getNote, getDescendants, refreshNote, clearLockSession]);

        const lockNote = useCallback(
                async (noteId: string, password: string) => {
                        const root = getNote(noteId);
                        if (!root) return;
                        const hash = await hashPassword(password);
                        const notes: Note[] = [root, ...getDescendants(noteId)];
                        for (const n of notes) {
                                const contentStr = JSON.stringify(
                                        n.content || { type: "doc", content: [{ type: "paragraph" }] },
                                );
                                const { ciphertext, iv } = await encryptString(
                                        password,
                                        contentStr,
                                );
                                n.encryptedContent = ciphertext;
                                n.iv = iv;
                                n.content = null;
                                n.lockId = noteId;
                                if (n.id === noteId) {
                                        n.lockHash = hash;
                                }
                                await updateNote(n.id, n);
                        }
                        useNoteStore.setState((state) => {
                                const newMap = new Map(state.notes);
                                notes.forEach((n) => newMap.set(n.id, n));
                                return { notes: newMap };
                        });
                },
                [getNote, getDescendants],
        );

        useEffect(() => {
                if (!unlockedLockId) return;
                if (!activeNoteId) {
                        void lock();
                        return;
                }
                const note = getNote(activeNoteId);
                if (!note || note.lockId !== unlockedLockId) {
                        void lock();
                }
        }, [activeNoteId, unlockedLockId, getNote, lock]);

        const value: LockContextType = {
                unlockedLockId,
                unlock,
                lock,
                lockNote,
        };

        return (
                <LockContext.Provider value={value}>{children}</LockContext.Provider>
        );
}

export function useLock() {
        const ctx = useContext(LockContext);
        if (ctx === undefined) {
                throw new Error("useLock must be used within a LockProvider");
        }
        return ctx;
}
