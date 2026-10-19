import { categoryMeta } from "../utils";

/** The category code in its colour, with the name it stands for on hover. */
export function CategoryPill({ category }: { category: string }) {
  const meta = categoryMeta(category);
  return (
    <span
      className="inline-block w-8 shrink-0 rounded px-1 py-0.5 text-center text-xs font-semibold not-italic"
      style={{ backgroundColor: meta.color, color: meta.textColor }}
      title={meta.label}
    >
      {category}
    </span>
  );
}
