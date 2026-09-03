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
    title: "Geo",
    examples: [
      {
        title: "Nearby",
        description:
          "Pick a spot on the map to find the places around it, from village to region.",
        href: "/geo/nearby",
      },
      {
        title: "Search",
        description:
          "Search for a place by name and see every match listed and mapped.",
        href: "/geo/search",
      },
    ],
  },
  {
    title: "Weather",
    examples: [
      {
        title: "Forecast",
        description:
          "Pick a spot on the map for its weather by the minute, hour, daypart and day.",
        href: "/weather/forecast",
      },
      {
        title: "Climate",
        description:
          "Pick a location on the map to see the temperature, rain, sun and wind of an average year there.",
        href: "/weather/climate",
      },
      {
        title: "Warnings",
        description:
          "Pick a spot on the map to see the severe weather warned about there.",
        href: "/weather/warnings",
      },
    ],
  },
  {
    title: "Marine",
    examples: [
      {
        title: "Ports",
        description:
          "Click a port on the sea chart to see how deep it is and what it can handle.",
        href: "/marine/ports",
      },
      {
        title: "Shipping",
        description:
          "Lay out a voyage on the sea chart and read the wind, sea and swell along it.",
        href: "/marine/shipping",
      },
    ],
  },
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
