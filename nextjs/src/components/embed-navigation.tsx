"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Tells the page that frames us where we are.
 *
 * The platform site shows these examples in an iframe on its own /examples
 * route. It cannot read our location across origins, so every navigation is
 * announced here and mirrored into its address bar, which is what makes a
 * single example linkable from the outside.
 */
export function EmbedNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    // Not framed, nobody to tell. Reading window.top across origins throws,
    // and a page that cannot read it is framed, same as the check in the
    // layout script.
    try {
      if (window.self === window.top) return;
    } catch {
      // Framed by another origin: carry on and post.
    }

    // The path is no secret and the embedder differs per environment
    // (production, a preview deploy, localhost), so it goes to any parent.
    // The platform side checks that the message came from us.
    window.parent.postMessage(
      {
        type: "examples:navigate",
        path: `${window.location.pathname}${window.location.search}`,
      },
      "*",
    );
  }, [pathname]);

  return null;
}
