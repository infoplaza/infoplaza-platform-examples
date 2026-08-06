"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  DEFAULT_SIZES,
  SIZES,
  sortSizes,
  type Port,
  type PortInfo,
  type PortSize,
} from "../utils";
import { PortDetails } from "./port-details";

/**
 * Ties the example together: the size filter fills the map with ports, and
 * clicking one makes it active and loads everything the index holds on it
 * into the details below.
 *
 * Both lookups go through the route handlers next to this component, so the
 * API key stays on the server. The port list and the port the page opens on
 * are fetched during server rendering and handed in as props, so the page has
 * content on first paint.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const PortsMap = dynamic(() => import("./ports-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
  ),
});

interface PortsPanelProps {
  initialPorts: Port[];
  initialPort: PortInfo | null;
  initialError: string | null;
}

export function PortsPanel({
  initialPorts,
  initialPort,
  initialError,
}: PortsPanelProps) {
  const [sizes, setSizes] = useState<PortSize[]>(DEFAULT_SIZES);
  const [ports, setPorts] = useState<Port[]>(initialPorts);
  const [portsLoading, setPortsLoading] = useState(false);
  const [portsError, setPortsError] = useState<string | null>(initialError);

  const [active, setActive] = useState<PortInfo | null>(initialPort);
  const [activeId, setActiveId] = useState<number | null>(
    initialPort?.id ?? null,
  );
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const portsRequestRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      portsRequestRef.current?.abort();
      activeRequestRef.current?.abort();
    },
    [],
  );

  const loadPorts = useCallback(async (requested: PortSize[]) => {
    portsRequestRef.current?.abort();
    const controller = new AbortController();
    portsRequestRef.current = controller;

    setPortsError(null);
    setPortsLoading(true);

    try {
      const response = await fetch(
        `/marine/ports/list?size=${requested.join(",")}`,
        { signal: controller.signal },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");
      setPorts(body.ports ?? []);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setPorts([]);
      setPortsError(
        error instanceof Error ? error.message : "Failed to load ports.",
      );
    } finally {
      if (!controller.signal.aborted) setPortsLoading(false);
    }
  }, []);

  const selectPort = useCallback(async (portId: number) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setActiveId(portId);
    setActive(null);
    setActiveError(null);
    setActiveLoading(true);

    try {
      const response = await fetch(`/marine/ports/info?portId=${portId}`, {
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");
      setActive(body.port);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      setActiveError(
        error instanceof Error ? error.message : "Failed to load port.",
      );
    } finally {
      if (!controller.signal.aborted) setActiveLoading(false);
    }
  }, []);

  /**
   * Ticking a grade off the filter takes its ports off the map. The last one
   * cannot go: the endpoint reads an empty filter as its default, so the map
   * would quietly refill with large ports instead of emptying.
   */
  function toggleSize(size: PortSize) {
    const next = sizes.includes(size)
      ? sizes.filter((option) => option !== size)
      : sortSizes([...sizes, size]);
    if (next.length === 0) return;

    setSizes(next);
    loadPorts(next);
  }

  /**
   * The active port stays on the map even when its grade is filtered out, so
   * the details below can never describe a port with no dot to go with them.
   */
  const mapPorts = useMemo(() => {
    if (!active || ports.some((port) => port.id === active.id)) return ports;
    return [...ports, active];
  }, [ports, active]);

  return (
    <div className="space-y-6">
      <PortsMap
        ports={mapPorts}
        activeId={activeId}
        onSelect={selectPort}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Click a port to see what the index holds on it.
        </p>

        <fieldset className="flex flex-wrap items-center gap-3 text-sm">
          <legend className="sr-only">Port size</legend>
          <span className="text-gray-600">Size</span>
          {SIZES.map((option) => (
            <label
              key={option.code}
              className="flex items-center gap-1.5 text-gray-700"
            >
              <input
                type="checkbox"
                checked={sizes.includes(option.code)}
                onChange={() => toggleSize(option.code)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              {option.label}
              <span className="text-xs text-gray-400">{option.count}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <section>
        <h2 className="text-sm font-medium text-gray-900">
          Ports
          {!portsLoading && !portsError && (
            <span className="ml-2 font-normal text-gray-400">
              {ports.length}
            </span>
          )}
        </h2>
        {portsLoading && (
          <p className="mt-1 text-sm text-gray-500">Loading ports…</p>
        )}
        {portsError && <p className="mt-1 text-sm text-red-600">{portsError}</p>}
        {!portsLoading && !portsError && ports.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            No ports in this filter. Tick a size to put some on the map.
          </p>
        )}
      </section>

      {activeLoading && (
        <p className="text-sm text-gray-500">Loading port…</p>
      )}
      {activeError && <p className="text-sm text-red-600">{activeError}</p>}
      {!activeLoading && !activeError && !active && (
        <p className="text-sm text-gray-500">
          Click a port on the map to see its depths, its facilities and what it
          can supply.
        </p>
      )}
      {active && !activeLoading && <PortDetails port={active} />}
    </div>
  );
}
