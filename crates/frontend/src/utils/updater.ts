import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  update: Update;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const update = await check();

    if (!update) {
      console.log("App is up to date");
      return null;
    }

    return {
      version: update.version,
      currentVersion: update.currentVersion,
      date: update.date,
      body: update.body,
      update,
    };
  } catch (error) {
    console.error("Update check failed:", error);
    return null;
  }
}

export async function downloadAndInstallUpdate(
  update: Update,
  onProgress?: (progress: {
    chunkLength: number;
    contentLength?: number;
  }) => void,
): Promise<boolean> {
  try {
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log("Download started", event.data);
          break;
        case "Progress":
          if (onProgress) {
            onProgress({
              chunkLength: event.data.chunkLength,
              contentLength: (event.data as any).contentLength,
            });
          }
          break;
        case "Finished":
          console.log("Download finished");
          break;
      }
    });

    return true;
  } catch (error) {
    console.error("Update download/install failed:", error);
    return false;
  }
}

export async function restartApp(): Promise<void> {
  try {
    await relaunch();
  } catch (error) {
    console.error("Failed to restart app:", error);
  }
}
