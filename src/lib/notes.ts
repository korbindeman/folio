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

export async function initializeNoteDir() {
	const noteDirExists = await exists(noteDir, {
		baseDir,
	});

	if (!noteDirExists) {
		await mkdir(noteDir, {
			baseDir,
		});
	}
}

export async function loadNotes() {
	const files = await readDir(noteDir, {
		baseDir,
	});

	const notes = await Promise.all(
		files
			.filter((file) => file.name !== ".DS_Store")
			.map(async (file) => {
				const notePath = await path.join(noteDir, file.name);
				const note = await readTextFile(notePath, {
					baseDir,
				});
				return JSON.parse(note) as Note;
			}),
	);

	return notes;
}

export async function createNote(parentId: string | null) {
	const noteId = uuidv4();
	const notePath = await path.join(noteDir, `${noteId}.json`);

	const note: Note = {
		id: noteId,
		title: "",
		content: [],
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
