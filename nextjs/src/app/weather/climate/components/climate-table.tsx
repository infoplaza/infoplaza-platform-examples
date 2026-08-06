"use client";

import {
  periodShortLabel,
  sunHoursPerDay,
  type ClimatePeriod,
  type Granularity,
} from "../utils";

/**
 * Every number the API returned, in the order the year runs. The charts show
 * the shape of the year; this is where the values themselves are read off.
 */

interface ClimateTableProps {
  periods: ClimatePeriod[];
  granularity: Granularity;
}

export function ClimateTable({ periods, granularity }: ClimateTableProps) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            <th className="py-2 pr-3 text-left font-medium">Period</th>
            <Heading>Low</Heading>
            <Heading>High</Heading>
            <Heading>Rain</Heading>
            <Heading>Sun</Heading>
            <Heading>Wind</Heading>
            <Heading>Gust</Heading>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {periods.map((period) => (
            <tr key={`${period.month}-${period.period}`}>
              <td className="py-2 pr-3 text-gray-900">
                {periodShortLabel(period, granularity)}
              </td>
              <Cell>{period.temperatureLow.toFixed(1)}°</Cell>
              <Cell>{period.temperatureHigh.toFixed(1)}°</Cell>
              <Cell>{period.precipitationSum.toFixed(1)}</Cell>
              <Cell>{sunHoursPerDay(period).toFixed(1)}</Cell>
              <Cell>{period.windSpeed.toFixed(1)}</Cell>
              <Cell>{period.windGust.toFixed(1)}</Cell>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="pt-3 text-xs text-gray-400">
        Rain in mm over the period, sun in hours per day, wind in m/s.
      </p>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <th className="py-2 pl-3 text-right font-medium">{children}</th>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td className="py-2 pl-3 text-right tabular-nums text-gray-600">
      {children}
    </td>
  );
}
