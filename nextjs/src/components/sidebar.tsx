"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { exampleGroups, GITHUB_REPO_URL } from "@/lib/examples";

/**
 * The navigation down the left of every page.
 *
 * On a wide screen it is simply there, a column beside the example. On a
 * narrow one there is no room for a permanent column, so it becomes a drawer
 * behind a menu button in the bar at the top: the same list, the same order,
 * only out of the way until it is asked for.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Escape closes it, as it does every other layer that sits over a page.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* The narrow-screen bar. Fixed, so the example scrolls under it and the
          way back to the list is always a tap away. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/90 px-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-m-1 rounded-md p-1 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-5 w-5">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link href="/" className="text-sm font-semibold text-gray-900">
          Infoplaza Platform
        </Link>
      </header>

      {/* The backdrop the drawer sits on, and what a tap outside it closes. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-gray-900/30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        // Narrow: a drawer over the page, slid out of sight until it is opened.
        // Wide: the column it has always been, back in the flow of the body.
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 py-6">
          <Link href="/" onClick={() => setOpen(false)} className="block">
            <span className="text-sm font-semibold text-gray-900">
              Infoplaza Platform
            </span>
            <span className="block text-xs text-gray-500">Examples</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-gray-400 transition-colors hover:text-gray-900 lg:hidden"
          >
            <svg viewBox="0 0 14 14" aria-hidden="true" className="h-4 w-4">
              <path
                d="M3 3l8 8M11 3l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {exampleGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <h2 className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                {group.title}
              </h2>
              <ul>
                {group.examples.map((example) => {
                  const isActive = pathname === example.href;
                  return (
                    <li key={example.href}>
                      <Link
                        href={example.href}
                        // Following a link is the end of the drawer's job, so
                        // opening an example closes it. On the wide layout
                        // there was nothing open to close.
                        onClick={() => setOpen(false)}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-gray-100 font-medium text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        {example.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-6 py-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            GitHub
          </a>
        </div>
      </aside>
    </>
  );
}
