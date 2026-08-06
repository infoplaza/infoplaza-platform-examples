import type { Metadata } from "next";
import { weatherForecast } from "./api";
import { ForecastPanel } from "./components/forecast-panel";
import { DEFAULT_LOCATION, FORECAST_LIMITS, type Forecast } from "./utils";

export const metadata: Metadata = {
  title: "Weather Forecast — Infoplaza Platform Examples",
};

/**
 * The forecast for the default location is loaded here so the page arrives
 * with content; every later lookup is a click away in the panel.
 */
async function initialForecast(): Promise<{
  forecast: Forecast | null;
  error: string | null;
}> {
  try {
    return {
      forecast: await weatherForecast(
        DEFAULT_LOCATION.latitude,
        DEFAULT_LOCATION.longitude,
      ),
      error: null,
    };
  } catch (error) {
    return {
      forecast: null,
      error:
        error instanceof Error ? error.message : "Failed to load the forecast.",
    };
  }
}

export default async function WeatherForecastPage() {
  const { forecast, error } = await initialForecast();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Weather
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Forecast</h1>
      <p className="mt-2 text-gray-600">
        Pick a spot on the map to see the weather forecast for it with the{" "}
        <a
          href="https://platform.infoplaza.com/reference/v1-weather-forecast"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Weather Forecast API
        </a>
        . One call answers with five blocks at once — what it is doing now,
        then the next {FORECAST_LIMITS.minutely} minutes of precipitation,{" "}
        {FORECAST_LIMITS.hourly} hours, {FORECAST_LIMITS.daypartly} dayparts
        and {FORECAST_LIMITS.daily} days — so the tabs below the map cost one
        request between them, not one each.
      </p>

      <div className="mt-8">
        <ForecastPanel initialForecast={forecast} initialError={error} />
      </div>
    </div>
  );
}
