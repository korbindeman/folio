import { createSignal, onMount, Show } from "solid-js";
import { Modal } from "../primitives/Modal";
import { Card } from "../primitives/Card";
import { NumberInput, Checkbox } from "../primitives/form";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type Settings as SettingsType,
} from "../../utils/settings";
// import { open as openDialog } from "@tauri-apps/plugin-dialog";

export function Settings(props: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = createSignal<SettingsType | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    const loaded = await loadSettings();
    setSettings(loaded);
    setLoading(false);
  });

  const updateFontSize = async (value: number) => {
    const current = settings();
    if (!current) return;
    const updated = { ...current, fontSize: value };
    setSettings(updated);
    document.documentElement.style.fontSize = `${value}px`;
    await saveSettings(updated);
  };

  // const updateNotesLocation = async (value: string) => {
  //   const current = settings();
  //   if (!current) return;
  //   const updated = { ...current, notesLocation: value };
  //   setSettings(updated);
  //   await saveSettings(updated);
  // };

  const updateAutoCheckUpdates = async (value: boolean) => {
    const current = settings();
    if (!current) return;
    const updated = { ...current, autoCheckUpdates: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  // const selectFolder = async () => {
  //   const selected = await openDialog({
  //     directory: true,
  //     multiple: false,
  //     title: "Select Notes Location",
  //   });
  //   if (selected && typeof selected === "string") {
  //     await updateNotesLocation(selected);
  //   }
  // };

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <Card class="w-[400px] px-4 py-4 pb-8">
        <Show when={!loading() && settings()}>
          <div class="space-y-4">
            <h1 class="text-text pb-1 text-sm">Settings</h1>

            <div class="flex items-center justify-between">
              <label class="text-sm">Font Size</label>
              <div class="flex items-center gap-2">
                {settings()!.fontSize !== DEFAULT_SETTINGS.fontSize && (
                  <button
                    type="button"
                    onClick={() => updateFontSize(DEFAULT_SETTINGS.fontSize)}
                    class="text-text-muted hover:text-text text-xs hover:underline"
                  >
                    Reset
                  </button>
                )}
                <NumberInput
                  value={settings()!.fontSize}
                  onChange={updateFontSize}
                  min={10}
                  max={32}
                  step={1}
                />
              </div>
            </div>

            <hr />

            {/*<div class="flex items-center justify-between">
              <label class="text-sm">Note Collection Location</label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  value={settings()!.notesLocation}
                  onInput={(e) => updateNotesLocation(e.currentTarget.value)}
                  class="text-text w-40 rounded border bg-transparent px-2 py-1 outline-none"
                  placeholder="Default"
                />
                <button
                  type="button"
                  onClick={selectFolder}
                  class="bg-button-bg hover:bg-button-hover rounded border px-2 py-1"
                >
                  Browse
                </button>
                {settings()!.notesLocation !==
                  DEFAULT_SETTINGS.notesLocation && (
                  <button
                    type="button"
                    onClick={() =>
                      updateNotesLocation(DEFAULT_SETTINGS.notesLocation)
                    }
                    class="text-text-muted hover:text-text text-xs"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>*/}

            <div class="flex items-center justify-between">
              <label class="text-sm">Automatically check for updates</label>
              <div class="flex items-center gap-2">
                {settings()!.autoCheckUpdates !==
                  DEFAULT_SETTINGS.autoCheckUpdates && (
                  <button
                    type="button"
                    onClick={() =>
                      updateAutoCheckUpdates(DEFAULT_SETTINGS.autoCheckUpdates)
                    }
                    class="text-text-muted hover:text-text text-xs hover:underline"
                  >
                    Reset
                  </button>
                )}
                <Checkbox
                  checked={settings()!.autoCheckUpdates}
                  onChange={updateAutoCheckUpdates}
                />
              </div>
            </div>
          </div>
        </Show>

        <Show when={loading()}>
          <div class="text-text-muted">Loading settings...</div>
        </Show>
      </Card>
    </Modal>
  );
}
