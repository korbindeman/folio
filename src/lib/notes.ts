import { path } from "@tauri-apps/api";
import {
	BaseDirectory,
	exists,
	mkdir,
	readDir,
	readTextFile,
	remove,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import { v4 as uuidv4 } from "uuid";
import type { Note } from "../types/notes";

const baseDir = BaseDirectory.Document;
const noteDir = "folio";
const archiveDir = "folio/archive";

export async function initializeNoteDir() {
	const noteDirExists = await exists(noteDir, {
		baseDir,
	});

	if (!noteDirExists) {
		await mkdir(noteDir, {
			baseDir,
		});
	}

	const archiveDirExists = await exists(archiveDir, {
		baseDir,
	});

	if (!archiveDirExists) {
		await mkdir(archiveDir, {
			baseDir,
		});
	}
}

// TODO: these notes should not all be loaded from the start, only the root and pinned notes
export async function loadNotes() {
	const files = await readDir(noteDir, {
		baseDir,
	});

	const noteFiles = files.filter(
		(file) =>
			file.name !== ".DS_Store" && file.name.endsWith(".json") && file.isFile,
	);

	const notes = await Promise.all(
		noteFiles.map(async (file) => {
			try {
				const notePath = await path.join(noteDir, file.name);
				const note = await readTextFile(notePath, {
					baseDir,
				});
				return JSON.parse(note) as Note;
			} catch (err) {
				console.error(`Failed to load note ${file.name}:`, err);
				return null;
			}
		}),
	);

	// Filter out any null values from failed loads
	return notes.filter((note): note is Note => note !== null);
}

export async function createNote(parentId: string | null) {
	const noteId = uuidv4();
	const notePath = await path.join(noteDir, `${noteId}.json`);

        const note: Note = {
                id: noteId,
                title: "untitled",
                content: [],
                encryptedContent: null,
                iv: null,
                lockId: null,
                lockHash: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                parentId,
        };

	try {
		await writeTextFile(notePath, JSON.stringify(note), {
			baseDir,
		});
	} catch (error) {
		console.error("Error creating note:", error);
	}

	return { id: noteId };
}

export async function readNote(noteId: string) {
	const notePath = await path.join(noteDir, `${noteId}.json`);

	const note = await readTextFile(notePath, {
		baseDir,
	});

	return JSON.parse(note) as Note;
}

export async function updateNote(noteId: string, note: Note) {
	const notePath = await path.join(noteDir, `${noteId}.json`);

	await writeTextFile(notePath, JSON.stringify(note), {
		baseDir,
	});

	return { id: noteId };
}

export async function deleteNote(noteId: string) {
	const notePath = await path.join(noteDir, `${noteId}.json`);

	await remove(notePath, {
		baseDir,
	});

	return { id: noteId };
}

export async function archiveNote(noteId: string) {
	const notePath = await path.join(noteDir, `${noteId}.json`);
	const archivePath = await path.join(archiveDir, `${noteId}.json`);

	// Read the note
	const note = await readTextFile(notePath, {
		baseDir,
	});

	// Write to archive directory
	await writeTextFile(archivePath, note, {
		baseDir,
	});

	// Remove from main directory
	await remove(notePath, {
		baseDir,
	});

	return { id: noteId };
}
