import {
  basinName,
  categoryMeta,
  formatAge,
  formatMovement,
  formatPosition,
  formatPressure,
  formatSpeed,
  formatTimestamp,
  latestPoint,
  type SpeedUnit,
  type Storm,
} from "../utils";
import { CategoryPill } from "./category-pill";

/**
 * One storm in full: the latest advisory up top, and every position of its
 * track below it, newest first, with the category it had at each.
 */
export function StormDetails({
  storm,
  now,
  unit,
}: {
  storm: Storm;
  now: number;
  unit: SpeedUnit;
}) {
  const latest = latestPoint(storm, now);
  const { current } = storm;

  return (
    <section className="rounded-lg border border-cloud-dark bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CategoryPill category={storm.category} />
            <h2 className="text-lg font-semibold text-dark">{storm.name}</h2>
          </div>
          <p className="mt-1 text-xs text-dark/70">
            {[
              categoryMeta(storm.category).label,
              basinName(storm),
              storm.id,
            ].join(" · ")}
          </p>
        </div>
        <p className="text-right text-xs text-dark/70">
          Last position {formatPosition(latest)}
          <br />
          {formatTimestamp(latest.timestamp)} ({formatAge(latest.timestamp, now)})
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Reading label="Wind" value={formatSpeed(current.windSpeed, unit)} />
        <Reading label="Gusts" value={formatSpeed(current.gustSpeed, unit)} />
        <Reading label="Pressure" value={formatPressure(current.pressure)} />
        <Reading
          label="Moving"
          value={formatMovement(current, unit)}
          arrow={current.movementDirection.degrees}
        />
      </dl>

      <h3 className="mt-6 text-sm font-medium text-dark">
        Track
        <span className="ml-2 font-normal text-dark/50">
          {storm.path.length} {storm.path.length === 1 ? "position" : "positions"}
        </span>
      </h3>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-xs text-dark/50">
            <tr className="border-b border-cloud-dark">
              <th className="py-2 pr-4 font-normal">Time</th>
              <th className="py-2 pr-4 font-normal">Category</th>
              <th className="py-2 pr-4 font-normal">Position</th>
              <th className="py-2 pr-4 text-right font-normal">Wind</th>
              <th className="py-2 pr-4 text-right font-normal">Gusts</th>
              <th className="py-2 pr-4 text-right font-normal">Pressure</th>
              <th className="py-2 font-normal">Moving</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cloud">
            {[...storm.path].reverse().map((point) => {
              const forecast = point.timestamp * 1000 > now;
              return (
                <tr
                  key={point.timestamp}
                  className={forecast ? "text-dark/60 italic" : undefined}
                >
                  <td className="whitespace-nowrap py-2 pr-4">
                    {formatTimestamp(point.timestamp)}
                    {forecast && (
                      <span className="ml-1.5 text-xs not-italic text-dark/50">
                        forecast
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <CategoryPill category={point.category} />
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4">
                    {formatPosition(point)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-right">
                    {formatSpeed(point.windSpeed, unit)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-right">
                    {formatSpeed(point.gustSpeed, unit)}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-right">
                    {formatPressure(point.pressure)}
                  </td>
                  <td className="whitespace-nowrap py-2">
                    {formatMovement(point, unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Reading({
  label,
  value,
  arrow,
}: {
  label: string;
  value: string;
  /** Heading in degrees, drawn as an arrow beside the value. */
  arrow?: number;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-dark/50">{label}</dt>
      <dd className="flex items-center gap-1.5 text-lg font-semibold tabular-nums text-dark">
        {arrow !== undefined && (
          // An arrow pointing up is heading north, so it turns by the heading.
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-4 shrink-0 text-dark/70"
            style={{ transform: `rotate(${arrow}deg)` }}
          >
            <path d="M8 1 L13 14 L8 11 L3 14 Z" fill="currentColor" />
          </svg>
        )}
        {value}
      </dd>
    </div>
  );
}
