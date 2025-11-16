import { onMount, createSignal, onCleanup } from "solid-js";
import { NotesProvider, useNotes } from "./api";
import { Navigation } from "./components/Navigation";
import EditorManager from "./components/EditorManager";
import { ToastProvider, useToast } from "./components/Toast";
import { NoteFinder } from "./components/NoteFinder";
import { checkForUpdates } from "./utils/updater";
import { downloadAndInstallUpdate, restartApp } from "./utils/updater";
import { getVersion } from "@tauri-apps/api/app";
import type { NoteMetadata } from "./types";

const LAST_VERSION_KEY = "lastAppVersion";

function AppContent() {
  const isDev = import.meta.env.DEV;
  const toast = useToast();
  const notes = useNotes();
  const [showNoteFinder, setShowNoteFinder] = createSignal(false);

  // Global keyboard shortcut for Command+K / Control+K
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setShowNoteFinder(true);
    }
  };

  onMount(async () => {
    // Register global keyboard listener
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
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
        duration: "persistent",
        actionLabel: "Release Notes",
        onAction: openReleaseNotes,
      });
    }

    // Store current version for next launch
    localStorage.setItem(LAST_VERSION_KEY, currentVersion);

    // Function to check for updates and show toast if available
    const performUpdateCheck = async () => {
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
    };

    // Check for updates on app startup
    await performUpdateCheck();

    // Check for updates on interval
    const HOURS = 2;
    const updateCheckInterval = setInterval(
      performUpdateCheck,
      HOURS * 60 * 60 * 1000,
    );

    onCleanup(() => {
      clearInterval(updateCheckInterval);
    });
  });

  const handleNoteSelect = (note: NoteMetadata) => {
    notes.setCurrentPath(note.path);
  };

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
      <NoteFinder
        showModal={showNoteFinder()}
        onSelect={handleNoteSelect}
        onClose={() => setShowNoteFinder(false)}
        placeholder="Search notes..."
      />
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
