"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
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
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-cloud-dark bg-cloud/90 px-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-m-1 rounded-md p-1 text-dark/80 transition-colors hover:bg-cloud-dark hover:text-dark"
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

        <Link href="/" className="ml-1 embedded:hidden">
          <Logo />
        </Link>
      </header>

      {/* The backdrop the drawer sits on, and what a tap outside it closes. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-dark/30 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        // Narrow: a drawer over the page, slid out of sight until it is opened.
        // Wide: the column it has always been, back in the flow of the body.
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-cloud transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between px-6 py-6 embedded:lg:hidden">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block embedded:hidden"
          >
            <Logo />
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="mt-1 text-dark/50 transition-colors hover:text-dark lg:hidden"
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

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto *:shrink-0 px-6 pt-2 pb-8 embedded:lg:pt-8">
          {/* The way back to the list of every example. The logo links there
              too, but it is hidden when the page is framed. */}
          <NavLink
            href="/"
            active={pathname === "/"}
            onClick={() => setOpen(false)}
          >
            Overview
          </NavLink>

          {exampleGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 text-xs font-medium text-dark/50">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-px">
                {group.examples.map((example) => (
                  <li key={example.href}>
                    {/* Following a link is the end of the drawer's job, so
                        opening an example closes it. On the wide layout
                        there was nothing open to close. */}
                    <NavLink
                      href={example.href}
                      active={pathname === example.href}
                      onClick={() => setOpen(false)}
                    >
                      {example.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-6 py-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-dark/80 transition-colors hover:text-dark"
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

/** One entry in the menu, filled in green while it is the page shown. */
function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`-mx-2 block truncate rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-white" : "text-dark hover:bg-cloud-dark"
      }`}
    >
      {children}
    </Link>
  );
}

/** The Infoplaza wordmark with the line under it that says where you are. */
function Logo() {
  return (
    <span className="flex items-end gap-1">
      <Image
        src="/infoplaza-logo.svg"
        alt="Infoplaza"
        width={103}
        height={25}
        unoptimized
      />
      <span className="-translate-y-0.5 ml-1 text-xs font-medium text-dark">
        examples
      </span>
    </span>
  );
}
