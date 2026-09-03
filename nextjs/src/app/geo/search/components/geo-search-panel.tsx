"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_QUERY,
  LANGUAGES,
  MIN_QUERY_LENGTH,
  placeKey,
  type LanguageCode,
  type Place,
} from "../utils";
import { PlaceList } from "./place-list";

/**
 * Ties the example together: submitting the textbox fills the result list and
 * the markers on the map, and picking a result in either view highlights it in
 * the other.
 *
 * The search goes through the route handler next to this component, so the
 * API key stays on the server. The results for the term the page opens on are
 * fetched during server rendering and handed in as props, so the page has
 * content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const PlacesMap = dynamic(() => import("./places-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

interface GeoSearchPanelProps {
  initialPlaces: Place[];
  initialError: string | null;
}

export function GeoSearchPanel({
  initialPlaces,
  initialError,
}: GeoSearchPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const id = useId();
  const inputId = `${id}-query`;
  const languageId = `${id}-language`;

  /** The term the results on screen belong to. */
  const searchedRef = useRef(DEFAULT_QUERY);
  // Aborting the previous request means a slow response cannot overtake the
  // one for a term that was submitted after it.
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const search = useCallback(async (term: string, code: LanguageCode) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    searchedRef.current = term;

    setError(null);
    setLoading(true);
    setSelectedKey(null);

    try {
      const body = await fetchJson<{ places?: Place[] }>(
        `/geo/search/places?query=${encodeURIComponent(term)}&language=${code}`,
        controller.signal,
      );
      setPlaces(body.places ?? []);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setPlaces([]);
      setError(
        error instanceof Error ? error.message : "Failed to search places.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Typing changes nothing on its own: a search only happens on submit, which
  // is the Search button or Enter in the textbox. That also makes the button a
  // way to retry a term whose request failed.
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length >= MIN_QUERY_LENGTH) search(term, language);
  }

  // Picking a language re-runs the last submitted term, so the names on screen
  // cannot drift away from the language selected beside them. It deliberately
  // reuses that term rather than what is in the textbox, which may have been
  // typed since without being submitted.
  function changeLanguage(code: LanguageCode) {
    setLanguage(code);
    search(searchedRef.current, code);
  }

  function selectPlace(place: Place) {
    setSelectedKey(placeKey(place));
  }

  const tooShort = query.trim().length < MIN_QUERY_LENGTH;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
          <label htmlFor={inputId} className="text-gray-600">
            Search
          </label>
          <input
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="City, town or village"
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={languageId} className="text-gray-600">
            Language
          </label>
          <select
            id={languageId}
            value={language}
            onChange={(event) =>
              changeLanguage(event.target.value as LanguageCode)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={tooShort}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:bg-gray-300"
        >
          Search
        </button>
      </form>

      {tooShort && (
        <p className="text-xs text-gray-500">
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium text-gray-900">
            Results
            {places.length > 0 && (
              <span className="ml-2 font-normal text-gray-400">
                {places.length}
              </span>
            )}
          </h2>

          {loading && <p className="mt-3 text-sm text-gray-500">Searching…</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {!loading && !error && places.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">
              No places match this term.
            </p>
          )}

          {places.length > 0 && !loading && (
            <div className="mt-2">
              <PlaceList
                places={places}
                selectedKey={selectedKey}
                onSelect={selectPlace}
              />
            </div>
          )}
        </section>

        <section>
          <PlacesMap
            places={places}
            selectedKey={selectedKey}
            onSelect={selectPlace}
          />
          <p className="mt-3 text-xs text-gray-500">
            Every match is a numbered marker. Pick one here or in the list to
            highlight it in both views.
          </p>
        </section>
      </div>
    </div>
  );
}
