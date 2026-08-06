# Infoplaza Platform — Next.js Example

Example implementation of the [Infoplaza Platform API](https://platform.infoplaza.com/) using [Next.js](https://nextjs.org/) (App Router, TypeScript) and [Tailwind CSS](https://tailwindcss.com/).

> 🚧 **In progress** — this example is actively being built.

## Prerequisites

- [Node.js](https://nodejs.org/) 18.18 or later
- An Infoplaza Platform API key — sign up at [platform.infoplaza.com](https://platform.infoplaza.com/)

## Getting started

Install the dependencies:

```bash
npm install
```

Configure your API key:

```bash
cp .env.example .env.local
# then put your API key in .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project structure

Each example lives in its own folder under `src/app/<group>/<example>/`, with its page, API calls, components and helpers colocated so everything belonging to one example is easy to find:

```
nextjs/
├── server.ts                           # Custom server (WebSocket upgrades)
├── scripts/                            # Setup scripts run before dev and build
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with sidebar
│   │   ├── page.tsx                    # Home page listing all examples
│   │   └── mobility/
│   │       ├── transit-planner/        # One example, everything together
│   │       │   ├── page.tsx            #   Page
│   │       │   ├── api.ts              #   Transit Planner + Search API clients
│   │       │   ├── proxy/socket.ts     #   WebSocket proxy the browser calls
│   │       │   ├── search/route.ts     #   Search proxy the browser calls
│   │       │   ├── utils.ts            #   Example-specific helpers
│   │       │   ├── components/         #   Example-specific components
│   │       │   └── proto/              #   Protobuf message definitions
│   │       ├── transit-stops/
│   │       │   ├── page.tsx            #   Page
│   │       │   ├── api.ts              #   Stop Nearby + Departures API clients
│   │       │   ├── nearby/route.ts     #   Nearby-stops proxy the browser calls
│   │       │   ├── departures/route.ts #   Departures proxy the browser calls
│   │       │   ├── utils.ts            #   Example-specific helpers
│   │       │   └── components/         #   Map and lists
│   │       └── traffic/
│   │           ├── page.tsx            #   Page
│   │           ├── api.ts              #   Traffic Geo + Overview API clients
│   │           ├── utils.ts            #   Types, merge and formatting helpers
│   │           └── components/         #   Map and list
│   ├── components/                     # Shared components (sidebar)
│   └── lib/
│       └── examples.ts                 # Registry of all examples
├── public/                             # Static assets
└── package.json
```

Because WebSocket upgrades are not supported by Next.js route handlers, this
project runs a small [custom server](server.ts): it routes upgrade requests
for the Transit Planner proxy to our own handler and leaves everything else to
Next.js. `npm run dev` and `npm run start` both run this server (via `tsx`).
Note that this requires a Node.js host — serverless platforms do not support
WebSockets.

The maps parse their data in a web worker that MapLibre loads from a file of
its own, which it can no longer find once Next.js has bundled it. The basemap
still draws, but everything that needs the worker stays empty. Both `npm run
dev` and `npm run build` therefore first run
[`scripts/copy-maplibre-worker.mjs`](scripts/copy-maplibre-worker.mjs), which
copies that file to `public/maplibre/` for the map to point at.

## Examples

### Mobility — Transit Planner

Streams travel results between two locations in real time using the
[Transit Planner Mixer API](https://platform.infoplaza.com/reference/v1-transit-plannermixer),
a WebSocket endpoint that speaks Protocol Buffers.

The browser never talks to the API directly: it opens a WebSocket to a small
[proxy](src/app/mobility/transit-planner/proxy/socket.ts) on our own server and
sends one JSON message with the plan request. The proxy opens the upstream
WebSocket to `api.infoplaza.com` with the API key from `INFOPLAZA_API_KEY`,
decodes each protobuf `PlanResult` message and forwards it to the browser as
JSON until the mixer is done. This keeps the API key on the server.

The mixer plans between coordinates, so the From and To fields are
autocompletes backed by the
[Transit Planner Search API](https://platform.infoplaza.com/reference/v1-transit-planner-search):
while you type, the browser calls a
[route handler](src/app/mobility/transit-planner/search/route.ts) that forwards
the term to `/v1/transit/planner/search` — again adding the API key
server-side — and returns the matching stations, stops and addresses. Picking
a suggestion supplies the coordinates sent to the mixer. Typing a raw
`latitude,longitude` pair still works too.

The protobuf schema lives in
[`proto/`](src/app/mobility/transit-planner/proto/); `proto.json` is generated
from the `.proto` files with:

```bash
npx -p protobufjs-cli pbjs -t json PlanRequest.proto PlanResult.proto PlanService.proto -o proto.json
```

### Mobility — Transit Stops

Finds the transit stops around a point on the map with the
[Transit Stop Nearby API](https://platform.infoplaza.com/reference/v1-transit-stop-nearby)
and shows the next hour of departures from a stop with the
[Transit Stop Departures API](https://platform.infoplaza.com/reference/v1-transit-stop-departures).

Clicking the map picks a location, marked with a pin that can be dragged to
adjust it; the stops around it are drawn as dots on
the map and listed next to it, sorted by distance. Clicking a stop, either on
the map or in the list, loads its departures. Both APIs take the key as a
query parameter, so the browser calls two
[route](src/app/mobility/transit-stops/nearby/route.ts)
[handlers](src/app/mobility/transit-stops/departures/route.ts) that add
`INFOPLAZA_API_KEY` server-side. The stops for the location the page opens on
are fetched during server rendering, so the page arrives with content.

The map is [MapLibre GL](https://maplibre.org/), which ships without a
basemap. The [map component](src/app/mobility/transit-stops/components/stops-map.tsx)
defines the smallest style that shows one: raster tiles straight from
OpenStreetMap. Those tiles are meant for light use, so point the source at
your own tile server (or any style URL) before putting this in production.

### Mobility — Traffic

Shows the current jams, roadworks and diversions on the Dutch roads, on a map
and in a list next to it.

Two APIs describe the same set of events, and the example combines them. The
[Traffic Geo API](https://platform.infoplaza.com/reference/v1-traffic-geo)
returns them as GeoJSON, a LineString for a stretch of road and a Point for a
single spot, but without the delay; the
[Traffic Overview API](https://platform.infoplaza.com/reference/v1-traffic-overview)
returns them as plain records with the delay and queue length, plus the
nationwide totals, but without any geometry. Neither response carries an
identifier the other shares, so
[`mergeEvents`](src/app/mobility/traffic/utils.ts) joins them on road number,
description and start time.

Both endpoints take no parameters beyond the API key and return everything at
once, so there is nothing for the browser to request: the page fetches them
both during server rendering and hands the merged list to the client
component. That means no route handlers here, and the key stays server-side.
Traffic changes by the minute, so the page opts out of caching entirely with
`export const dynamic = "force-dynamic"`.

On the [map](src/app/mobility/traffic/components/traffic-map.tsx) the events go
into one MapLibre GeoJSON source, drawn by a line layer and a circle layer that
take their colour from a feature property, so the cause type decides the colour
in one place. Selecting an event, on the map or in the list, thickens its shape
and zooms to it.

See the [repository README](../README.md) for an overview of all planned implementations.
