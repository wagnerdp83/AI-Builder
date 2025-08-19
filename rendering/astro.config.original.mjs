/**
 * This is a specialized Astro configuration for Lighthouse testing
 * It disables all features that might interfere with Lighthouse TTI measurements
 */

import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/data/constants";

export default defineConfig({
  site: SITE.url,
  // Minimal integrations - only what's necessary
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  // Static output
  output: "static",
  // Inline critical CSS
  build: {
    inlineStylesheets: "auto",
  },
  // Optimize Vite config for performance
  vite: {
    build: {
      // CSS optimization
      cssMinify: "lightningcss",
      // Terser minification
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          passes: 2,
        },
        mangle: true,
      },
      // Disable sourcemaps - smaller bundle size
      sourcemap: false,
      // Additional optimizations
      assetsInlineLimit: 2048, // Inline small assets
      modulePreload: false, // Disable module preload
      // Very simple chunking strategy
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    // More CSS optimizations
    css: {
      devSourcemap: false,
    },
    // SSR optimizations
    ssr: {
      // Keep Preline as external
      external: ["preline"],
    },
  },
  // Enable HTML compression
  compressHTML: true,
});
