import { createServer } from "node:http";
import next from "next";
import {
  handlePlannerMixerUpgrade,
  PLANNER_MIXER_PROXY_PATH,
} from "./src/app/mobility/planner-mixer/proxy/socket";

/**
 * Custom server so we can accept WebSocket connections. Next.js route
 * handlers cannot upgrade to WebSockets, so this server routes upgrade
 * requests for the Planner Mixer proxy to our own handler and leaves
 * everything else (pages, assets, HMR in dev) to Next.js.
 */

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev });

app.prepare().then(() => {
  const handleRequest = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();

  const server = createServer(handleRequest);

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    if (pathname === PLANNER_MIXER_PROXY_PATH) {
      handlePlannerMixerUpgrade(request, socket, head);
    } else {
      handleUpgrade(request, socket, head);
    }
  });

  server.listen(port, () => {
    console.log(`Ready on http://localhost:${port}`);
  });
});
