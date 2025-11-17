import { Show, onMount, onCleanup, createEffect, JSX } from "solid-js";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: JSX.Element;
  class?: string;
}

export function Modal(props: ModalProps) {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.open) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleEscape);
    onCleanup(() => document.removeEventListener("keydown", handleEscape));
  });

  return (
    <Show when={props.open}>
      <div
        class="bg-opacity-50 fixed inset-0 z-50 flex items-start justify-center bg-black pt-28"
        onClick={handleBackdropClick}
      >
        <div class={props.class} onClick={(e) => e.stopPropagation()}>
          {props.children}
        </div>
      </div>
    </Show>
  );
}
