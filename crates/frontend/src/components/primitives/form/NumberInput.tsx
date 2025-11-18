import { splitProps } from "solid-js";

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  class?: string;
}

export function NumberInput(props: NumberInputProps) {
  const [local, others] = splitProps(props, [
    "value",
    "onChange",
    "min",
    "max",
    "step",
    "class",
  ]);

  const step = () => local.step ?? 1;

  const decrement = () => {
    const newValue = local.value - step();
    if (local.min === undefined || newValue >= local.min) {
      local.onChange(newValue);
    }
  };

  const increment = () => {
    const newValue = local.value + step();
    if (local.max === undefined || newValue <= local.max) {
      local.onChange(newValue);
    }
  };

  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    const newValue = parseFloat(target.value);
    if (!isNaN(newValue)) {
      if (local.min !== undefined && newValue < local.min) {
        local.onChange(local.min);
      } else if (local.max !== undefined && newValue > local.max) {
        local.onChange(local.max);
      } else {
        local.onChange(newValue);
      }
    }
  };

  return (
    <div class={`inline-flex items-center ${local.class || ""}`}>
      <button
        type="button"
        onClick={decrement}
        class="bg-button-bg hover:bg-button-hover rounded-l border border-r-0 px-1.5 py-0.5 select-none"
      >
        -
      </button>
      <input
        type="text"
        value={local.value.toFixed(1)}
        onInput={handleInput}
        class="text-text w-12 [appearance:textfield] border bg-transparent py-0.5 text-center outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...others}
      />
      <button
        type="button"
        onClick={increment}
        class="bg-button-bg hover:bg-button-hover rounded-r border border-l-0 px-1.5 py-0.5 select-none"
      >
        +
      </button>
    </div>
  );
}
