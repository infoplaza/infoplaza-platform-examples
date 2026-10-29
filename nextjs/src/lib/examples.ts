import type { IconName } from "@/components/example-icon";

export const GITHUB_REPO_URL =
  "https://github.com/infoplaza/infoplaza-platform-examples";

export interface Example {
  title: string;
  description: string;
  href: string;
  /** The drawing shown beside it in the menu and on the overview. */
  icon: IconName;
}

export interface ExampleGroup {
  title: string;
  /** The brand colour its cards wear on the overview. */
  accent: "primary" | "secondary" | "marine" | "dark";
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
    accent: "primary",
    examples: [
      {
        title: "Nearby",
        description:
          "Pick a spot on the map and a radius to find the place around it.",
        href: "/geo/nearby",
        icon: "pin",
      },
      {
        title: "Search",
        description:
          "Search for a place by name and see every match listed and mapped.",
        href: "/geo/search",
        icon: "search",
      },
    ],
  },
  {
    title: "Weather",
    accent: "secondary",
    examples: [
      {
        title: "Forecast",
        description:
          "Pick a spot on the map for its weather by the minute, hour, daypart and day.",
        href: "/weather/forecast",
        icon: "sun",
      },
      {
        title: "Climate",
        description:
          "Pick a location on the map to see the temperature, rain, sun and wind of an average year there.",
        href: "/weather/climate",
        icon: "thermometer",
      },
      {
        title: "Warnings",
        description:
          "See the warning areas across Europe, and pick a spot to read the warnings there.",
        href: "/weather/warnings",
        icon: "warning",
      },
      {
        title: "Observations",
        description:
          "Read what weather stations, buoys and aircraft measured, now and over the last readings.",
        href: "/weather/observations",
        icon: "gauge",
      },
      {
        title: "Tropical Storms",
        description:
          "Every active hurricane, typhoon and cyclone on a globe, with its track and forecast cone.",
        href: "/weather/storms",
        icon: "hurricane",
      },
      {
        title: "Maps",
        description:
          "Pan a map of the weather models, drawn by the platform component library.",
        href: "/weather/maps",
        icon: "layers",
      },
      {
        title: "Charts",
        description:
          "Read the models at a point as a table, as charts and as an ensemble spread.",
        href: "/weather/charts",
        icon: "chart",
      },
    ],
  },
  {
    title: "Marine",
    accent: "marine",
    examples: [
      {
        title: "Ports",
        description:
          "Click a port on the sea chart to see how deep it is and what it can handle.",
        href: "/marine/ports",
        icon: "anchor",
      },
      {
        title: "Shipping",
        description:
          "Lay out a voyage on the sea chart and read the wind, sea and swell along it.",
        href: "/marine/shipping",
        icon: "ship",
      },
    ],
  },
  {
    title: "Mobility",
    accent: "dark",
    examples: [
      {
        title: "Traffic",
        description:
          "Live jams, roadworks and diversions on a map and in a list.",
        href: "/mobility/traffic",
        icon: "trafficLight",
      },
      {
        title: "Transit Planner",
        description:
          "Stream travel results between two locations in real time.",
        href: "/mobility/transit-planner",
        icon: "route",
      },
      {
        title: "Transit Stops",
        description:
          "Pick a spot on the map to find transit stops and their departures.",
        href: "/mobility/transit-stops",
        icon: "bus",
      },
    ],
  },
];
