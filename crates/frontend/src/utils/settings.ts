import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { homeDir } from "@tauri-apps/api/path";

export interface Settings {
  fontSize: number;
  notesLocation: string;
  autoCheckUpdates: boolean;
  openLastNote: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 14,
  notesLocation: "",
  autoCheckUpdates: true,
  openLastNote: true,
};

let settingsPath: string | null = null;
let settingsDir: string | null = null;

async function getSettingsPath(): Promise<string> {
  if (!settingsPath) {
    const home = await homeDir();
    settingsDir = `${home}/.config/zinnia`;
    settingsPath = `${settingsDir}/settings.json`;
  }
  return settingsPath;
}

async function ensureSettingsDir(): Promise<void> {
  if (!settingsDir) {
    await getSettingsPath();
  }
  const dirExists = await exists(settingsDir!);
  if (!dirExists) {
    await mkdir(settingsDir!, { recursive: true });
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const path = await getSettingsPath();
    const fileExists = await exists(path);

    if (!fileExists) {
      return { ...DEFAULT_SETTINGS };
    }

    const content = await readTextFile(path);
    const parsed = JSON.parse(content);

    const settings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };

    // Migration: If fontSize is 16 (old default), reset to 14 (new default)
    if (parsed.fontSize === 16) {
      settings.fontSize = 14;
      // Save the migrated settings
      await saveSettings(settings);
    }

    return settings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await ensureSettingsDir();
    const path = await getSettingsPath();
    const content = JSON.stringify(settings, null, 2);
    await writeTextFile(path, content);
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}

export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const settings = await loadSettings();
  settings[key] = value;
  await saveSettings(settings);
}

export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K]> {
  const settings = await loadSettings();
  return settings[key];
}
