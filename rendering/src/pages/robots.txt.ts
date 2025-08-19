import type { APIRoute } from "astro";
import { SITE } from "../data/constants";

export const prerender = true;

export function GET() {
  return new Response(
    `User-agent: *
Allow: /

# Performance optimizations
Disallow: /_assets/*.js
Disallow: /_assets/*.css

# Sitemap
Sitemap: ${SITE.url}/sitemap-index.xml`,
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
