import { createSignal, createEffect } from "solid-js";
import { expandMacros } from "../../utils/macros";
import { Modal } from "../primitives/Modal";

export function InputModal(props: {
  open: boolean;
  onSubmit: (value: string) => void;
  placeholder: string;
  onClose: () => void;
}) {
  const [value, setValue] = createSignal("");
  let inputRef: HTMLInputElement | undefined;

  const handleClose = () => {
    setValue("");
    props.onClose();
  };

  createEffect(() => {
    if (props.open && inputRef) {
      setTimeout(() => inputRef?.focus(), 0);
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const expandedValue = expandMacros(value());
    props.onSubmit(expandedValue);
    setValue("");
  };

  return (
    <Modal
      open={props.open}
      onClose={handleClose}
      class="bg-button-bg w-[400px] rounded border p-4"
    >
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          class="text-text w-full bg-transparent outline-none"
          placeholder={props.placeholder}
          value={value()}
          onInput={(e) => setValue(e.currentTarget.value)}
          autofocus
        />
      </form>
    </Modal>
  );
}
