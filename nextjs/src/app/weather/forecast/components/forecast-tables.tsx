import {
  capitalize,
  compassPoint,
  formatDay,
  formatFraction,
  formatIntensity,
  formatTemperature,
  formatTime,
  formatUvIndex,
  formatVisibility,
  formatWind,
  groupByDay,
  MISSING,
  temperatureColor,
  type Day,
  type Daypart,
  type Hour,
} from "../utils";
import { conditionLabel, WeatherIcon } from "./weather-icon";

/**
 * The hourly, daypartly and daily blocks, as three tables over one set of
 * parts.
 *
 * They describe the same weather at three zoom levels and carry nearly the
 * same fields, so the cells below are shared and each table only decides
 * which of them to show and what the first column says. The hourly and
 * daypartly tables run over more than one day, so both are split by day with
 * a header row; the daily table is that split.
 *
 * Every value is written out. The icon beside it is decoration, and a field
 * the API left out shows a dash rather than an empty cell, so a gap in the
 * data reads as a gap rather than as a rendering slip.
 */

/* -------------------------------------------------------------------------
 * Hourly
 * ---------------------------------------------------------------------- */

interface HourlyTableProps {
  hours: Hour[];
  timezone: string;
  /** The moment the API calls now, used to mark the hour it falls in. */
  now: number;
}

