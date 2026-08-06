import { portInfo } from "../api";

/**
 * Port info proxy for the map.
 *
 * The browser calls this route with the id of the port that was clicked; it
 * forwards it to the Port Info API with the API key from INFOPLAZA_API_KEY
 * and returns what the index holds on that port. The key stays server-side.
 */
export async function GET(request: Request) {
  const portId = Number(new URL(request.url).searchParams.get("portId"));

  if (!Number.isInteger(portId)) {
    return Response.json(
      { error: "portId is required and must be a whole number." },
      { status: 400 },
    );
  }

  try {
    return Response.json({ port: await portInfo(portId) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load port.";
    return Response.json({ error: message }, { status: 502 });
  }
}
