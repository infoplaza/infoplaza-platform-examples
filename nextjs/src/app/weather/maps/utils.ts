/**
 * Client-side helpers and defaults for the Maps example. Everything the map
 * is opened with lives here, so the component below is only the composition
 * the package asks for.
 */

/**
 * Where the map is looking. What `BaseMap` is given and gives back.
 *
 * A type rather than an interface, because `BaseMap` takes its view state as
 * a `Record<string, unknown>` and only a type alias is assignable to one.
 */
export type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

/** Western Europe, far enough out that a model covers the whole frame. */
export const DEFAULT_VIEW_STATE: ViewState = {
  longitude: 4.9041,
  latitude: 52.3676,
  zoom: 4.5,
};

/**
 * The layer the map opens on.
 *
 * `model: "optimal"` is the Platform picking the best model available for
 * each part of the frame rather than a named one; the rest names the element
 * and the height it is read at. All of it can be changed from the control HUD
 * on the map, which is what the models catalog is loaded for.
 */
export const DEFAULT_WEATHER_CONFIG = {
  model: "optimal",
  element: "temperature",
  run: "latest",
  member: "0",
  level: "2m",
};

/**
 * How tall the map is drawn.
 *
 * The window, less the page around it, because this map carries its own
 * furniture: a panel down one side, a legend and a timebar along the bottom,
 * all of which eat into what is left to look at. The floor is what the map was
 * before, so a short window gets a map that runs past the fold rather than a
 * letterbox. Shared with the placeholder it is loaded behind, so the page does
 * not jump when it arrives.
 */
export const MAP_FRAME_CLASS = "h-[calc(100vh-25rem)] min-h-[560px]";

/** 52.36757 → "52.36757, 4.90411" */
export function formatCoordinates(view: ViewState): string {
  return `${view.latitude.toFixed(5)}, ${view.longitude.toFixed(5)}`;
}
