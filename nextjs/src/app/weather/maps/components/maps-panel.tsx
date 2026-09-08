"use client";

import dynamic from "next/dynamic";
import { usePlatformProxyLog } from "@/lib/platform-proxy-log";

/**
 * The example around the map: the log of what the components ask for, and the
 * map itself once the browser has it.
 *
 * The map is loaded on the client only. It needs a browser for more than
 * MapLibre alone: the package draws its layers with Deck.gl on a WebGL
 * canvas, which cannot be rendered on the server at all.
 */
const WeatherMap = dynamic(() => import("./weather-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

export function MapsPanel() {
  // The components fetch for themselves, so their calls are collected from
  // the server instead of arriving with an answer to something this page
  // asked. Everything they ask for lands in the drawer on the right.
  usePlatformProxyLog();

  return <WeatherMap />;
}
