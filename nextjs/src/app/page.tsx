import Link from "next/link";
import { ExampleIcon } from "@/components/example-icon";
import { exampleGroups } from "@/lib/examples";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Infoplaza Platform Examples</h1>
      <p className="mt-2 text-dark/80">
        Example implementations for the{" "}
        <a
          href="https://platform.infoplaza.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Infoplaza Platform API
        </a>
        , built with Next.js and Tailwind CSS. Pick an example from the sidebar
        or the list below.
      </p>

      {exampleGroups.map((group) => (
        <section key={group.title} className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-dark/50">
            {group.title}
          </h2>
          <ul className="mt-2 grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.examples.map((example) => (
              <li key={example.href} className="h-full">
                <Link
                  href={example.href}
                  className="flex h-full gap-3 rounded-lg border border-cloud-dark bg-white p-3 transition-shadow hover:ring-2 hover:ring-primary"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ExampleIcon name={example.icon} className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {example.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-dark/80">
                      {example.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
