import Link from "next/link";
import { exampleGroups } from "@/lib/examples";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Infoplaza Platform Examples</h1>
      <p className="mt-2 text-gray-600">
        Example implementations for the{" "}
        <a
          href="https://platform.infoplaza.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Infoplaza Platform API
        </a>
        , built with Next.js and Tailwind CSS. Pick an example from the sidebar
        or the list below.
      </p>

      {exampleGroups.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {group.title}
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {group.examples.map((example) => (
              <li key={example.href}>
                <Link
                  href={example.href}
                  className="block rounded-lg border border-gray-200 p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <span className="font-medium">{example.title}</span>
                  <span className="mt-1 block text-sm text-gray-600">
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
