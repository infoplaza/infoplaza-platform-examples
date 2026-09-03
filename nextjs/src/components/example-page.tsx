import type { ReactNode } from "react";
import { ApiLog } from "./api-log";
import type { ApiCall } from "@/lib/api-call";

/**
 * The frame every example is shown in: which API it belongs to, what it does,
 * the example itself, and the log of the Platform requests it made.
 *
 * Having it in one place is what makes the API log arrive in the same spot on
 * every page — a drawer down the right-hand side, a button in the corner when
 * it is closed — and keeps a new example from having to remember it.
 */
export function ExamplePage({
  group,
  title,
  intro,
  apiCalls,
  children,
}: {
  /** The Platform API this example belongs to, e.g. "Weather". */
  group: string;
  title: string;
  /** The paragraph under the title. */
  intro: ReactNode;
  /** Calls the page made while rendering, from `collectApiCalls`. */
  apiCalls?: ApiCall[];
  /** The example itself. */
  children: ReactNode;
}) {
  return (
    // The example gets more room than the words above it: a map is better
    // wide, and the widest table here needs more than a column of prose
    // should ever be, which is what made it scroll sideways by a hair.
    <div className="mx-auto max-w-7xl">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {group}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-gray-600">{intro}</p>
      </div>

      <div className="mt-8">{children}</div>

      {/* Fixed to the right of the viewport, so where it sits here does not
          matter; it is rendered last because that is where it belongs. */}
      <ApiLog initialCalls={apiCalls} />
    </div>
  );
}

/** A link into the Platform API reference, as the intros all use. */
export function ApiLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline"
    >
      {children}
    </a>
  );
}
