"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  countryFlag,
  DEFAULT_LANGUAGE,
  DEFAULT_LOCATION,
  elementLabel,
  formatCoordinates,
  formatDateTime,
  formatWindow,
  highestLevel,
  LANGUAGES,
  warningKey,
  warningTitle,
  type LanguageCode,
  type LatLon,
  type Warning,
} from "../utils";
import { LevelPill } from "./level-pill";
import { WarningList } from "./warning-list";

/**
 * Ties the example together: the picked location fills the list of warnings
 * and colours the pin, and picking a warning shows the full text the issuing
 * service wrote for it.
 *
 * The lookup goes through the route handler next to this component, so the
 * API key stays on the server. The warnings for the location the page opens
 * on are fetched during server rendering and handed in as props, so the page
 * has content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const WarningsMap = dynamic(() => import("./warnings-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

interface WarningsPanelProps {
  initialWarnings: Warning[];
  initialError: string | null;
}

export function WarningsPanel({
  initialWarnings,
  initialError,
}: WarningsPanelProps) {
  const [picked, setPicked] = useState<LatLon>(DEFAULT_LOCATION);
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [warnings, setWarnings] = useState<Warning[]>(initialWarnings);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  // The severest warning in force is the one to read first, and the list is
  // sorted so that it comes first.
  const [selected, setSelected] = useState<Warning | null>(
    initialWarnings[0] ?? null,
  );

  const languageId = `${useId()}-language`;

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const lookup = useCallback(async (location: LatLon, code: LanguageCode) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setPicked(location);
    setError(null);
    setLoading(true);
    setWarnings([]);
    setSelected(null);

    try {
      const body = await fetchJson<{ warnings?: Warning[] }>(
        `/weather/warnings/lookup?lat=${location.latitude}&lon=${location.longitude}&language=${code}`,
        controller.signal,
      );

      const found: Warning[] = body.warnings ?? [];
      setWarnings(found);
      setSelected(found[0] ?? null);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setWarnings([]);
      setError(
        error instanceof Error ? error.message : "Failed to load warnings.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Picking a language looks the same location up again, so the text on
  // screen cannot drift away from the language selected beside it.
  function changeLanguage(code: LanguageCode) {
    setLanguage(code);
    lookup(picked, code);
  }

  const selectedKey = selected ? warningKey(selected) : null;

  return (
    <div className="space-y-6">
      <WarningsMap
        picked={picked}
        level={highestLevel(warnings)}
        count={warnings.length}
        onPick={(location) => lookup(location, language)}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-dark/70">
          Click the map or drag the pin to look somewhere else. Picked
          location:{" "}
          <span className="tabular-nums">{formatCoordinates(picked)}</span>
        </p>

        <div className="flex items-center gap-2 text-sm">
          <label htmlFor={languageId} className="text-dark/80">
            Language
          </label>
          <select
            id={languageId}
            value={language}
            onChange={(event) =>
              changeLanguage(event.target.value as LanguageCode)
            }
            className="rounded-md border border-cloud-dark bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="self-start rounded-lg border border-cloud-dark bg-white p-5">
          <h2 className="text-sm font-medium text-dark">
            Warnings
            {warnings.length > 0 && (
              <span className="ml-2 font-normal text-dark/50">
                {warnings.length}
              </span>
            )}
          </h2>

          {loading && (
            <p className="mt-3 text-sm text-dark/70">Looking up warnings…</p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {!loading && !error && warnings.length === 0 && (
            <p className="mt-3 text-sm text-dark/70">
              Nothing to warn about here. That is the usual answer: a warning
              only exists while a service expects severe weather, so try a
              region that has some in the forecast.
            </p>
          )}

          {warnings.length > 0 && !loading && (
            <div className="mt-2">
              <WarningList
                warnings={warnings}
                selectedKey={selectedKey}
                onSelect={setSelected}
              />
            </div>
          )}
        </section>

        <section className="self-start rounded-lg border border-cloud-dark bg-white p-5">
          <h2 className="text-sm font-medium text-dark">
            {selected ? warningTitle(selected) : "Warning"}
          </h2>

          {!selected ? (
            <p className="mt-3 text-sm text-dark/70">
              Pick a warning from the list to read what the issuing service
              wrote about it.
            </p>
          ) : (
            <>
              <dl className="mt-2 divide-y divide-cloud text-sm">
                <Detail label="Level">
                  <LevelPill level={selected.level} />
                </Detail>
                <Detail label="Type">{elementLabel(selected.element)}</Detail>
                <Detail label="In force">
                  {selected.active ? "Now" : "Not yet"}
                </Detail>
                <Detail label="Period">{formatWindow(selected)}</Detail>
                <Detail label="Issued">
                  {formatDateTime(selected.created)}
                </Detail>
                <Detail label="By">
                  <span aria-hidden className="mr-1.5">
                    {countryFlag(selected.countryCode)}
                  </span>
                  {selected.countryCode}
                </Detail>
              </dl>

              <p className="mt-4 whitespace-pre-line text-sm text-dark/80">
                {selected.text}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** One row of the detail list: label on the left, value on the right. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-dark/70">{label}</dt>
      <dd className="min-w-0 text-right text-dark">{children}</dd>
    </div>
  );
}
