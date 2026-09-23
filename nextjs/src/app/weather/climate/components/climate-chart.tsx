"use client";

import {
  monthAbbreviation,
  periodLabel,
  sunHoursPerDay,
  type ClimatePeriod,
  type Granularity,
} from "../utils";

/**
 * The climate year as a bar chart, one bar per period.
 *
 * Everything is drawn as plain SVG in a fixed viewBox that scales to the
 * width it is given, so the same component handles 12 monthly bars and 36
 * ten-day ones without a chart library. Which numbers a bar stands for is
 * decided by the metric passed in.
 *
 * Temperature is the odd one out: its bar is a range, from the average daily
 * low to the average daily high, and takes its colour from the middle of that
 * range. The others start at zero.
 */

export type Metric = "temperature" | "precipitation" | "sunshine" | "wind";

/**
 * The viewBox is close to the width the chart is actually shown at, so the
 * text in it lands near its nominal size instead of being scaled down with
 * everything else.
 */
const VIEW_WIDTH = 400;
/** The same for every metric, so the four charts line up side by side. */
const VIEW_HEIGHT = 150;
const PADDING = { top: 10, right: 4, bottom: 18, left: 26 };
const TICK_COUNT = 4;
const MAX_BAR_WIDTH = 16;

const PRECIPITATION_COLOR = "#3b82f6";
const SUNSHINE_COLOR = "#f59e0b";
const WIND_SPEED_COLOR = "#475569";
const WIND_GUST_COLOR = "#cbd5e1";

/**
 * Colour stops the temperature bars interpolate between, from freezing blue to
 * hot red. Anything below or above the ends keeps the end colour. The two pale
 * stops in the middle are what keeps a mild 8° from mixing into mud on the way
 * from blue to amber.
 */
const TEMPERATURE_STOPS: [number, string][] = [
  [-20, "#1e3a8a"],
  [-5, "#3b82f6"],
  [4, "#bae6fd"],
  [12, "#fde68a"],
  [20, "#f59e0b"],
  [28, "#ea580c"],
  [36, "#b91c1c"],
];

interface ClimateChartProps {
  periods: ClimatePeriod[];
  granularity: Granularity;
  metric: Metric;
}

