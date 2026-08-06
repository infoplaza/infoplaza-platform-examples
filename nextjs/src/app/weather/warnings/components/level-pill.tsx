import { levelMeta } from "../utils";

/**
 * The colour code of a warning, in the colour it stands for: the same yellow,
 * orange and red the warning texts themselves name.
 */
export function LevelPill({ level }: { level: number }) {
  const meta = levelMeta(level);

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: meta.color, color: meta.textColor }}
    >
      {meta.label}
    </span>
  );
}
