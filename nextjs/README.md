# Infoplaza Platform — Next.js Example

Example implementation of the [Infoplaza Platform API](https://platform.infoplaza.com/) using [Next.js](https://nextjs.org/) (App Router, TypeScript) and [Tailwind CSS](https://tailwindcss.com/).

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
│   │   ├── api/
│   │   │   ├── platform/               # Handler the component library fetches from
│   │   │   │   └── [...platform]/route.ts
│   │   │   └── platform-log/route.ts   #   What it forwarded, for the API log
│   │   ├── weather/
│   │   │   ├── charts/
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── utils.ts            #   Types and coordinate helpers
│   │   │   │   └── components/         #   Map, tabs, hourly table and ensemble graph
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
│   │   │   ├── maps/
│   │   │   │   ├── page.tsx            #   Page
│   │   │   │   ├── utils.ts            #   View state and layer defaults
│   │   │   │   └── components/         #   Panel and the composed weather map
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
│   │   │   │   ├── place/route.ts      #   Nearby proxy the browser calls
│   │   │   │   ├── utils.ts            #   Types, radii and formatting helpers
│   │   │   │   └── components/         #   Panel and map
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
│   ├── proxy.ts                        # Handing each page the token its fetches carry
│   ├── components/                     # Shared components
│   │   ├── sidebar.tsx                 #   Navigation down the left
│   │   ├── example-page.tsx            #   The frame every example page uses
│   │   └── api-log.tsx                 #   The API request drawer on the right
│   └── lib/
│       ├── examples.ts                 # Registry of all examples
│       ├── platform.ts                 # Calling the Platform, server-side
│       ├── route-guard.ts              # The gate in front of the route handlers
│       ├── frontend-token.ts           # The token that gate asks for
│       ├── api-call.ts                 # What one recorded call looks like
│       ├── api-log.ts                  # The recorded calls, browser-side
│       ├── platform-proxy.ts           # The component library's calls, server-side
│       └── platform-proxy-log.ts       # Collecting those into the log, browser-side
├── public/                             # Static assets
│   └── weather-icons/                  # The extended weather icon set, one SVG per code
└── package.json
```

The Transit Planner decodes protobuf messages from
[`proto/proto.json`](src/app/mobility/transit-planner/proto/proto.json), which is
compiled from the `.proto` files next to it. After changing one of those, run
`npm run proto` to regenerate it.

Every example talks to the Platform the same way, through
[`src/lib/platform.ts`](src/lib/platform.ts). It attaches the API key, unwraps
the envelope the endpoints answer in, and records the call. The route handlers
wrap their work in `apiRoute` from the same module, which returns the payload
with the calls that produced it and turns a failure into a status.

`apiRoute` is also where the gate in front of the handler goes, which is what
keeps its URL from working anywhere but here: the handler attaches the key, so
`/geo/nearby/place?lat=52.02&lon=5.16&radius=10000` would otherwise be a
working, key-free copy of a paid endpoint for anyone who has seen it.
[`src/lib/route-guard.ts`](src/lib/route-guard.ts) refuses a request that did
not come from this origin, one that carries no token this app minted
([`src/proxy.ts`](src/proxy.ts) hands each page a fresh one in an HttpOnly
cookie) and one from a caller that has asked too often. A new example is
covered by writing it: the gate comes with `apiRoute`, and the three routes
that cannot go through it — the mounted handler, the log collection and the
Transit Planner stream — call the guard themselves. What each check is worth is
under [Before you deploy this publicly](#before-you-deploy-this-publicly).

Those recordings are what fills the **API requests** drawer on the right of
every example page. The calls that matter are made on the server, so the
browser's own network tab shows nothing but the route handler in front of them;
the drawer shows the real ones — the URL with the key replaced by a
placeholder, the parameters, how long it took, what it cost in credits and the
answer that came back, with a cURL command to try it yourself. The cost is not
a guess: every REST answer reports it in `meta.credits`, and the drawer totals
those for the visit. Pages that load their opening state while rendering pass
those calls to
[`ExamplePage`](src/components/example-page.tsx), so the drawer is filled before
anything has been clicked. The log holds one visit to one example: opening
another one empties it, so what is listed is always what the example on screen
has asked. The Transit Planner has no request and response to
record, so its route sends the whole socket exchange as an `api-call` event on
the stream instead.

The two examples built on the component library are the exception. Their
components fetch for themselves, so there is no answer for a recording to ride
along with. The mounted handler files what it forwarded in
[`src/lib/platform-proxy.ts`](src/lib/platform-proxy.ts) instead, and the pages
collect those from
[`/api/platform-log`](src/app/api/platform-log/route.ts) for as long as they are
open. The call is made inside the package, so the handler watches it rather
than making it: `fetch` is wrapped for the duration of the request, which is
what gives the drawer the URL that went out, the answer as the Platform gave it
and the credits in it. Watching is the only place that cost can still be read,
because the package unpacks the envelope carrying it before its components ever
see the payload.

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
4. Optionally add `FRONTEND_TOKEN_SECRET` — any long random string — which is
   what the token in front of the route handlers is signed with. Without it
   that signing key is derived from the API key, so the deployment works
   either way; setting it means rotating one does not invalidate the other.

Other hosts work the same way — point the build at the `nextjs/` directory. The
project needs no custom server, so anything that runs a standard Next.js build
will do.

### Before you deploy this publicly

The route handlers attach your `INFOPLAZA_API_KEY` and forward the request, so
their URLs are a working copy of a paid endpoint that needs no key of its own.
Three checks stand in front of them, in
[`src/lib/route-guard.ts`](src/lib/route-guard.ts), and they are worth
different amounts:

- **The request has to come from this origin.** A browser sets `Sec-Fetch-Site`
  itself and refuses to let a page override it, so no site of someone else's
  can have a visitor's browser call these routes and read the answer. This is
  the check that holds completely, and it holds against the case worth holding
  against: another party wiring these URLs into their own front end.
- **The request has to carry a token this app minted.** Every page is served
  one, signed and short-lived, in an HttpOnly cookie
  ([`src/proxy.ts`](src/proxy.ts),
  [`src/lib/frontend-token.ts`](src/lib/frontend-token.ts)). A copied URL
  therefore stops working on its own: a caller has to load a page, keep the
  cookie and come back before it runs out.
- **A caller may only ask so often.** 120 requests a minute per address, far
  more than clicking through the examples takes.

None of that makes the routes callable only from this front end — anything a
browser sends, a program can send too, and a script driving a real browser gets
through all three. The rate limit is the weakest of them here, because it is
counted in memory and a serverless host answers from as many instances as it
likes, each with a count of its own: a limit that really holds belongs in front
of the app, in the host's firewall (on Vercel, Firewall → Rate limiting). And
one property is unchanged by any of this:

- **The API log is shared between visitors.** The Platform calls behind the
  component-library examples are kept in one server-wide list
  ([`src/lib/platform-proxy.ts`](src/lib/platform-proxy.ts)) that is handed out
  and cleared on collection, so one visitor can be shown another's requests and
  responses. The key itself is always redacted; the URLs, coordinates and
  payloads are not.

So the gate is what keeps a public deployment from being an open API key. A
deployment that has to be private still belongs behind authentication.

## Examples

### Weather — Forecast

Shows the weather forecast for a point on the map with the
[Weather Forecast API](https://platform.infoplaza.com/reference/v1-weather-forecast).

One call returns five blocks at once, what it is doing now and then the coming
minutes, hours, dayparts and days, so the four tabs under the map cost one
request between them rather than one each. How much of each block comes back is
set by the `max_*` parameters, and the picker beside the tabs sets the one
belonging to the tab that is open. The sizes each block offers are listed with
it in `BLOCKS` in [`utils.ts`](src/app/weather/forecast/utils.ts), the API's own
default first and its ceiling last: 120 minutes, 168 hours, 30 dayparts, 15
days. Leaving all four at their default keeps a call at 1 credit, and raising
any single one of them puts the whole call at 3, which the API log at the bottom
of the page shows happening.

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

### Weather — Maps

Draws the weather models on a map with
[`@infoplaza/platform`](https://github.com/infoplaza/platform-components), the
component library for the Platform.

Everything on the map comes from the package. `Providers` holds the weather
configuration and loads the model catalog, `BaseMap` draws the basemap and
hands down the `beforeId` the weather layers have to be inserted under so they
land below the labels, `MapEventsProvider` turns the camera and the selected
moment into the tile requests that answer it, `LayerComposer` turns those into Deck.gl
layers, `Overlay` puts them on the map and `MapControlHud` is the panel that
changes the model, the layer and the time. What
[this example writes](src/app/weather/maps/components/weather-map.tsx) is the
composition around them, a basemap picker and the route they fetch through.

The components fetch for themselves, from the browser, and they all fetch from
one place. The package ships its own catch-all route handler, mounted once at
[`src/app/api/platform/[...platform]/route.ts`](src/app/api/platform/%5B...platform%5D/route.ts),
which attaches `INFOPLAZA_API_KEY` and forwards to the Platform, so the key
stays server-side here as it does everywhere else. Mounting it is not optional:
without it the components have no models and nothing to draw.

Two things this example needs that the others do not. The package is compiled
with the app, through `transpilePackages` in [`next.config.ts`](next.config.ts).
And there has to be one MapLibre: the package depends on MapLibre 5 while this
app is on 6, and a MapLibre 5 navigation control added to a MapLibre 6 map
reads a property that is no longer there, which takes the page down with it.
The `overrides` block in [`package.json`](package.json) points the package at
the app's MapLibre so there is a single copy of it.

### Weather — Charts

Reads the models at a point as two charts from the same
[component library](https://github.com/infoplaza/platform-components), with the
[Weather Timeseries API](https://platform.infoplaza.com/reference/v1-weather-timeseries-point)
and the
[Weather Ensemble API](https://platform.infoplaza.com/reference/v1-weather-ensemble-point).

`TimeseriesForecast` is the hour by hour one: a toolbar to pick the model, the
run and the group of elements, the table itself, and a footer under it. Every
cell carries the colour the Platform gives that value, which is what makes the
table read as a chart rather than as a grid of numbers. `EnsembleForecast` is
the same composition over an ensemble, a model run many times over from
slightly different starting conditions: it draws the range the members leave
between them, so a plume that stays narrow is a forecast to trust and one that
fans out is the model saying it does not know yet.

The two sit behind tabs, and only the one on screen is mounted. Each of them
asks for its own catalog and its own point forecast, so the tab that is closed
has asked the Platform for nothing: opening the page, or moving the pin, pays
for the chart being looked at rather than for both.

Both take a `lat` and a `lon` and do the rest themselves, the catalog for that
point first and then the forecast for whichever model is selected. The location comes
from the same picker as the other examples,
[a map with a pin](src/app/weather/charts/components/charts-map.tsx) to click
or drag, rather than from the package: the map on the Maps page is the
package's own and arrives with its layers and its control panel, which is more
than picking a point needs. Which models reach a location differs, so a new
pick remounts both charts rather than leaving a model selected that may not
cover it.

Both fetch through the same mounted handler as the Maps example, and the
requests they make land in the API log the same way.

### Geo — Geo Nearby

Finds the place around a point on the map with the
[Geo Nearby API](https://platform.infoplaza.com/reference/v1-geo-nearby).

That API answers with a single place: the most prominent one within the
`radius` asked for. Widening the radius does not add places, it swaps the
answer for a bigger one. Around Houten 2 km returns Houten, 10 km returns
Utrecht and 50 km returns Amsterdam, so the radius is the one thing worth
choosing. It sits in a select below the map, and every lookup costs a single
call whichever radius is picked.

`RADIUS_OPTIONS` in [`utils.ts`](src/app/geo/nearby/utils.ts) is the list the
select offers; add your own there. The endpoint wants at least 1 km and stops
somewhere past 250 km, and answers a radius outside that range with an error
rather than with an empty result, which is why the
[route handler](src/app/geo/nearby/place/route.ts) only passes on the radii in
that list. A search that finds nothing, over open sea or with a radius too
tight to reach the nearest place, does come back as a success with an empty
payload, so the only thing that surfaces as an error is a genuine failure such
as a wrong API key or an outage.

Clicking the map picks a location, marked with a pin that can be dragged to
adjust it. The circle around the pin is the radius being asked about, and the
place found inside it is drawn as a dot on the
[map](src/app/geo/nearby/components/nearby-map.tsx) and described next to it,
with the distance from the pin worked out client-side from the two
coordinates. The browser calls a
[route handler](src/app/geo/nearby/place/route.ts) that adds
`INFOPLAZA_API_KEY` server-side, and the place for the location the page opens
on is fetched during server rendering, so the page arrives with content.

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
[Transit I'm Planner API](https://platform.infoplaza.com/reference/v1-transit-implanner),
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
