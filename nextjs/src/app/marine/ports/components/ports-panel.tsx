"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchJson } from "@/lib/api-log";
import {
  DEFAULT_PORT_ID,
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
 * API key stays on the server. Everything is fetched from the browser,
 * including the opening state, so the page itself renders without waiting on
 * the API and its HTML does not carry a list of up to 3,700 ports.
 */

// MapLibre needs a browser, so the map is loaded on the client only.
const PortsMap = dynamic(() => import("./ports-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] w-full animate-pulse rounded-lg border border-cloud-dark bg-cloud-dark" />
  ),
});

export function PortsPanel() {
  const [sizes, setSizes] = useState<PortSize[]>(DEFAULT_SIZES);
  const [ports, setPorts] = useState<Port[]>([]);
  // Both lists are on their way from the mount effect below, so the panel
  // starts in its loading state rather than briefly reading as empty.
  const [portsLoading, setPortsLoading] = useState(true);
  const [portsError, setPortsError] = useState<string | null>(null);

  const [active, setActive] = useState<PortInfo | null>(null);
  const [activeId, setActiveId] = useState<number | null>(DEFAULT_PORT_ID);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Aborting the previous request means a quick second click cannot be
  // overtaken by the response to the first one.
  const portsRequestRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  /**
   * The two requests, from asking to state. They take a signal rather than
   * making one, so the mount effect below can call them without first setting
   * the state the callbacks around them set.
   */
  const storePorts = useCallback(
    async (signal: AbortSignal, requested: PortSize[]) => {
      try {
        setPorts(await fetchPorts(requested, signal));
      } catch (error: unknown) {
        if (signal.aborted) return;
        setPorts([]);
        setPortsError(errorMessage(error, "Failed to load ports."));
      } finally {
        if (!signal.aborted) setPortsLoading(false);
      }
    },
    [],
  );

  const storePort = useCallback(async (signal: AbortSignal, portId: number) => {
    try {
      setActive(await fetchPort(portId, signal));
    } catch (error: unknown) {
      if (signal.aborted) return;
      setActiveError(errorMessage(error, "Failed to load port."));
    } finally {
      if (!signal.aborted) setActiveLoading(false);
    }
  }, []);

  /** Puts the ports of a filter on the map, replacing the ones there now. */
  const loadPorts = useCallback(
    async (requested: PortSize[]) => {
      portsRequestRef.current?.abort();
      const controller = new AbortController();
      portsRequestRef.current = controller;

      setPortsError(null);
      setPortsLoading(true);

      await storePorts(controller.signal, requested);
    },
    [storePorts],
  );

  /** Makes a port the active one and loads its entry in the index. */
  const selectPort = useCallback(
    async (portId: number) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;

      setActiveId(portId);
      setActive(null);
      setActiveError(null);
      setActiveLoading(true);

      await storePort(controller.signal, portId);
    },
    [storePort],
  );

  /**
   * The opening state, fetched from the browser like every later change: the
   * ports of the default grade, and the port the example opens on. The two do
   * not depend on each other, so they go out together.
   *
   * The state the callbacks above set before asking is already the initial
   * state here, so this skips them and only lets the results land in state —
   * which is also what keeps the effect from setting state as it runs.
   */
  useEffect(() => {
    const portsRequest = new AbortController();
    const portRequest = new AbortController();
    portsRequestRef.current = portsRequest;
    activeRequestRef.current = portRequest;

    void (async () => {
      await Promise.all([
        storePorts(portsRequest.signal, DEFAULT_SIZES),
        storePort(portRequest.signal, DEFAULT_PORT_ID),
      ]);
    })();

    // Whatever is in flight when the panel goes away is dropped, including a
    // later request that has taken one of these two slots by then.
    return () => {
      portsRequestRef.current?.abort();
      activeRequestRef.current?.abort();
    };
  }, [storePorts, storePort]);

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
        <p className="text-xs text-dark/70">
          Click a port to see what the index holds on it.
        </p>

        <fieldset className="flex flex-wrap items-center gap-3 text-sm">
          <legend className="sr-only">Port size</legend>
          <span className="text-dark/80">Size</span>
          {SIZES.map((option) => (
            <label
              key={option.code}
              className="flex items-center gap-1.5 text-dark/85"
            >
              <input
                type="checkbox"
                checked={sizes.includes(option.code)}
                onChange={() => toggleSize(option.code)}
                className="h-3.5 w-3.5 accent-marine"
              />
              {option.label}
              <span className="text-xs text-dark/50">{option.count}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <section>
        <h2 className="text-sm font-medium text-dark">
          Ports
          {!portsLoading && !portsError && (
            <span className="ml-2 font-normal text-dark/50">
              {ports.length}
            </span>
          )}
        </h2>
        {portsLoading && (
          <p className="mt-1 text-sm text-dark/70">Loading ports…</p>
        )}
        {portsError && <p className="mt-1 text-sm text-red-600">{portsError}</p>}
        {!portsLoading && !portsError && ports.length === 0 && (
          <p className="mt-1 text-sm text-dark/70">
            No ports in this filter. Tick a size to put some on the map.
          </p>
        )}
      </section>

      {activeLoading && (
        <p className="text-sm text-dark/70">Loading port…</p>
      )}
      {activeError && <p className="text-sm text-red-600">{activeError}</p>}
      {!activeLoading && !activeError && !active && (
        <p className="text-sm text-dark/70">
          Click a port on the map to see its depths, its facilities and what it
          can supply.
        </p>
      )}
      {active && !activeLoading && <PortDetails port={active} />}
    </div>
  );
}

async function fetchPorts(
  sizes: PortSize[],
  signal: AbortSignal,
): Promise<Port[]> {
  const body = await fetchJson<{ ports?: Port[] }>(
    `/marine/ports/list?size=${sizes.join(",")}`,
    signal,
  );
  return body.ports ?? [];
}

async function fetchPort(
  portId: number,
  signal: AbortSignal,
): Promise<PortInfo> {
  const body = await fetchJson<{ port: PortInfo }>(
    `/marine/ports/info?portId=${portId}`,
    signal,
  );
  return body.port;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
