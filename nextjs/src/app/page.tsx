import Link from "next/link";
import { ExampleIcon } from "@/components/example-icon";
import { exampleGroups, type ExampleGroup } from "@/lib/examples";

// Spelled out in full so Tailwind finds the classes in the source.
const accentPanel: Record<ExampleGroup["accent"], string> = {
  primary: "from-primary to-primary/70",
  secondary: "from-secondary to-secondary/70",
  marine: "from-marine to-marine/70",
  dark: "from-dark to-dark/75",
};

const accentDot: Record<ExampleGroup["accent"], string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  marine: "bg-marine",
  dark: "bg-dark",
};

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
          <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-dark/50">
            <span
              className={`size-2 rounded-full ${accentDot[group.accent]}`}
            />
            {group.title}
          </h2>
          <ul className="mt-2 grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.examples.map((example) => (
              <li key={example.href} className="h-full">
                <Link
                  href={example.href}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-cloud-dark bg-white transition-shadow hover:ring-2 hover:ring-primary"
                >
                  {/* The icon twice: small and sharp in the corner, and large
                      and faint off the edge, which is the whole decoration. */}
                  <span
                    className={`relative block h-20 overflow-hidden bg-linear-to-br ${accentPanel[group.accent]} text-white`}
                  >
                    <ExampleIcon
                      name={example.icon}
                      className="absolute top-3 left-3 size-6"
                    />
                    <ExampleIcon
                      name={example.icon}
                      className="absolute -right-5 -bottom-10 size-32 -rotate-12 opacity-25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-0 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="block p-3">
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
