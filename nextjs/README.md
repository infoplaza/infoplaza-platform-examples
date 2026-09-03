# Infoplaza Platform — Next.js Example

Example implementation of the [Infoplaza Platform API](https://platform.infoplaza.com/) using [Next.js](https://nextjs.org/) (App Router, TypeScript) and [Tailwind CSS](https://tailwindcss.com/).

> 🚧 **In progress** — this example is actively being built.

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or later — the Transit Planner example uses the global `WebSocket`, which is only available without a flag from Node 22 on
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
├── scripts/                            # Setup scripts run before dev and build
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with sidebar
│   │   ├── page.tsx                    # Home page listing all examples
│   │   ├── weather/
│   │   │   ├── climate/
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── api.ts              #   Weather Climate API client
│   │   │   │   ├── normals/route.ts    #   Climate proxy the browser calls
│   │   │   │   ├── utils.ts            #   Types, periods and summary helpers
│   │   │   │   └── components/         #   Panel, map, charts and table
│   │   │   ├── forecast/
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── api.ts              #   Weather Forecast API client
│   │   │   │   ├── lookup/route.ts     #   Forecast proxy the browser calls
│   │   │   │   ├── utils.ts            #   Types, limits and formatting helpers
│   │   │   │   ├── conditions.ts       #   Icon code → wording, from the icon set
│   │   │   │   └── components/         #   Panel, map, chart and tables
│   │   │   └── warnings/
│   │   │       ├── page.tsx            #   Page
│   │   │       ├── api.ts              #   Weather Warnings API client
│   │   │       ├── lookup/route.ts     #   Warnings proxy the browser calls
│   │   │       ├── utils.ts            #   Types, levels and formatting helpers
│   │   │       └── components/         #   Panel, map and list
│   │   ├── geo/
│   │   │   ├── nearby/                 # One example, everything together
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── api.ts              #   Geo Nearby API client
│   │   │   │   ├── places/route.ts     #   Nearby proxy the browser calls
│   │   │   │   ├── utils.ts            #   Types, radii and formatting helpers
│   │   │   │   └── components/         #   Panel, list and map
│   │   │   └── search/
│   │   │       ├── page.tsx            #   Page
│   │   │       ├── api.ts              #   Geo Search API client
│   │   │       ├── places/route.ts     #   Search proxy the browser calls
│   │   │       ├── utils.ts            #   Types and formatting helpers
│   │   │       └── components/         #   Search panel, list and map
│   │   ├── marine/
│   │   │   ├── ports/
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── api.ts              #   Port List + Port Info API clients
│   │   │   │   ├── list/route.ts       #   Port-list proxy the browser calls
│   │   │   │   ├── info/route.ts       #   Port-info proxy the browser calls
│   │   │   │   ├── utils.ts            #   Types, sizes and label helpers
│   │   │   │   └── components/         #   Panel, sea chart and details
│   │   │   └── shipping/
│   │   │       ├── page.tsx            #   Page
│   │   │       ├── api.ts              #   Shipping Route + Point API clients
│   │   │       ├── route/route.ts      #   Route-forecast proxy the browser calls
│   │   │       ├── point/route.ts      #   Point-forecast proxy the browser calls
│   │   │       ├── utils.ts            #   Types, columns and formatting helpers
│   │   │       └── components/         #   Panel, sea chart and forecast tables
│   │   └── mobility/
│   │       ├── transit-planner/
│   │       │   ├── page.tsx            #   Page
│   │       │   ├── api.ts              #   Transit Planner + Search API clients
│   │       │   ├── stream/route.ts     #   Streaming proxy the browser calls
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
│   └── weather-icons/                  # The extended weather icon set, one SVG per code
└── package.json
```

The Transit Planner speaks WebSocket, and a Next.js route handler cannot
upgrade to one. Rather than run a custom server for that, the browser leg uses
[server-sent events](src/app/mobility/transit-planner/stream/route.ts): the
route keeps the upstream WebSocket to `api.infoplaza.com` on the server and
pushes each result to the browser as it arrives. Streaming works the same way,
and the project runs on plain `next dev` and `next start` — no custom server,
so serverless hosts are fine too.

The maps parse their data in a web worker that MapLibre loads from a file of
its own, which it can no longer find once Next.js has bundled it. The basemap
still draws, but everything that needs the worker stays empty. Both `npm run
dev` and `npm run build` therefore first run
[`scripts/copy-maplibre-worker.mjs`](scripts/copy-maplibre-worker.mjs), which
copies that file to `public/maplibre/` for the map to point at.

## Deployment

This example lives in the `nextjs/` subfolder of the repository, so a host that
expects the project in the repository root needs to be told where to look. On
[Vercel](https://vercel.com/):

1. Import the repository and set **Root Directory** to `nextjs` (Settings →
   General → Root Directory for an existing project). The framework preset
   picks up Next.js from there.
2. Leave the build command on its default. Vercel then runs the `build` script
   from `package.json`, which lets npm run the `prebuild` hook that copies the
   MapLibre worker into `public/maplibre/`. Overriding the build command with a
   bare `next build` skips that hook and leaves the vector maps empty.
3. Add `INFOPLAZA_API_KEY` under Settings → Environment Variables for
   Production, Preview and Development. No `NEXT_PUBLIC_` prefix: the key is
   only ever read server-side and should stay that way.

Other hosts work the same way — point the build at the `nextjs/` directory. The
project needs no custom server, so anything that runs a standard Next.js build
will do.

## Examples

### Weather — Forecast

Shows the weather forecast for a point on the map with the
[Weather Forecast API](https://platform.infoplaza.com/reference/v1-weather-forecast).

One call returns five blocks at once — what it is doing now, then the coming
minutes, hours, dayparts and days — so the four tabs under the map cost one
request between them rather than one each. How much of each block comes back is
set by the `max_*` parameters, gathered in `FORECAST_LIMITS` in
[`utils.ts`](src/app/weather/forecast/utils.ts). They sit at the API's own
defaults on purpose: staying at or below those keeps a call at 1 credit, and
asking for more of any one block puts the whole call at 3. There is room to go
further — 120 minutes, 168 hours, 30 dayparts, 15 days — at that price.

The minutely block is the one worth reading carefully. `max_minutely` is a
number of minutes but the answer comes in five-minute steps, so 60 returns
twelve of them and anything under 5 returns none. It also holds two numbers in
different units, how hard precipitation would fall and how likely it is at all,
which is why the
[chart](src/app/weather/forecast/components/precipitation-chart.tsx) gives them
a panel each over one shared timeline instead of putting two scales on one
plot. The three remaining blocks describe the same weather at coarser zoom and
carry nearly the same fields, so they share their cells in
[`forecast-tables.tsx`](src/app/weather/forecast/components/forecast-tables.tsx).

A forecast is read in the local time of the place it is for, not in the
timezone of whoever is looking at it, so every timestamp goes through `Intl`
with the IANA zone the API returns beside it: click Tokyo and the hours are
Tokyo's. Which day counts as "Today" comes from `currently.time` rather than
from the clock, so the label cannot differ between the server render and the
browser.

The API answers for the nearest place it forecasts for, not for the exact point
asked about — inland that is a village away, out at sea it can be an ocean away
— so the [map](src/app/weather/forecast/components/forecast-map.tsx) marks both:
the pin where you clicked, and a dot where the forecast turned out to be for
once the two are far enough apart to tell apart.

Every block carries an icon code rather than a description, and `currently`
carries only the basic-set code while the rest also carry the extended one. The
extended SVGs are checked in under
[`public/weather-icons/`](public/weather-icons/) with the code as the filename,
and the wording that goes with each code is in
[`conditions.ts`](src/app/weather/forecast/conditions.ts). Both come from the
[weather icon set](https://platform.infoplaza.com/docs/assets/icon-sets) — the
`WeatherExtended` folder, light-background variant, with `icons.json` supplying
the English text; the same download ships a dark-background variant and Dutch.
Since `currently` has no extended code of its own, its icon and wording come
from the hour the current moment falls in.

### Weather — Climate

Shows what a year normally looks like at a point on the map with the
[Weather Climate API](https://platform.infoplaza.com/reference/v1-weather-climate).

One call returns the whole climate year for a location: the average daily low
and high, the rain, the sunshine and the wind for each period. The `period`
parameter decides how finely the year is cut, into 12 months, 24 half months or
36 ten-day periods, and the buttons under the map switch between them.

Clicking the map picks a location, marked with a marker that can be dragged to
adjust it, and every pick is one call through a
[route handler](src/app/weather/climate/normals/route.ts) that adds
`INFOPLAZA_API_KEY` server-side. The climate for the location the page opens on
is fetched during server rendering, so the page arrives with content.

Coverage is not global, and a point outside it comes back as a 500 rather than
as an empty result, so
[`climateNormals`](src/app/weather/climate/api.ts) turns that case into a
`NoClimateDataError` and the route answers it with `covered: false`. The panel
shows that as a hint to try somewhere else, while a real failure such as a
missing API key still shows as an error.

The four [charts](src/app/weather/climate/components/climate-chart.tsx) are
plain SVG in a fixed viewBox, no chart library, so the same component draws 12
monthly bars and 36 ten-day ones. Temperature is the one that is not a bar from
zero: it is a range from the average daily low to the average daily high,
coloured by the middle of that range.

One field needs reading against its name. `sunshineHours` comes back as 8363
for January in the Netherlands, which is only sensible as seconds per day: 2.3
hours a day, and 2064 hours over the year. Everything in the example therefore
runs it through
[`sunHoursPerDay`](src/app/weather/climate/utils.ts) and shows it as hours per
day.

### Weather — Warnings

Shows the severe weather warned about at a point on the map with the
[Weather Warnings API](https://platform.infoplaza.com/reference/v1-weather-warnings).

Warnings have no geometry: the API answers for a coordinate, not for an area.
The [map](src/app/weather/warnings/components/warnings-map.tsx) is therefore a
picker with a single marker, and the marker carries the answer — it takes the
colour of the severest warning in force and shows how many there are, grey when
the location has none. Clicking the map or dragging the pin looks the new spot
up through a [route handler](src/app/weather/warnings/lookup/route.ts) that adds
`INFOPLAZA_API_KEY` server-side, and the warnings for the location the page
opens on are fetched during server rendering, so the page arrives with content.

A location is often covered by several services at once, and each of them
reissues a warning as its forecast firms up, so the same warning comes back
several times — unchanged apart from a newer `created`, or simply repeated.
Around Milan that turns one heat warning into nine rows, so
[`weatherWarnings`](src/app/weather/warnings/api.ts) collapses identical
warnings and keeps the most recent issue of each. Warnings that have not
started yet arrive alongside the active ones as `active: false`; they are kept
and marked as upcoming.

Each warning carries a numeric `level`, which is the colour code European
services warn in — green, yellow, orange, red — and the titles name the same
colours, so the palette in [`utils.ts`](src/app/weather/warnings/utils.ts)
keeps the pills and the pin in step with the text beside them. The language
select changes the `language` parameter the API writes its titles and texts in
and looks the current location up again, so the two cannot drift apart.

Note that no warnings is the normal answer for most places most of the time.

### Geo — Geo Nearby

Finds the places around a point on the map with the
[Geo Nearby API](https://platform.infoplaza.com/reference/v1-geo-nearby).

That API answers with a single place: the most prominent one within the
`radius` asked for. Widening the radius does not add places, it swaps the
answer for a bigger one — around Houten a 1 km radius returns Houten, 8 km
returns Utrecht and 64 km returns Amsterdam. Learning what is around a point
therefore takes several calls, so
[`nearbyPlaces`](src/app/geo/nearby/api.ts) asks the radii in `SEARCH_RADII`
in parallel and deduplicates the answers, keeping the tightest circle each
place was found in. Change that list to trade calls for detail: one click on
the map costs one call per radius.

An empty search comes back as an error rather than as an empty result, so a
radius that finds nothing drops out quietly. Failing radii only surface as an
error when not a single one succeeded, which is what makes a wrong API key or
an outage still visible.

Clicking the map picks a location, marked with a pin that can be dragged to
adjust it; the places found around it are drawn as dots on the
[map](src/app/geo/nearby/components/nearby-map.tsx) and listed next to it, with
the distance from the pin worked out client-side from the two coordinates.
Picking a place, on the map or in the list, shows the country, continent,
timezone and coordinates the API returned for it. The browser calls a
[route handler](src/app/geo/nearby/places/route.ts) that adds
`INFOPLAZA_API_KEY` server-side, and the places for the location the page opens
on are fetched during server rendering, so the page arrives with content.

### Geo — Geo Search

Looks up a place by name with the
[Geo Search API](https://platform.infoplaza.com/reference/v1-geo-search) and
shows every match twice: as a list and as numbered markers on the map.

A search runs when the form is submitted, so typing costs no requests. The
language select changes the `language` parameter the API translates its country
and continent names with, and re-runs the last submitted term so the names on
screen always match it.
The endpoint takes the key as a query parameter, so the browser calls a
[route handler](src/app/geo/search/places/route.ts) that adds
`INFOPLAZA_API_KEY` server-side. The results for the term the page opens on are
fetched during server rendering, so the page arrives with content.

A search returns places anywhere on earth — "Utrecht" also matches towns in
South Africa and Suriname — so the
[map](src/app/geo/search/components/places-map.tsx) frames whatever came back
with `fitBounds` instead of holding a fixed view. Picking a result, in the list
or on the map, highlights it in both. Each row also shows the current time at
that place, from the IANA timezone the API returns alongside the coordinates.

### Marine — Ports

Puts every seaport in the world on a sea chart with the
[Port List API](https://platform.infoplaza.com/reference/v1-port-list), and
answers for the one that is clicked with the
[Port Info API](https://platform.infoplaza.com/reference/v1-port-info).

Both endpoints take the key as a query parameter, so the browser calls the
route handlers in [`list/`](src/app/marine/ports/list/route.ts) and
[`info/`](src/app/marine/ports/info/route.ts), which add `INFOPLAZA_API_KEY`
server-side. Everything is fetched from the browser, the opening state
included, so the page itself is static and its HTML does not carry a list of
up to 3,700 ports.

The list endpoint hands over a whole size grade at once, from 170 large ports
to 2,134 very small ones, and takes several grades in one call as a
comma-separated `size` — repeating the parameter keeps only the last value.
Nearly 3,700 dots is more than DOM markers can pan smoothly, so the
[chart](src/app/marine/ports/components/ports-map.tsx) draws them as a GeoJSON
source with a circle layer, sized per grade. The active port is the same
source drawn again through a second layer filtered to its id, which is cheaper
than rewriting the data on every click.

The basemap is OpenStreetMap with the
[OpenSeaMap](https://www.openseamap.org/) seamark tiles over it — buoys,
beacons and lights, which appear from zoom 9 in, where the overlay has
something to draw.

Port Info answers with a hundred-odd fields, most of them "Yes", "No" or
"Unknown" rather than booleans. The
[details](src/app/marine/ports/components/port-details.tsx) keep that third
answer visible instead of reading it as a no: an unsurveyed port is not a port
without cranes. A port id that does not exist is not an error to the endpoint
— it answers 200 with an `error` string where the port should be — so
[`portInfo`](src/app/marine/ports/api.ts) turns that into a real failure.

### Marine — Shipping

Lays a voyage out on the sea chart and reads the weather along it with the
[Shipping Route API](https://platform.infoplaza.com/reference/v1-marine-shipping-route),
then answers for a single waypoint with the
[Shipping Point API](https://platform.infoplaza.com/reference/v1-marine-shipping-point).

Both endpoints take the key as a query parameter, so the browser calls the
route handlers in [`route/`](src/app/marine/shipping/route/route.ts) and
[`point/`](src/app/marine/shipping/point/route.ts), which add
`INFOPLAZA_API_KEY` server-side.

Clicking the [chart](src/app/marine/shipping/components/shipping-map.tsx) adds
a waypoint, dragging one moves it, and clicking one asks for the point
forecast there. The waypoints are DOM markers rather than a layer: there are
only ever a handful, MapLibre already drags markers, and their clicks never
reach the map — which is what keeps selecting a waypoint from dropping a new
one underneath it. A drag ends with a click on the marker, so the marker
remembers it was dragged and lets that one go. The track and its hourly
positions are a GeoJSON source, redrawn whenever the voyage changes. The 2D/3D
switch is the map's projection: mercator is the flat chart, globe is the
sphere it is drawn from, which is worth seeing on a long leg — a great circle
is a curve on the flat map and a straight line on the globe.

The route request takes the waypoints, a departure, a speed and a routing.
Three things about it are worth knowing:

- `speeds` is per leg, and takes a value for every waypoint or one fewer and
  nothing else, so the single speed the form offers is repeated across the
  legs in [`shippingRoute`](src/app/marine/shipping/api.ts).
- `speeds` is in knots, whatever the reference says: a voyage asked for at 30
  comes back covering 15.4 metres a second, which is 30 knots and not 30 km/h.
- `distance` and `distanceTime` are measured from the last waypoint rather
  than from the departure, so both start over at every waypoint.
  [`sailedDistances`](src/app/marine/shipping/utils.ts) adds the legs up, and
  the passage is taken as the time from leaving to arriving.

Leaving the departure empty is not a missing departure: the API reads no
`start` as leaving now, and answers with the moment it used. `Date.parse`
would not have said so — it reads an empty field as `":00Z"` and hands back
the first of January 2000 — so the field is checked for shape before it is
parsed.

Both endpoints answer in the same shape: a list of elements, each one quantity
from one model with its own unit and an array of values. A row of either
[table](src/app/marine/shipping/components/forecast-tables.tsx) is one index
into all of those arrays, which is why the two tables share their cells. The
columns are the nine readings a bridge works from; clicking a row opens the
other fifteen underneath it, per model. An element the API could not answer —
the currents are regularly a run behind — comes back with an `error` and an
empty array, which is shown as unanswered rather than failing the forecast.

The route forecast reads one hour at each position; the point forecast is the
whole model run at one spot, so the hours either side of the passage can be
read as well. The hour the ship is there is marked and scrolled to.

### Mobility — Transit Planner

Streams travel results between two locations in real time using the
[Transit Planner Mixer API](https://platform.infoplaza.com/reference/v1-transit-plannermixer),
a WebSocket endpoint that speaks Protocol Buffers.

The browser never talks to the API directly: it opens an `EventSource` on a
small [proxy](src/app/mobility/transit-planner/stream/route.ts) on our own
server with the plan request in the query string. The proxy opens the upstream
WebSocket to `api.infoplaza.com` with the API key from `INFOPLAZA_API_KEY`,
decodes each protobuf `PlanResult` message and sends it to the browser as a
server-sent event until the mixer is done. This keeps the API key on the
server.

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
in one place. Hovering a shape opens a tooltip with the same fields the list
row shows, which follows the cursor along the road and lets clicks through to
the shape underneath. Selecting an event, on the map or in the list, thickens
its shape and zooms to it.

See the [repository README](../README.md) for an overview of all planned implementations.
