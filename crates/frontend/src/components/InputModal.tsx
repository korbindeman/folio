import { createSignal, Show, onMount, createEffect } from "solid-js";

export function InputModal(props: {
  showModal: boolean;
  onSubmit: (value: string) => void;
  placeholder: string;
  onClose?: () => void;
}) {
  const [value, setValue] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  const handleClose = () => {
    setValue("");
    props.onClose?.();
  };

  createEffect(() => {
    if (props.showModal && inputRef) {
      setTimeout(() => inputRef?.focus(), 0);
    }
  });

  onMount(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && props.showModal) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    props.onSubmit(value());
    setValue("");
  };

  return (
    <Show when={props.showModal}>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div
          class="border rounded p-4 w-[400px] bg-button-bg"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              class="w-full outline-none bg-transparent text-text"
              placeholder={props.placeholder}
              value={value()}
              onInput={(e) => setValue(e.currentTarget.value)}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autofocus
            />
          </form>
        </div>
      </div>
    </Show>
  );
}
