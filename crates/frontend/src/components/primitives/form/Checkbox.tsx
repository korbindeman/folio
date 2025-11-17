export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  class?: string;
}

export function Checkbox(props: CheckboxProps) {
  return (
    <>
      <div
        class={`border-border bg-button-bg flex h-5 w-5 cursor-pointer items-center justify-center rounded border ${props.class || ""}`}
        onClick={() => props.onChange(!props.checked)}
      >
        {props.checked && <span class="text-text text-sm">✓</span>}
      </div>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
        class="sr-only"
      />
    </>
  );
}
