import type { Metadata } from "next";
import { ApiLink, ExamplePage } from "@/components/example-page";
import { ShippingPanel } from "./components/shipping-panel";

export const metadata: Metadata = {
  title: "Shipping — Infoplaza Platform Examples",
};

/**
 * The page itself only holds the copy: the map needs a browser, and both
 * forecasts on it are fetched from there too, through the route handlers next
 * to the panel. So nothing here waits on the API, and the API log starts
 * empty until the panel asks its first question.
 */
export default function ShippingPage() {
  return (
    <ExamplePage
      group="Marine"
      title="Shipping"
      intro={
        <>
          Plan a voyage on a sea chart with the{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-marine-shipping-route">
            Shipping Route
          </ApiLink>{" "}
          and{" "}
          <ApiLink href="https://platform.infoplaza.com/reference/v1-marine-shipping-point">
            Shipping Point
          </ApiLink>{" "}
          APIs. Lay out waypoints, set the departure, the speed and the
          routing, and read the wind, sea and swell at every position at the
          hour the ship is there. Click a waypoint for the full forecast at
          that spot.
        </>
      }
    >
      <ShippingPanel />
    </ExamplePage>
  );
}