export function ClimateChart({
  periods,
  granularity,
  metric,
}: ClimateChartProps) {
  const config = METRICS[metric];
  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = PADDING.top + plotHeight;

  // Every bar the chart draws, as a plain value range so the scale below does
  // not have to know which metric it is looking at.
  const bars = periods.map((period) => config.bar(period));
  const scale = niceScale(
    Math.min(...bars.map((bar) => bar.from)),
    // The gust reaches above its bar, so it decides the top of the axis.
    Math.max(...bars.map((bar) => Math.max(bar.to, bar.behind ?? bar.to))),
  );

  const slot = plotWidth / Math.max(periods.length, 1);
  const barWidth = Math.min(slot * 0.62, MAX_BAR_WIDTH);
  const y = (value: number) =>
    baseline - ((value - scale.min) / (scale.max - scale.min)) * plotHeight;
  const slotCenter = (index: number) => PADDING.left + slot * (index + 0.5);

  return (
    <figure className="min-w-0 rounded-lg border border-cloud-dark bg-white p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-dark">{config.title}</h3>
        <span className="text-xs text-dark/50">{config.unit}</span>
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label={`${config.title} per period`}
      >
        {/* Grid and the value it stands for, one per tick. */}
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
              className="fill-dark/50 text-[9px] tabular-nums"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {periods.map((period, index) => {
          const bar = bars[index];
          const top = y(bar.to);
          const bottom = y(bar.from);
          const x = slotCenter(index) - barWidth / 2;

          return (
            <g key={`${period.month}-${period.period}`}>
              {/* A column-wide target so the tooltip follows the whole slot,
                  not just the bar itself. It sits first so it stays behind. */}
              <rect
                x={PADDING.left + slot * index}
                y={PADDING.top}
                width={slot}
                height={plotHeight}
                className="fill-transparent hover:fill-dark/5"
              >
                <title>
                  {`${periodLabel(period, granularity)} · ${config.tooltip(period)}`}
                </title>
              </rect>

              {/* The wind gust sits behind its own bar, as the headroom above
                  the average wind speed. */}
              {bar.behind !== undefined && (
                <rect
                  x={x}
                  y={y(bar.behind)}
                  width={barWidth}
                  height={Math.max(bottom - y(bar.behind), 1)}
                  rx={Math.min(barWidth / 2, 3)}
                  fill={WIND_GUST_COLOR}
                />
              )}

              <rect
                x={x}
                y={top}
                width={barWidth}
                height={Math.max(bottom - top, 2)}
                rx={Math.min(barWidth / 2, 3)}
                fill={config.color(period)}
              />
            </g>
          );
        })}

        {/* One label per month: under its bar when the year is split by month,
            under the middle of the group when it is split any finer. */}
        {monthTicks(periods).map(({ month, from, to }) => (
          <text
            key={month}
            x={(slotCenter(from) + slotCenter(to)) / 2}
            y={VIEW_HEIGHT - 6}
            textAnchor="middle"
            className="fill-dark/70 text-[9px]"
          >
            {monthAbbreviation(month)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** What one bar covers: from-to, plus an optional lighter bar behind it. */
interface Bar {
  from: number;
  to: number;
  behind?: number;
}

interface MetricConfig {
  title: string;
  unit: string;
  bar(period: ClimatePeriod): Bar;
  color(period: ClimatePeriod): string;
  tooltip(period: ClimatePeriod): string;
}

const METRICS: Record<Metric, MetricConfig> = {
  temperature: {
    title: "Temperature",
    unit: "average daily low to high, °C",
    bar: (period) => ({
      from: period.temperatureLow,
      to: period.temperatureHigh,
    }),
    color: (period) =>
      temperatureColor((period.temperatureLow + period.temperatureHigh) / 2),
    tooltip: (period) =>
      `${period.temperatureLow.toFixed(1)}° to ${period.temperatureHigh.toFixed(1)}°`,
  },
  precipitation: {
    title: "Precipitation",
    unit: "total over the period, mm",
    bar: (period) => ({ from: 0, to: period.precipitationSum }),
    color: () => PRECIPITATION_COLOR,
    tooltip: (period) => `${period.precipitationSum.toFixed(1)} mm`,
  },
  sunshine: {
    title: "Sunshine",
    unit: "average per day, hours",
    bar: (period) => ({ from: 0, to: sunHoursPerDay(period) }),
    color: () => SUNSHINE_COLOR,
    tooltip: (period) => `${sunHoursPerDay(period).toFixed(1)} h per day`,
  },
  wind: {
    title: "Wind",
    unit: "average speed and gust, m/s",
    bar: (period) => ({
      from: 0,
      to: period.windSpeed,
      behind: period.windGust,
    }),
    color: () => WIND_SPEED_COLOR,
    tooltip: (period) =>
      `${period.windSpeed.toFixed(1)} m/s, gusting ${period.windGust.toFixed(1)} m/s`,
  },
};

/** Where each month starts and ends in the list of periods. */
function monthTicks(periods: ClimatePeriod[]) {
  const groups: { month: number; from: number; to: number }[] = [];
  periods.forEach((period, index) => {
    const last = groups[groups.length - 1];
    if (last && last.month === period.month) last.to = index;
    else groups.push({ month: period.month, from: index, to: index });
  });
  return groups;
}

/** An axis that ends on round numbers, with the ticks that go with it. */
function niceScale(min: number, max: number) {
  const step = niceStep((max - min || 1) / TICK_COUNT);
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

/** Axis labels stay short: whole numbers unless the step is finer than one. */
function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** A temperature, as a colour from the stops above. */
function temperatureColor(celsius: number): string {
  const first = TEMPERATURE_STOPS[0];
  const last = TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1];
  if (celsius <= first[0]) return first[1];
  if (celsius >= last[0]) return last[1];

  for (let index = 1; index < TEMPERATURE_STOPS.length; index += 1) {
    const [toValue, toColor] = TEMPERATURE_STOPS[index];
    if (celsius > toValue) continue;
    const [fromValue, fromColor] = TEMPERATURE_STOPS[index - 1];
    return mixColors(
      fromColor,
      toColor,
      (celsius - fromValue) / (toValue - fromValue),
    );
  }
  return last[1];
}

/** Blends two "#rrggbb" colours, `amount` of the way from the first to the second. */
function mixColors(from: string, to: string, amount: number): string {
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * amount);
  });
  return `rgb(${channels.join(" ")})`;
}
