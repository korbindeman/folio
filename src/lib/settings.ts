import { path } from "@tauri-apps/api";
import {
	BaseDirectory,
	exists,
	readTextFile,
	writeTextFile,
} from "@tauri-apps/plugin-fs";

const baseDir = BaseDirectory.Document;
const settingsDir = "folio";
const settingsFile = "settings.json";

interface Settings {
	lastOpenedNoteId: string | null;
}

const defaultSettings: Settings = {
	lastOpenedNoteId: null,
};

export async function loadSettings(): Promise<Settings> {
	try {
		const settingsPath = await path.join(settingsDir, settingsFile);
		const settingsExists = await exists(settingsPath, { baseDir });

		if (!settingsExists) {
			return defaultSettings;
		}

		const settingsContent = await readTextFile(settingsPath, { baseDir });
		return { ...defaultSettings, ...JSON.parse(settingsContent) };
	} catch (error) {
		console.warn("Failed to load settings:", error);
		return defaultSettings;
	}
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
	try {
		const currentSettings = await loadSettings();
		const updatedSettings = { ...currentSettings, ...settings };

		const settingsPath = await path.join(settingsDir, settingsFile);
		await writeTextFile(
			settingsPath,
			JSON.stringify(updatedSettings, null, 2),
			{ baseDir },
		);
	} catch (error) {
		console.error("Failed to save settings:", error);
	}
}

export async function setLastOpenedNote(noteId: string | null): Promise<void> {
	await saveSettings({ lastOpenedNoteId: noteId });
}

export async function getLastOpenedNote(): Promise<string | null> {
	const settings = await loadSettings();
	return settings.lastOpenedNoteId;
}
