import Link from "next/link";
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
        <section key={group.title} className="mt-10">
          <h2 className="text-xs font-medium uppercase tracking-wide text-dark/50">
            {group.title}
          </h2>
          <ul className="mt-3 grid auto-rows-fr gap-4 sm:grid-cols-2">
            {group.examples.map((example) => (
              <li key={example.href} className="h-full">
                <Link
                  href={example.href}
                  className="flex h-full flex-col rounded-lg border border-cloud-dark bg-white p-5 transition-shadow hover:ring-2 hover:ring-primary"
                >
                  <span className="font-medium">{example.title}</span>
                  <span className="mt-1 block text-sm text-dark/80">
                    {example.description}
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
