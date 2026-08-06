"use client";

import { KeyboardEvent, useEffect, useId, useState } from "react";
import {
  PlaceField,
  placeField,
  placeFieldCoordinates,
  placeLabel,
  PlaceSuggestion,
  placeTypeLabel,
} from "../utils";

/**
 * Autocomplete for a From or To location, backed by the Transit Planner
 * Search API (through the /mobility/transit-planner/search route, which adds
 * the API key on the server). Picking a suggestion is what gives us the
 * coordinates the Transit Planner needs.
 */

/** Wait this long after the last keystroke before searching. */
const DEBOUNCE_MS = 250;

/** Below this the search term is too broad to be worth a request. */
const MIN_QUERY_LENGTH = 2;

export function PlaceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PlaceField;
  onChange: (field: PlaceField) => void;
}) {
  /** Last search results, tagged with the term they belong to. */
  const [results, setResults] = useState<{
    query: string;
    items: PlaceSuggestion[];
  }>({ query: "", items: [] });
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;

  const query = value.query.trim();
  // A picked suggestion is already an exact match — no need to search for it.
  const picked = value.place !== null;
  const searchable = !picked && query.length >= MIN_QUERY_LENGTH;

  // Results are only shown while they still match what is in the input.
  const suggestions =
    searchable && results.query === query ? results.items : [];
  const searching = searchable && results.query !== query;

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/mobility/transit-planner/search?query=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        setResults({ query, items: body.items ?? [] });
        setHighlighted(0);
      } catch {
        if (!controller.signal.aborted) setResults({ query, items: [] });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable]);

  function select(place: PlaceSuggestion) {
    onChange(placeField(place));
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted(
        (current) =>
          (current + step + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (event.key === "Enter") {
      // Pick the highlighted suggestion instead of submitting the form.
      event.preventDefault();
      select(suggestions[activeIndex]);
    }
  }

  // Results may have shrunk since the highlight was last moved.
  const activeIndex = Math.min(highlighted, suggestions.length - 1);
  const showList = open && (suggestions.length > 0 || searching);
  const coordinates = placeFieldCoordinates(value);

  return (
    <div className="flex min-w-52 flex-1 flex-col gap-1 text-sm">
      <label htmlFor={inputId} className="text-gray-600">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          value={value.query}
          onChange={(event) => {
            onChange({ query: event.target.value, place: null });
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Station, stop or address"
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            suggestions.length > 0 ? `${listId}-${activeIndex}` : undefined
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />

        {showList && (
          // Swallow the mousedown so the input keeps focus and the click
          // lands before onBlur closes the list.
          <ul
            id={listId}
            role="listbox"
            onMouseDown={(event) => event.preventDefault()}
            className="absolute top-full z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
          >
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">Searching…</li>
            ) : (
              suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.stopid ?? index}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  ref={(node) => {
                    // Follow the highlight when arrowing past the fold.
                    if (index === activeIndex) {
                      node?.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => select(suggestion)}
                  className={`cursor-pointer px-3 py-2 ${
                    index === activeIndex ? "bg-gray-100" : ""
                  }`}
                >
                  {placeLabel(suggestion)}
                  {suggestion.type && (
                    <span className="block text-xs text-gray-500">
                      {placeTypeLabel(suggestion.type)}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <span className="h-4 font-mono text-xs text-gray-400">
        {coordinates ?? ""}
      </span>
    </div>
  );
}
