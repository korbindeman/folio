import { onMount } from "solid-js";
import { NotesProvider } from "./api";
import { Navigation } from "./components/Navigation";
import EditorManager from "./components/EditorManager";
import { ToastProvider, useToast } from "./components/Toast";
import { checkForUpdates } from "./utils/updater";
import { downloadAndInstallUpdate, restartApp } from "./utils/updater";
import { getVersion } from "@tauri-apps/api/app";

const LAST_VERSION_KEY = "lastAppVersion";

function AppContent() {
  const isDev = import.meta.env.DEV;
  const toast = useToast();

  onMount(async () => {
    const currentVersion = await getVersion();
    const lastVersion = localStorage.getItem(LAST_VERSION_KEY);

    // Check if app was just updated
    if (lastVersion && lastVersion !== currentVersion) {
      const releaseUrl = `https://github.com/korbindeman/zinnia/releases/tag/v${currentVersion}`;

      const openReleaseNotes = async () => {
        const opener = await import("@tauri-apps/plugin-opener");
        await opener.openUrl(releaseUrl);
      };

      toast.success(`Updated to v${currentVersion}`, {
        duration: "long",
        actionLabel: "Release Notes",
        onAction: openReleaseNotes,
      });
    }

    // Store current version for next launch
    localStorage.setItem(LAST_VERSION_KEY, currentVersion);

    // Check for updates on app startup (silent check)
    const update = await checkForUpdates();
    if (update) {
      toast.update(`Update available: v${update.version}`, {
        duration: "persistent",
        actionLabel: "Update & Restart",
        onAction: async () => {
          const success = await downloadAndInstallUpdate(update.update);
          if (success) {
            await restartApp();
          } else {
            toast.error("Failed to download update. Please try again.");
          }
        },
      });
    }
  });

  return (
    <div class="flex h-screen flex-col pt-0">
      <Navigation />
      <div class="mt-16 flex flex-1">
        <EditorManager />
      </div>
      {isDev && (
        <div class="fixed right-2 bottom-2 z-50 text-xs font-bold opacity-30">
          DEV
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <NotesProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NotesProvider>
  );
}

export default App;
