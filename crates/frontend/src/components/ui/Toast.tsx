import {
  createSignal,
  createContext,
  useContext,
  ParentComponent,
  Component,
  For,
  Show,
  onMount,
} from "solid-js";

type ToastType = "success" | "error" | "info" | "update";
type ToastDuration = "short" | "long" | "persistent";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  onUndo?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  duration: number;
  persistent?: boolean;
}

interface ToastOptions {
  onUndo?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  duration?: ToastDuration;
  persistent?: boolean;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  update: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

let toastId = 0;

const DURATION_MS = {
  short: 2000,
  long: 5000,
  persistent: Infinity,
};

export const ToastProvider: ParentComponent = (props) => {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  const addToast = (
    message: string,
    type: ToastType,
    options?: ToastOptions,
  ) => {
    const id = toastId++;
    const duration = DURATION_MS[options?.duration || "short"];

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        onUndo: options?.onUndo,
        onAction: options?.onAction,
        actionLabel: options?.actionLabel,
        duration,
        persistent: options?.persistent || duration === Infinity,
      },
    ]);

    // Auto-remove after duration (unless persistent)
    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUndo = (toast: Toast) => {
    if (toast.onUndo) {
      toast.onUndo();
      removeToast(toast.id);
    }
  };

  const contextValue: ToastContextValue = {
    success: (message: string, options?: ToastOptions) =>
      addToast(message, "success", options),
    error: (message: string, options?: ToastOptions) =>
      addToast(message, "error", options),
    info: (message: string, options?: ToastOptions) =>
      addToast(message, "info", options),
    update: (message: string, options?: ToastOptions) =>
      addToast(message, "update", options),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {props.children}
      <div class="pointer-events-none fixed right-3 bottom-3 z-[200] flex flex-col gap-1.5">
        <For each={toasts()}>
          {(toast) => (
            <div class="bg-paper pointer-events-auto rounded border px-3 py-2 shadow-md">
              <div class="text-text flex items-center gap-4">
                <span class="text-xs select-none">{toast.message}</span>
                <div class="ml-auto flex items-center gap-1.5">
                  <Show when={toast.onUndo}>
                    <button
                      class="text-text-muted text-xs underline hover:opacity-80"
                      onClick={() => handleUndo(toast)}
                    >
                      Undo
                    </button>
                  </Show>

                  <Show when={toast.onAction && toast.actionLabel}>
                    <button
                      class="text-text-muted text-xs underline hover:opacity-80"
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                    >
                      {toast.actionLabel}
                    </button>
                  </Show>
                  <button
                    class="text-text-muted opacity-50 hover:opacity-100"
                    onClick={() => removeToast(toast.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  );
};

export const ToastDebug: Component = () => {
  const toast = useToast();

  onMount(() => {
    toast.success("Note deleted", {
      onUndo: () => console.log("Undo delete"),
      duration: "persistent",
    });
    toast.info("Syncing notes...", { duration: "persistent" });
    toast.update("Update available: v0.4.0", {
      actionLabel: "Restart & Update",
      onAction: () => console.log("Restart & Update clicked"),
      duration: "persistent",
    });
    toast.success("Updated to v0.3.7", {
      actionLabel: "Release Notes",
      onAction: () => console.log("Release Notes clicked"),
      duration: "persistent",
    });
  });

  return null;
};
