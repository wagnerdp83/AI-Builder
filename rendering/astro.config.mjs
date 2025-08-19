/**
 * This is a specialized Astro configuration for Lighthouse testing
 * It disables all features that might interfere with Lighthouse TTI measurements
 */

import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/data/constants";

// Environment-based configuration
const isProduction = process.env.NODE_ENV === "production";
const PORT = parseInt(process.env.PORT || "4321", 10);
const INTERFACE_URL = process.env.INTERFACE_URL || "http://localhost:3000";

export default defineConfig({
  site: SITE.url,
  // Minimal integrations - only what's necessary
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  // Static output for landing pages
  output: "static",
  // Enable image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});
