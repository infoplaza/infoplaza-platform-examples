"use client";

import {
  formatFraction,
  formatIntensity,
  formatTime,
  precipitationSummary,
  type Minute,
} from "../utils";

/**
 * The minutely block, as two charts over one timeline.
 *
 * It is the only block with nothing but precipitation in it, and it holds two
 * numbers that answer different questions: how hard it would come down, and
 * how likely that is at all. Those are different units, so they get a panel
 * each rather than two lines on one axis — stacked, sharing the x-axis under
 * them, so a peak in one lines up with the other.
 *
 * Everything is plain SVG in a fixed viewBox that scales to the width it is
 * given, the same way the Climate example draws its year.
 *
 * The steps are five minutes apart, not one: `max_minutely` is a number of
 * minutes and the API answers it in five-minute steps, so 60 minutes comes
 * back as twelve of them.
 */

/**
 * The viewBox is close to the width the chart is actually shown at, so the
 * text in it lands near its nominal size instead of being scaled with
 * everything else.
 */
const VIEW_WIDTH = 900;
const PADDING = { top: 18, right: 8, bottom: 20, left: 38 };
/** Height of the intensity plot, the taller of the two. */
const INTENSITY_HEIGHT = 116;
/** Height of the probability plot. */
const CHANCE_HEIGHT = 64;
/** Space between the two plots, which the second panel's label sits in. */
const GAP = 30;
const HEIGHT =
  PADDING.top + INTENSITY_HEIGHT + GAP + CHANCE_HEIGHT + PADDING.bottom;

const MAX_BAR_WIDTH = 26;
/** One label per this many steps, so they never collide. */
const LABEL_EVERY = 3;
/**
 * The smallest top the intensity axis will take. Without it a drizzle of
 * 0.05 mm/h would fill the panel and read as a downpour.
 */
const MIN_INTENSITY_TOP = 1;

const PRECIPITATION_COLOR = "#3b82f6";
const GRID_COLOR = "#f2f2ed";
const AXIS_COLOR = "#d0d0c7";

interface PrecipitationChartProps {
  minutes: Minute[];
  /** IANA zone the times are read in. */
  timezone: string;
}

