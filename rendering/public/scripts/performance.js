/**
 * Ultra-minimal performance monitoring script
 * Designed to have zero impact on Total Blocking Time
 */

// Avoid defining any variables in the global scope
(() => {
  // Don't run in development mode
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    return;

  // Use requestIdleCallback to defer monitoring setup until the browser is idle
  if (window.requestIdleCallback) {
    window.requestIdleCallback(
      () => {
        setupMinimalMonitoring();
      },
      { timeout: 2000 },
    );
  } else {
    // Fallback with a long timeout to ensure page is fully loaded first
    setTimeout(setupMinimalMonitoring, 3000);
  }

  function setupMinimalMonitoring() {
    // Only monitor the most critical metrics with minimal processing
    try {
      if ("PerformanceObserver" in window) {
        // Just collect LCP timing with no processing
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            // Do minimal processing to avoid blocking
            if (lastEntry.startTime > 0) {
              // In production, you could send this data to analytics
              // but don't do any processing here
              lcpObserver.disconnect();
            }
          }
        });

        // Only observe LCP
        lcpObserver.observe({
          type: "largest-contentful-paint",
          buffered: true,
        });
      }
    } catch (e) {
      // Silently fail - performance monitoring should never break the site
    }
  }
})();
