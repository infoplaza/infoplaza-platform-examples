export const GITHUB_REPO_URL =
  "https://github.com/infoplaza/infoplaza-platform-example";

export interface Example {
  title: string;
  description: string;
  href: string;
}

export interface ExampleGroup {
  title: string;
  examples: Example[];
}

/**
 * Registry of all example implementations, grouped by Platform API.
 * The sidebar and home page are rendered from this list, so adding an
 * example here makes it show up everywhere.
 */
export const exampleGroups: ExampleGroup[] = [
  {
    title: "Mobility",
    examples: [
      {
        title: "Planner Mixer",
        description:
          "Stream travel results between two locations in real time.",
        href: "/mobility/planner-mixer",
      },
    ],
  },
];
