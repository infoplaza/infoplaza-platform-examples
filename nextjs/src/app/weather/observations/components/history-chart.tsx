import {
  fieldLabel,
  formatNumber,
  formatObserved,
  type Observation,
} from "../utils";

/**
 * One value of a station over its most recent readings, as a line.
 *
 * Plain SVG in a fixed viewBox that scales to the width it is given, like the
 * charts in the Climate example, so no chart library is needed. The readings
 * arrive newest first and are drawn oldest first. A reading without the value
 * breaks the line rather than being drawn as zero.
 *
 * The time axis is whatever the readings span: 144 readings are a day at a
 * ten-minute station and nearly five months at a daily one.
 */

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 200;
const PADDING = { top: 12, right: 8, bottom: 22, left: 40 };
const TICK_COUNT = 4;
const TIME_TICKS = 5;
const LINE_COLOR = "#0070de";

/** Beyond this many points the dots crowd into the line, so only it is drawn. */
const MAX_DOTS = 72;

export function HistoryChart({
  observations,
  valueKey,
  unit,
}: {
  /** Newest first, as the API returns them. */
  observations: Observation[];
  valueKey: string;
  unit: string | null;
}) {
  const points = observations
    .map((observation) => ({
      time: Date.parse(observation.date),
      date: observation.date,
      value: observation.values[valueKey],
    }))
    .sort((one, other) => one.time - other.time)
    .map((point) => ({
      ...point,
      value:
        typeof point.value === "number" && Number.isFinite(point.value)
          ? point.value
          : null,
    }));

  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  if (values.length === 0) {
    return (
      <p className="text-sm text-dark/70">
        None of these readings hold {fieldLabel(valueKey).toLowerCase()}.
      </p>
    );
  }

  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const first = points[0].time;
  const last = points[points.length - 1].time;
  const span = Math.max(last - first, 1);

  const x = (time: number) =>
    points.length === 1
      ? PADDING.left + plotWidth / 2
      : PADDING.left + ((time - first) / span) * plotWidth;
  const y = (value: number) =>
    PADDING.top +
    plotHeight -
    ((value - scale.min) / (scale.max - scale.min)) * plotHeight;

  // One path, lifted wherever a reading lacks the value.
  let path = "";
  let drawing = false;
  for (const point of points) {
    if (point.value === null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? "L" : "M"}${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`;
    drawing = true;
  }

  const isolated = (index: number) =>
    (points[index - 1]?.value ?? null) === null &&
    (points[index + 1]?.value ?? null) === null;

  // Each point owns the strip halfway to its neighbours, so hovering anywhere
  // on the chart names the reading under the cursor.
  const strips = points.map((point, index) => {
    const left =
      index === 0
        ? PADDING.left
        : (x(points[index - 1].time) + x(point.time)) / 2;
    const right =
      index === points.length - 1
        ? VIEW_WIDTH - PADDING.right
        : (x(point.time) + x(points[index + 1].time)) / 2;
    return { left, width: Math.max(right - left, 0.5) };
  });

  const timeStep = niceTimeStep(span);
  const timeTicks = points.length === 1 ? [first] : roundTimes(first, last, timeStep);
  // Ticks less than a day apart are read by the hour, the rest by the date.
  const byHour = timeStep < DAY;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${fieldLabel(valueKey)} over the last ${points.length} readings`}
    >
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={VIEW_WIDTH - PADDING.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? "#d0d0c7" : "#f2f2ed"}
          />
          <text
            x={PADDING.left - 6}
            y={y(tick)}
            dy="0.32em"
            textAnchor="end"
            className="fill-dark/50 text-[10px] tabular-nums"
          >
            {formatNumber(tick)}
          </text>
        </g>
      ))}

      {timeTicks.map((time) => (
        <g key={time}>
          <line
            x1={x(time)}
            x2={x(time)}
            y1={PADDING.top + plotHeight}
            y2={PADDING.top + plotHeight + 4}
            stroke="#d0d0c7"
          />
          <text
            x={x(time)}
            y={VIEW_HEIGHT - 6}
            textAnchor="middle"
            className="fill-dark/70 text-[10px] tabular-nums"
          >
            {formatTimeTick(time, byHour)}
          </text>
        </g>
      ))}

      <path
        d={path}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point, index) => (
        <g key={point.date}>
          {/* A reading with no neighbour to join gets its dot regardless,
              or it would not be drawn at all. */}
          {point.value !== null &&
            (points.length <= MAX_DOTS || isolated(index)) && (
            <circle
              cx={x(point.time)}
              cy={y(point.value)}
              r={2.5}
              fill={LINE_COLOR}
            />
          )}
          <rect
            x={strips[index].left}
            y={PADDING.top}
            width={strips[index].width}
            height={plotHeight}
            className="fill-transparent hover:fill-dark/5"
          >
            <title>
              {`${formatObserved(point.date)} · ${
                point.value === null
                  ? "not measured"
                  : `${formatNumber(point.value)}${unit ? ` ${unit}` : ""}`
              }`}
            </title>
          </rect>
        </g>
      ))}
    </svg>
  );
}

/** "13:00" for ticks within a day, "19 Oct" for longer. UTC, like the rest. */
function formatTimeTick(time: number, byHour: boolean): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    byHour
      ? { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }
      : { day: "numeric", month: "short", timeZone: "UTC" },
  ).format(new Date(time));
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The steps a time axis is allowed to take, so its ticks fall on round times. */
const TIME_STEPS = [
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
  14 * DAY,
  28 * DAY,
];

/** The smallest round step that fits the span in at most TIME_TICKS ticks. */
function niceTimeStep(span: number): number {
  return (
    TIME_STEPS.find((step) => span / step <= TIME_TICKS) ??
    TIME_STEPS[TIME_STEPS.length - 1]
  );
}

/** Every multiple of `step` (counted in UTC) from `first` to `last`. */
function roundTimes(first: number, last: number, step: number): number[] {
  const times: number[] = [];
  for (let time = Math.ceil(first / step) * step; time <= last; time += step) {
    times.push(time);
  }
  return times;
}

/** An axis that ends on round numbers, with the ticks that go with it. */
function niceScale(min: number, max: number) {
  const step = niceStep((max - min || Math.abs(max) || 1) / TICK_COUNT);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  // Rounding keeps a step like 2.5 from drifting after a dozen additions.
  for (let tick = start; tick <= end + step / 2; tick += step) {
    ticks.push(Math.round(tick * 1000) / 1000);
  }
  return { min: start, max: end === start ? start + step : end, ticks };
}

/** The nearest 1, 2, 2.5 or 5 (times a power of ten) at or above `rough`. */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((candidate) => normalized <= candidate);
  return (step ?? 10) * magnitude;
}
