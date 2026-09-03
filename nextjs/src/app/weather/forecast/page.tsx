import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { collectApiCalls } from "@/lib/platform";
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
  // The call made while rendering is recorded like the ones the panel makes
  // later, so the API log opens with the request behind what is on screen.
  const { result, apiCalls } = await collectApiCalls(initialForecast);

  return (
    <ExamplePage
      group="Weather"
      title="Forecast"
      apiCalls={apiCalls}
      intro={
        <>
          Pick a spot on the map to see the weather forecast for it with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-weather-forecast">
            Weather Forecast API
          </ApiLink>
          . One call answers with five blocks at once — what it is doing now,
          then the next {FORECAST_LIMITS.minutely} minutes of precipitation,{" "}
          {FORECAST_LIMITS.hourly} hours, {FORECAST_LIMITS.daypartly} dayparts
          and {FORECAST_LIMITS.daily} days — so the tabs below the map cost one
          request between them, not one each.
        </>
      }
    >
      <ForecastPanel
        initialForecast={result.forecast}
        initialError={result.error}
      />
    </ExamplePage>
  );
}
