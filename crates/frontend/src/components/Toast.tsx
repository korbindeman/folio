import {
  createSignal,
  createContext,
  useContext,
  ParentComponent,
  For,
  Show,
} from "solid-js";

type ToastType = "success" | "error" | "info";
type ToastDuration = "short" | "long";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  onUndo?: () => void;
  duration: number;
}

interface ToastOptions {
  onUndo?: () => void;
  duration?: ToastDuration;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
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
      { id, message, type, onUndo: options?.onUndo, duration },
    ]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
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
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {props.children}
      <div class="pointer-events-none fixed right-4 bottom-4 z-[200] flex flex-col gap-2">
        <For each={toasts()}>
          {(toast) => (
            <div class="bg-paper animate-slide-in pointer-events-auto rounded-md border px-4 py-3 shadow-lg">
              <div class="text-text flex items-center gap-3">
                <span class="text-sm select-none">{toast.message}</span>
                <div class="ml-auto flex items-center gap-2">
                  <Show when={toast.onUndo}>
                    <button
                      class="text-text-muted text-sm underline hover:opacity-80"
                      onClick={() => handleUndo(toast)}
                    >
                      Undo
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
