"use client";

import { useEffect, useRef, useState } from "react";
import {
  COLUMNS,
  compassPoint,
  formatCoordinates,
  formatDay,
  formatDistance,
  formatElement,
  formatTime,
  formatValue,
  groupByDay,
  groupByModel,
  indexElements,
  sailedDistances,
  valueAt,
  type Column,
  type ForecastElement,
  type PointForecast,
  type RouteForecast,
} from "../utils";

/**
 * The two tables the example reads its forecasts in.
 *
 * They are the same table twice over, because the two endpoints answer in the
 * same shape: a row is one index into every element's `data` array, and the
 * cells that render those elements are shared. What differs is what a row
 * means. In the route table it is a position — a waypoint, or one of the
 * hourly steps the API puts between them — so it says where the ship is and
 * how far along it has come. In the point table it is a moment at a position
 * that does not move, so it says nothing but the hour.
 *
 * The columns are the readings a bridge works from, which is nine of the two
 * dozen elements the response carries. Clicking a row opens the rest of them
 * underneath it, per model, so nothing that was answered is out of reach.
 *
 * Every value is written out with the unit the API gave the element. A model
 * that had nothing for a row shows a dash rather than an empty cell, so a gap
 * in the data reads as a gap rather than as a rendering slip.
 */

/* -------------------------------------------------------------------------
 * Along the route
 * ---------------------------------------------------------------------- */

interface RouteTableProps {
  route: RouteForecast;
  /** Waypoint index of the selected waypoint, so its row can be marked. */
  selectedWaypoint: number | null;
  onSelectWaypoint(waypointIndex: number): void;
}

export function RouteTable({
  route,
  selectedWaypoint,
  onSelectWaypoint,
}: RouteTableProps) {
  const elements = indexElements(route.elements);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // The rows carry their own index because that is what looks a value up in
  // every element, and grouping by day leaves the flat order behind.
  // The API counts the distance from the last waypoint, so the column adds
  // the legs up for it.
  const sailed = sailedDistances(route.points);
  const rows = route.points.map((point, index) => ({ point, index }));
  const days = groupByDay(rows, (row) => row.point.time);

  /** Waypoints number from one along the voyage; timesteps have no number. */
  let waypointNumber = 0;
  const numbers = new Map<number, number>();
  route.points.forEach((point, index) => {
    if (point.type === "waypoint") numbers.set(index, ++waypointNumber);
  });

  const span = COLUMNS.length + 3;

  return (
    <Table first="Time" extra={["Position", "Sailed"]}>
      {days.map((day) => (
        <tbody key={day.key} className="border-b border-gray-100 last:border-0">
          <DayRow label={formatDay(day.time)} span={span} />
          {day.rows.map(({ point, index }) => {
            const number = numbers.get(index);
            const selected =
              number !== undefined && number - 1 === selectedWaypoint;
            const open = index === openIndex;

            return (
              <RowGroup
                key={`${point.time}-${index}`}
                elements={route.elements}
                index={index}
                open={open}
                span={span}
                onToggle={() => setOpenIndex(open ? null : index)}
                highlighted={selected}
                label={
                  <>
                    {formatTime(point.time)}
                    {number !== undefined && (
                      <WaypointBadge
                        number={number}
                        selected={selected}
                        onClick={() => onSelectWaypoint(number - 1)}
                      />
                    )}
                  </>
                }
              >
                <Td muted={point.type === "timestep"}>
                  {formatCoordinates(point.lat, point.lon)}
                </Td>
                <Td muted>{formatDistance(sailed[index])}</Td>
                <ValueCells elements={elements} index={index} />
              </RowGroup>
            );
          })}
        </tbody>
      ))}
    </Table>
  );
}

/**
 * The number of a waypoint, and the way into its point forecast from the
 * table as well as from the map.
 */
