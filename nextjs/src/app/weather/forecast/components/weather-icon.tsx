import { condition } from "../conditions";

/**
 * The picture for an `iconExtended` code.
 *
 * The API sends the code, not the artwork, so the SVGs live in
 * public/weather-icons/ and the code is the filename. They come from the
 * extended weather icon set on
 * https://platform.infoplaza.com/docs/assets/icon-sets — the light-background
 * variant, since this example is a light page; the same download ships a dark
 * one.
 *
 * The icon is decorative: everywhere it appears the condition is also written
 * out beside it, so it carries an empty alt and stays out of the reading
 * order. A code with no artwork leaves the space empty rather than showing a
 * broken image, which is what a forecast block without an icon should look
 * like.
 */

interface WeatherIconProps {
  /** An extended icon code, e.g. "A002D". */
  code: string | undefined;
  /** Rendered size in pixels, square. */
  size?: number;
  className?: string;
}

export function WeatherIcon({ code, size = 32, className }: WeatherIconProps) {
  if (!code || !condition(code)) {
    return <span style={{ width: size, height: size }} className={className} />;
  }

  return (
    // A plain <img> rather than next/image: this is a static SVG from public/
    // picked by name at runtime, and there is nothing to optimise about it.
    <img
      src={`/weather-icons/${code}.svg`}
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

/** The wording that goes with an icon code, or an empty string. */
export function conditionLabel(code: string | undefined): string {
  return condition(code)?.label ?? "";
}

/** The longer wording that goes with an icon code, or an empty string. */
export function conditionDescription(code: string | undefined): string {
  return condition(code)?.description ?? "";
}
