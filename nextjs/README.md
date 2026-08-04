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
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with sidebar
│   │   ├── page.tsx                    # Home page listing all examples
│   │   └── mobility/
│   │       └── planner-mixer/          # One example, everything together
│   │           ├── page.tsx            #   Page
│   │           ├── api.ts              #   Planner Mixer WebSocket client
│   │           ├── proxy/socket.ts     #   WebSocket proxy the browser calls
│   │           ├── utils.ts            #   Example-specific helpers
│   │           ├── components/         #   Example-specific components
│   │           └── proto/              #   Protobuf message definitions
│   ├── components/                     # Shared components (sidebar)
│   └── lib/
│       └── examples.ts                 # Registry of all examples
├── public/                             # Static assets
└── package.json
```

Because WebSocket upgrades are not supported by Next.js route handlers, this
project runs a small [custom server](server.ts): it routes upgrade requests
for the Planner Mixer proxy to our own handler and leaves everything else to
Next.js. `npm run dev` and `npm run start` both run this server (via `tsx`).
Note that this requires a Node.js host — serverless platforms do not support
WebSockets.

## Examples

### Mobility — Planner Mixer

Streams travel results between two coordinates in real time using the
[Transit Planner Mixer API](https://platform.infoplaza.com/reference/v1-transit-plannermixer),
a WebSocket endpoint that speaks Protocol Buffers.

The browser never talks to the API directly: it opens a WebSocket to a small
[proxy](src/app/mobility/planner-mixer/proxy/socket.ts) on our own server and
sends one JSON message with the plan request. The proxy opens the upstream
WebSocket to `api.infoplaza.com` with the API key from `INFOPLAZA_API_KEY`,
decodes each protobuf `PlanResult` message and forwards it to the browser as
JSON until the mixer is done. This keeps the API key on the server.

The protobuf schema lives in
[`proto/`](src/app/mobility/planner-mixer/proto/); `proto.json` is generated
from the `.proto` files with:

```bash
npx -p protobufjs-cli pbjs -t json PlanRequest.proto PlanResult.proto PlanService.proto -o proto.json
```

See the [repository README](../README.md) for an overview of all planned implementations.
