/**
 * Micro Lazy Component Initialization
 * Optimized to minimize Total Blocking Time
 */

// Use a lighter implementation
(() => {
  // Wait for DOM to be interactive before setting up
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLazyInit, {
      once: true,
      passive: true,
    });
  } else {
    // Use requestIdleCallback or setTimeout to defer non-critical work
    if (window.requestIdleCallback) {
      requestIdleCallback(setupLazyInit, { timeout: 1000 });
    } else {
      setTimeout(setupLazyInit, 20);
    }
  }

  function setupLazyInit() {
    // Only proceed if HSStaticMethods is available
    if (!window.HSStaticMethods) return;

    // Process only visible accordion/tab elements initially
    const visibleElements = [
      ...document.querySelectorAll("[data-hs-accordion], [data-hs-tabs]"),
    ].filter((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    });

    // Initialize visible elements immediately
    if (visibleElements.length > 0) {
      window.HSStaticMethods.autoInit(["accordion", "tabs"], {
        hideOnDeactivate: true,
        visibleOnly: true,
      });
    }

    // Set up lightweight scroll detection for remaining elements
    let lastScrollTop = window.scrollY;
    let scrollTimeout;

    const scrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Only initialize if we've scrolled significantly
        if (Math.abs(window.scrollY - lastScrollTop) > 100) {
          lastScrollTop = window.scrollY;
          window.HSStaticMethods.autoInit(["accordion", "tabs"], {
            hideOnDeactivate: true,
            visibleOnly: true,
          });
        }
      }, 100);
    };

    // Use passive scroll listener to improve performance
    window.addEventListener("scroll", scrollHandler, { passive: true });
  }
})();