function WaypointBadge({
  number,
  selected,
  onClick,
}: {
  number: number;
  selected: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      // The row underneath opens every element; this asks for something else
      // entirely, so it keeps the click to itself.
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`Point forecast at waypoint ${number}`}
      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
        selected
          ? "bg-blue-600 text-white"
          : "bg-gray-900 text-white hover:bg-gray-700"
      }`}
    >
      {number}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * At one waypoint
 * ---------------------------------------------------------------------- */

interface PointTableProps {
  forecast: PointForecast;
  /** The row the ship is there, when the route knows of one. */
  arrivalIndex: number | null;
}

export function PointTable({ forecast, arrivalIndex }: PointTableProps) {
  const elements = indexElements(forecast.elements);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The endpoint hands over the whole model run, and a run reaches back
   * before it was made: the hours before it are there in `times` with nothing
   * in them. The weather model is what the table leads with, so the forecast
   * starts where that one does — the sea temperature reaching further back
   * out of an older run is not an hour worth a row of its own.
   */
  const first = forecast.times.findIndex(
    (_, index) => valueAt(elements, COLUMNS[0].key, index) !== null,
  );
  const rows = forecast.times
    .map((time, index) => ({ time, index }))
    .slice(first === -1 ? 0 : first)
    .filter((row) =>
      COLUMNS.some(
        (column) => valueAt(elements, column.key, row.index) !== null,
      ),
    );
  const days = groupByDay(rows, (row) => row.time);

  /**
   * A run is a fortnight long and the ship passes somewhere in the middle of
   * it, so the hour it is there is scrolled to rather than left to be found.
   * The table scrolls inside its own box, which is why this moves that box
   * instead of the row: `scrollIntoView` would take the page with it.
   */
  useEffect(() => {
    const container = containerRef.current;
    const row = container?.querySelector<HTMLElement>("[data-highlighted]");
    if (!container || !row) return;

    container.scrollTop +=
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      container.clientHeight / 2;
  }, [arrivalIndex, forecast]);

  const span = COLUMNS.length + 1;

  return (
    <Table first="Hour" containerRef={containerRef}>
      {days.map((day) => (
        <tbody key={day.key} className="border-b border-gray-100 last:border-0">
          <DayRow label={formatDay(day.time)} span={span} />
          {day.rows.map(({ time, index }) => {
            const open = index === openIndex;

            return (
              <RowGroup
                key={time}
                elements={forecast.elements}
                index={index}
                open={open}
                span={span}
                onToggle={() => setOpenIndex(open ? null : index)}
                highlighted={index === arrivalIndex}
                label={
                  <>
                    {formatTime(time)}
                    {index === arrivalIndex && (
                      <span className="ml-2 text-xs font-medium">Aboard</span>
                    )}
                  </>
                }
              >
                <ValueCells elements={elements} index={index} />
              </RowGroup>
            );
          })}
        </tbody>
      ))}
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * The parts both tables are built from
 * ---------------------------------------------------------------------- */

/** A row, and everything the response holds for it once it is opened. */
function RowGroup({
  label,
  elements,
  index,
  open,
  span,
  highlighted,
  onToggle,
  children,
}: {
  label: React.ReactNode;
  /** Every element of the response, for the details underneath. */
  elements: ForecastElement[];
  index: number;
  open: boolean;
  span: number;
  /** The waypoint that is selected, or the hour the ship is there. */
  highlighted: boolean;
  onToggle(): void;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        aria-expanded={open}
        // Read back by the point table, to scroll the hour of the passage
        // into view.
        data-highlighted={highlighted ? "true" : undefined}
        className={`cursor-pointer ${
          highlighted
            ? "bg-blue-50/60"
            : open
              ? "bg-gray-50"
              : "hover:bg-gray-50"
        }`}
      >
        <th
          scope="row"
          className={`whitespace-nowrap py-2 pl-4 pr-3 text-left font-normal tabular-nums ${
            highlighted ? "text-blue-700" : "text-gray-900"
          }`}
        >
          <span
            aria-hidden
            className={`mr-1.5 inline-block text-gray-400 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
          {label}
        </th>
        {children}
      </tr>

      {open && (
        <tr>
          <td colSpan={span} className="border-t border-gray-100 bg-gray-50 p-4">
            <ElementDetails elements={elements} index={index} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Everything the response holds for one row, model by model — including the
 * elements the table has no column of its own for.
 */
function ElementDetails({
  elements,
  index,
}: {
  elements: ForecastElement[];
  index: number;
}) {
  const models = groupByModel(elements);

  // Two columns and no more: the details sit in a cell of the table above
  // them, so a wider grid is something the whole table has to be as wide as,
  // and a four-column one put a scrollbar under every opened row.
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {models.map((group) => (
        <div key={group.model}>
          <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {group.model}
          </h4>
          <dl className="mt-1.5 divide-y divide-gray-200/70 text-sm">
            {group.elements.map((element) => (
              <div
                key={element.key}
                className="flex items-baseline justify-between gap-4 py-1"
              >
                <dt className="text-gray-600">{element.label}</dt>
                <dd
                  className="shrink-0 text-right tabular-nums text-gray-900"
                  title={element.error ?? undefined}
                >
                  {element.error ? (
                    <span className="text-xs text-gray-400">not answered</span>
                  ) : (
                    formatElement(element, element.data[index]?.value ?? null)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** One cell per column, and the direction alongside the value it belongs to. */
function ValueCells({
  elements,
  index,
}: {
  elements: Map<string, ForecastElement>;
  index: number;
}) {
  return (
    <>
      {COLUMNS.map((column) => (
        <ValueCell
          key={column.key}
          column={column}
          element={elements.get(column.key)}
          value={valueAt(elements, column.key, index)}
          direction={valueAt(elements, column.direction, index)}
        />
      ))}
    </>
  );
}

function ValueCell({
  column,
  element,
  value,
  direction,
}: {
  column: Column;
  element: ForecastElement | undefined;
  value: number | null;
  direction: number | null;
}) {
  return (
    <Td muted={value === null}>
      {formatValue(column, element, value)}
      {value !== null && direction !== null && (
        <span
          className="text-gray-400"
          title={`From ${Math.round(direction)}°`}
        >
          {" "}
          {compassPoint(direction)}
        </span>
      )}
    </Td>
  );
}

/** The frame: a scrolling wrapper, and a header that stays put inside it. */
function Table({
  first,
  extra = [],
  containerRef,
  children,
}: {
  first: string;
  /** Columns between the hour and the readings, if the table has any. */
  extra?: string[];
  /** The scrolling box itself, for a table that scrolls itself somewhere. */
  containerRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={containerRef}
      className="max-h-[520px] overflow-auto rounded-lg border border-gray-200"
    >
      {/* Wide enough for its own columns and no wider: a fixed minimum was
          a few dozen pixels past the card the point forecast sits in, which
          bought nothing but a scrollbar. Below that the table keeps its
          columns and the box scrolls. */}
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            <th scope="col" className="py-2 pl-4 pr-3 text-left font-medium">
              {first}
            </th>
            {extra.map((label) => (
              <th
                key={label}
                scope="col"
                className="py-2 pr-4 text-right font-medium"
              >
                {label}
              </th>
            ))}
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="py-2 pr-4 text-right font-medium"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

/** The band that names the day the rows under it belong to. */
function DayRow({ label, span }: { label: string; span: number }) {
  return (
    <tr className="bg-gray-50">
      <th
        scope="colgroup"
        colSpan={span}
        className="py-1.5 pl-4 pr-3 text-left text-xs font-medium text-gray-500"
      >
        {label}
      </th>
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
      className={`whitespace-nowrap py-2 pr-4 text-right tabular-nums ${
        muted ? "text-gray-400" : "text-gray-900"
      }`}
    >
      {children}
    </td>
  );
}