export function HourlyTable({ hours, timezone, now }: HourlyTableProps) {
  const days = groupByDay(hours, timezone);

  return (
    <Table
      head={
        <HeadRow first="Hour">
          <Th>Temp</Th>
          <Th>Feels</Th>
          <Th>Precip</Th>
          <Th>Chance</Th>
          <Th>Wind</Th>
          <Th>Gusts</Th>
          <Th>Cloud</Th>
          <Th>UV</Th>
        </HeadRow>
      }
    >
      {days.map((day) => (
        <tbody key={day.key} className="border-b border-cloud last:border-0">
          <DayRow label={formatDay(day.time, timezone, now)} />
          {day.periods.map((hour) => (
            <Row
              key={hour.time}
              label={formatTime(hour.time, timezone)}
              // The hour the current moment falls in starts within the hour
              // before it, so its own hour is the one it has not passed yet.
              current={now >= hour.time && now < hour.time + 3600}
              icon={hour.iconExtended}
            >
              <Td>{formatTemperature(hour.temperature)}</Td>
              <Td muted>{formatTemperature(hour.apparentTemperature)}</Td>
              <Td muted={!hour.precipIntensity}>
                {formatIntensity(hour.precipIntensity)}
              </Td>
              <Td muted>{formatFraction(hour.precipProbability)}</Td>
              <Td>
                {formatWind(hour.windSpeed)}{" "}
                <span className="text-dark/50">
                  {compassPoint(hour.windBearing)}
                </span>
              </Td>
              <Td muted>{formatWind(hour.windGust)}</Td>
              <Td muted>{formatFraction(hour.cloudCover)}</Td>
              <Td muted>{formatUvIndex(hour.uvIndex)}</Td>
            </Row>
          ))}
        </tbody>
      ))}
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Dayparts
 * ---------------------------------------------------------------------- */

interface DaypartTableProps {
  dayparts: Daypart[];
  timezone: string;
  now: number;
}

export function DaypartTable({
  dayparts,
  timezone,
  now,
}: DaypartTableProps) {
  // A daypart is stamped with the day it is counted under, not the moment it
  // begins, and a night is counted under the day it ends on — so the night
  // that follows this evening arrives stamped tomorrow. Grouping on that
  // timestamp therefore reproduces the API's own split rather than second
  // guessing it.
  const days = groupByDay(dayparts, timezone);

  return (
    <Table
      head={
        <HeadRow first="Daypart">
          <Th>Temp</Th>
          <Th>Precip</Th>
          <Th>Chance</Th>
          <Th>Wind</Th>
          <Th>Gusts</Th>
          <Th>Cloud</Th>
          <Th>UV</Th>
          <Th>Visibility</Th>
        </HeadRow>
      }
    >
      {days.map((day) => (
        <tbody key={day.key} className="border-b border-cloud last:border-0">
          <DayRow label={formatDay(day.time, timezone, now)} />
          {day.periods.map((daypart) => (
            <Row
              key={`${daypart.time}-${daypart.name}`}
              label={capitalize(daypart.name)}
              icon={daypart.iconExtended}
            >
              <Td>{formatTemperature(daypart.temperature)}</Td>
              <Td muted={!daypart.precipIntensity}>
                {formatIntensity(daypart.precipIntensity)}
              </Td>
              <Td muted>{formatFraction(daypart.precipProbability)}</Td>
              <Td>
                {formatWind(daypart.windSpeed)}{" "}
                <span className="text-dark/50">
                  {compassPoint(daypart.windBearing)}
                </span>
              </Td>
              <Td muted>{formatWind(daypart.windGust)}</Td>
              <Td muted>{formatFraction(daypart.cloudCover)}</Td>
              <Td muted>{formatUvIndex(daypart.uvIndex)}</Td>
              <Td muted>{formatVisibility(daypart.visibility)}</Td>
            </Row>
          ))}
        </tbody>
      ))}
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Daily
 * ---------------------------------------------------------------------- */

interface DailyTableProps {
  days: Day[];
  timezone: string;
  now: number;
}

export function DailyTable({ days, timezone, now }: DailyTableProps) {
  // Every bar is drawn against the same span, so the days can be compared to
  // each other rather than each to itself.
  const lows = days.map((day) => day.temperatureLow).filter(isNumber);
  const highs = days.map((day) => day.temperatureHigh).filter(isNumber);
  const span =
    lows.length > 0 && highs.length > 0
      ? { min: Math.min(...lows), max: Math.max(...highs) }
      : null;

  return (
    <Table
      head={
        <HeadRow first="Day">
          <Th align="left" className="w-56">
            Low to high
          </Th>
          <Th>Precip</Th>
          <Th>Chance</Th>
          <Th>Wind</Th>
          <Th>Cloud</Th>
          <Th>UV</Th>
        </HeadRow>
      }
    >
      <tbody>
        {days.map((day) => (
          <Row
            key={day.time}
            label={formatDay(day.time, timezone, now)}
            icon={day.iconExtended}
          >
            <td className="py-2.5 pr-4">
              <TemperatureRange
                low={day.temperatureLow}
                high={day.temperatureHigh}
                span={span}
              />
            </td>
            <Td muted={!day.precipIntensity}>
              {formatIntensity(day.precipIntensity)}
            </Td>
            <Td muted>{formatFraction(day.precipProbability)}</Td>
            <Td>
              {formatWind(day.windSpeed)}{" "}
              <span className="text-dark/50">
                {compassPoint(day.windBearing)}
              </span>
            </Td>
            <Td muted>{formatFraction(day.cloudCover)}</Td>
            <Td muted>{formatUvIndex(day.uvIndex)}</Td>
          </Row>
        ))}
      </tbody>
    </Table>
  );
}

/**
 * The day's low and high, written out either side of the stretch of the week
 * they cover. The bar takes its colour from the middle of the range, off the
 * same stops the Climate example colours its temperature bars with.
 */
function TemperatureRange({
  low,
  high,
  span,
}: {
  low: number | undefined;
  high: number | undefined;
  span: { min: number; max: number } | null;
}) {
  if (low === undefined || high === undefined || !span) {
    return <span className="text-sm text-dark/50">{MISSING}</span>;
  }

  const width = Math.max(span.max - span.min, 1);
  const left = ((low - span.min) / width) * 100;
  const length = ((high - low) / width) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-right text-sm text-dark/70 tabular-nums">
        {formatTemperature(low)}
      </span>
      <span className="relative h-1.5 flex-1 rounded-full bg-cloud-dark">
        <span
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${left}%`,
            // A day whose low and high are the same still needs to be visible.
            width: `max(${length}%, 6px)`,
            background: temperatureColor((low + high) / 2),
          }}
        />
      </span>
      <span className="w-9 shrink-0 text-sm text-dark tabular-nums">
        {formatTemperature(high)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * The parts the three tables are built from
 * ---------------------------------------------------------------------- */

/** The frame: a scrolling wrapper, and a header that stays put inside it. */
function Table({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border border-cloud-dark bg-white">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        {head}
        {children}
      </table>
    </div>
  );
}

function HeadRow({
  first,
  children,
}: {
  first: string;
  children: React.ReactNode;
}) {
  return (
    <thead className="sticky top-0 z-10 bg-white">
      <tr className="border-b border-cloud-dark text-xs text-dark/70">
        <th scope="col" className="py-2 pl-4 pr-3 text-left font-medium">
          {first}
        </th>
        {/* The icon column has no heading of its own: it repeats the
            condition next to it, which does. */}
        <th scope="col" className="w-8" />
        <th scope="col" className="py-2 pr-4 text-left font-medium">
          Condition
        </th>
        {children}
      </tr>
    </thead>
  );
}

function Th({
  children,
  align = "right",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`py-2 pr-4 font-medium ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * The band that names the day the rows under it belong to. Both tables that
 * use it are eleven columns wide: the label, the icon, the condition and
 * eight readings.
 */
const COLUMNS = 11;

function DayRow({ label }: { label: string }) {
  return (
    <tr className="bg-cloud">
      <th
        scope="colgroup"
        colSpan={COLUMNS}
        className="py-1.5 pl-4 pr-3 text-left text-xs font-medium text-dark/70"
      >
        {label}
      </th>
    </tr>
  );
}

function Row({
  label,
  icon,
  current = false,
  children,
}: {
  label: string;
  icon: string | undefined;
  /** Marks the period the current moment falls in. */
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className={current ? "bg-marine/5" : undefined}>
      <th
        scope="row"
        className={`whitespace-nowrap py-2.5 pl-4 pr-3 text-left font-normal tabular-nums ${
          current ? "text-marine" : "text-dark"
        }`}
      >
        {label}
      </th>
      <td className="py-1">
        <WeatherIcon code={icon} size={28} />
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 text-dark/80">
        {conditionLabel(icon)}
      </td>
      {children}
    </tr>
  );
}

function Td({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap py-2.5 pr-4 text-right tabular-nums ${
        muted ? "text-dark/70" : "text-dark"
      }`}
    >
      {children}
    </td>
  );
}

function isNumber(value: number | undefined): value is number {
  return value !== undefined;
}
