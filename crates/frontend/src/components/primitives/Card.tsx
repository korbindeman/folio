import { JSX, splitProps } from "solid-js";

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ["children", "class"]);

  return (
    <div
      class={`bg-paper text-text-muted rounded-md border px-2.5 py-1 pr-4 ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}
