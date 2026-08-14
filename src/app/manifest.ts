import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Web app manifest, so Bunchy can be installed to a phone's home screen.
 *
 * This is a product where the thing you are trying to do — see whether anyone
 * is free tonight — happens on a phone, standing somewhere, deciding whether to
 * go out. An icon on the home screen is the difference between that and
 * remembering a URL.
 *
 * `display: standalone` drops the browser chrome, which matters mainly because
 * the address bar is the most reliable way to make a web app feel like a
 * website you have to visit rather than a thing you have.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name}, ${brand.tagline}`,
    short_name: brand.name,
    description: brand.subtitle,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The canvas token from globals.css. The splash screen is painted with this
    // before any CSS loads, so a mismatch here shows as a flash of the wrong
    // colour on every cold start.
    background_color: "#fff9f3",
    theme_color: "#fff9f3",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
