import {
  compassPoint,
  formatFraction,
  formatIntensity,
  formatTemperature,
  formatTime,
  formatUvIndex,
  formatVisibility,
  formatWind,
  hourAround,
  MISSING,
  uvBand,
  type Forecast,
} from "../utils";
import { conditionDescription, WeatherIcon } from "./weather-icon";

/**
 * What it is doing right now, as the headline above the four forecast blocks.
 *
 * `currently` is the one block without an `iconExtended` code — it carries the
 * basic one instead — and without a UV index, so both come from the hour the
 * current moment falls in. That hour also supplies the wording for the icon,
 * which the forecast never spells out itself.
 */

interface CurrentConditionsProps {
  forecast: Forecast;
}

export function CurrentConditions({ forecast }: CurrentConditionsProps) {
  const { currently, timezone } = forecast;
  const hour = hourAround(forecast);
  const description = conditionDescription(hour?.iconExtended);

  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex items-center gap-4">
          <WeatherIcon code={hour?.iconExtended} size={64} />
          <div>
            <p className="text-4xl font-semibold leading-none text-gray-900">
              {formatTemperature(currently.temperature)}
            </p>
            {description && (
              <p className="mt-1.5 text-sm text-gray-900">{description}</p>
            )}
            <p className="mt-0.5 text-xs text-gray-500">
              Feels like {formatTemperature(currently.apparentTemperature)} · at{" "}
              {formatTime(currently.time, timezone)} local time
            </p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Stat label="Wind">
            {formatWind(currently.windSpeed)}
            {currently.windBearing !== undefined && (
              <span className="text-gray-500">
                {" "}
                from {compassPoint(currently.windBearing)}
              </span>
            )}
          </Stat>
          <Stat label="Gusts">{formatWind(currently.windGust)}</Stat>
          <Stat label="Cloud cover">
            {formatFraction(currently.cloudCover)}
          </Stat>
          <Stat label="Humidity">{formatFraction(currently.humidity)}</Stat>
          <Stat label="Pressure">
            {currently.pressure === undefined
              ? MISSING
              : `${Math.round(currently.pressure)} hPa`}
          </Stat>
          <Stat label="Visibility">
            {formatVisibility(currently.visibility)}
          </Stat>
          <Stat label="Dew point">
            {formatTemperature(currently.dewPoint)}
          </Stat>
          <Stat label="Precipitation">
            {formatIntensity(currently.precipIntensity)}
            {currently.precipProbability !== undefined && (
              <span className="text-gray-500">
                {" "}
                at {formatFraction(currently.precipProbability)}
              </span>
            )}
          </Stat>
          <Stat label="UV index">
            {formatUvIndex(hour?.uvIndex)}
            {hour?.uvIndex !== undefined && (
              <span className="text-gray-500"> {uvBand(hour.uvIndex)}</span>
            )}
          </Stat>
        </dl>
      </div>

      {currently.nearestStormDistance !== undefined && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
          Nearest storm {Math.round(currently.nearestStormDistance)} km away
          {currently.nearestStormBearing !== undefined &&
            `, to the ${compassPoint(currently.nearestStormBearing)}`}
          .
        </p>
      )}
    </section>
  );
}

/** One reading: its name above, its value below. */
function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900 tabular-nums">{children}</dd>
    </div>
  );
}
