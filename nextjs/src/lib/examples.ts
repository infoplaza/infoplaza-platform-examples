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
        title: "Traffic",
        description:
          "Live jams, roadworks and diversions on a map and in a list.",
        href: "/mobility/traffic",
      },
      {
        title: "Transit Planner",
        description:
          "Stream travel results between two locations in real time.",
        href: "/mobility/transit-planner",
      },
      {
        title: "Transit Stops",
        description:
          "Pick a spot on the map to find transit stops and their departures.",
        href: "/mobility/transit-stops",
      },
    ],
  },
];
