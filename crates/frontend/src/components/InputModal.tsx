import { createSignal, Show } from "solid-js";

export function InputModal(props: {
  showModal: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = createSignal("");

  return (
    <Show when={props.showModal}>
      <dialog
        open
        class="fixed border rounded p-4 w-[400px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-button-bg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onSubmit(value());
          }}
        >
          <input
            type="text"
            class="grow outline-none bg-transparent text-text"
            placeholder="untitled"
            value={value()}
            onInput={(e) => setValue(e.currentTarget.value)}
          />
        </form>
      </dialog>
    </Show>
  );
}
