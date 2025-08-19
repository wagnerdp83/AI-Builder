/**
 * Middleware for Astro to optimize performance
 */

// Server-side middleware for optimized responses
export function onRequest({ request, locals }, next) {
  // Start performance measurement
  const requestStart = Date.now();

  // Set up response headers for better performance
  locals.responseHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  // Add cache control for static assets
  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|css|js|woff2|woff|ttf|eot)$/)
  ) {
    locals.responseHeaders["Cache-Control"] =
      "public, max-age=31536000, immutable";
  } else if (path.match(/\.(html|xml|json)$/)) {
    locals.responseHeaders["Cache-Control"] = "public, max-age=3600";
  } else {
    locals.responseHeaders["Cache-Control"] = "public, max-age=600";
  }

  // Process the request
  const response = next();

  // Apply our headers to the response
  response.then((res) => {
    // Add all headers from locals
    Object.entries(locals.responseHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });

    // Add Server-Timing header for performance debugging
    const requestTime = Date.now() - requestStart;
    res.headers.set("Server-Timing", `total;dur=${requestTime}`);

    return res;
  });

  return response;
}
