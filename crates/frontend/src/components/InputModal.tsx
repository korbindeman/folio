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
        class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
        onClick={handleBackdropClick}
      >
        <div
          class="bg-button-bg w-[400px] rounded border p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              class="text-text w-full bg-transparent outline-none"
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