export function PrecipitationChart({
  minutes,
  timezone,
}: PrecipitationChartProps) {
  if (minutes.length === 0) {
    return (
      <p className="text-sm text-dark/70">
        No minutely precipitation forecast for this location. Asking for fewer
        than five minutes does the same thing, since that is shorter than one
        step.
      </p>
    );
  }

  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const slot = plotWidth / minutes.length;
  const barWidth = Math.min(slot * 0.62, MAX_BAR_WIDTH);
  const slotCenter = (index: number) => PADDING.left + slot * (index + 0.5);

  const intensityTop = niceCeiling(
    Math.max(
      MIN_INTENSITY_TOP,
      ...minutes.map((minute) => minute.precipIntensity ?? 0),
    ),
  );
  const intensityBase = PADDING.top + INTENSITY_HEIGHT;
  const intensityY = (value: number) =>
    intensityBase - (value / intensityTop) * INTENSITY_HEIGHT;

  const chanceTop = PADDING.top + INTENSITY_HEIGHT + GAP;
  const chanceBase = chanceTop + CHANCE_HEIGHT;
  const chanceY = (fraction: number) => chanceBase - fraction * CHANCE_HEIGHT;

  // One point per step, in the middle of the slot it stands for, run flat out
  // to both edges: the first and last steps cover their whole slot, so the
  // line has no business sloping away from them.
  const chancePoints = minutes.map((minute, index) => ({
    x: slotCenter(index),
    y: chanceY(minute.precipProbability ?? 0),
  }));
  const last = chancePoints[chancePoints.length - 1];
  const edged = [
    { x: PADDING.left, y: chancePoints[0].y },
    ...chancePoints,
    { x: VIEW_WIDTH - PADDING.right, y: last.y },
  ];
  const chanceLine = edged
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  // The same line, closed off along the baseline so it can be filled.
  const chanceArea = [
    `M ${PADDING.left} ${chanceBase}`,
    ...edged.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
    `L ${VIEW_WIDTH - PADDING.right} ${chanceBase}`,
    "Z",
  ].join(" ");

  return (
    <figure className="min-w-0">
      <figcaption className="text-sm text-dark">
        {precipitationSummary(minutes, timezone)}
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label="Precipitation intensity and probability over the coming hour"
      >
        <text
          x={PADDING.left}
          y={PADDING.top - 7}
          className="fill-dark/50 text-[11px]"
        >
          Intensity, mm/h
        </text>

        {/* Intensity grid: a line at the top of the axis and one halfway. */}
        {[intensityTop, intensityTop / 2, 0].map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={VIEW_WIDTH - PADDING.right}
              y1={intensityY(tick)}
              y2={intensityY(tick)}
              stroke={tick === 0 ? AXIS_COLOR : GRID_COLOR}
            />
            <text
              x={PADDING.left - 6}
              y={intensityY(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-dark/50 text-[10px] tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {minutes.map((minute, index) => {
          const intensity = minute.precipIntensity ?? 0;
          const top = intensityY(intensity);
          return (
            <rect
              key={minute.time}
              x={slotCenter(index) - barWidth / 2}
              y={top}
              width={barWidth}
              // A step with nothing in it keeps a sliver on the baseline, so
              // the timeline stays readable as a row of steps.
              height={Math.max(intensityBase - top, 2)}
              rx={Math.min(barWidth / 2, 4)}
              fill={PRECIPITATION_COLOR}
            />
          );
        })}

        <text
          x={PADDING.left}
          y={chanceTop - 7}
          className="fill-dark/50 text-[11px]"
        >
          Chance of precipitation, %
        </text>

        {/* Probability runs 0-100% whatever the data does, so its grid is
            fixed and the panel keeps the same meaning between locations. */}
        {[1, 0.5, 0].map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={VIEW_WIDTH - PADDING.right}
              y1={chanceY(tick)}
              y2={chanceY(tick)}
              stroke={tick === 0 ? AXIS_COLOR : GRID_COLOR}
            />
            <text
              x={PADDING.left - 6}
              y={chanceY(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-dark/50 text-[10px] tabular-nums"
            >
              {tick * 100}
            </text>
          </g>
        ))}

        <path d={chanceArea} fill={PRECIPITATION_COLOR} fillOpacity={0.12} />
        <polyline
          points={chanceLine}
          fill="none"
          stroke={PRECIPITATION_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* One target per step, spanning both panels so a step can be read
            off either of them. They come last to sit above the marks. */}
        {minutes.map((minute, index) => (
          <rect
            key={`hover-${minute.time}`}
            x={PADDING.left + slot * index}
            y={PADDING.top}
            width={slot}
            height={chanceBase - PADDING.top}
            className="fill-transparent hover:fill-dark/5"
          >
            <title>{tooltip(minute, timezone)}</title>
          </rect>
        ))}

        {/* The shared timeline, under the lower panel. */}
        {minutes.map((minute, index) =>
          index % LABEL_EVERY === 0 ? (
            <text
              key={`label-${minute.time}`}
              x={slotCenter(index)}
              y={HEIGHT - 6}
              textAnchor="middle"
              className="fill-dark/70 text-[10px] tabular-nums"
            >
              {formatTime(minute.time, timezone)}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/** "14:35 · 0.4 mm/h rain · 65% chance" */
function tooltip(minute: Minute, timezone: string): string {
  const parts = [formatTime(minute.time, timezone)];
  const intensity = minute.precipIntensity ?? 0;
  parts.push(
    intensity > 0
      ? `${formatIntensity(intensity)} ${minute.precipType ?? ""}`.trim()
      : "nothing falling",
  );
  parts.push(`${formatFraction(minute.precipProbability ?? 0)} chance`);
  return parts.join(" · ");
}

/** The nearest 1, 2, 5 or 10 (times a power of ten) at or above `value`. */
function niceCeiling(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = [1, 2, 5, 10].find((candidate) => normalized <= candidate);
  return (step ?? 10) * magnitude;
}

/** Axis labels stay short: whole numbers unless the step is finer than one. */
function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
