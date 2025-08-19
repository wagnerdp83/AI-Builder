/**
 * Layout optimization script to prevent cumulative layout shift
 * This helps to improve Core Web Vitals metrics
 */

document.addEventListener("DOMContentLoaded", () => {
  const ric =
    window.requestIdleCallback ||
    ((cb) => {
      const start = Date.now();
      return setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
      }, 1);
    });

  const executeLayoutOptimizations = () => {
    // Ensure aspect ratios are respected for images without explicit dimensions
    const fixImageAspectRatios = () => {
      // Find all images that don't have explicit width/height but have data attributes
      const images = document.querySelectorAll(
        'img:not([style*="aspect-ratio"])',
      );

      images.forEach((img) => {
        const width = img.getAttribute("width");
        const height = img.getAttribute("height");

        // Only proceed if we have both dimensions
        if (width && height) {
          const numWidth = parseFloat(width);
          const numHeight = parseFloat(height);
          if (
            isNaN(numWidth) ||
            isNaN(numHeight) ||
            numWidth === 0 ||
            numHeight === 0
          )
            return;

          const aspectRatio = numHeight / numWidth;

          // Apply aspect ratio using modern CSS when possible
          if ("aspectRatio" in document.body.style) {
            img.style.aspectRatio = `${numWidth} / ${numHeight}`;
          } else {
            // Fallback for browsers that don't support aspect-ratio
            const parent = img.parentElement;
            if (parent && !parent.style.position) {
              parent.style.position = "relative";
              parent.style.paddingBottom = `${aspectRatio * 100}%`;
              img.style.position = "absolute";
              img.style.top = "0";
              img.style.left = "0";
              img.style.width = "100%";
              img.style.height = "100%";
            }
          }
        }
      });
    };

    // Prevent layout shifts from font loading
    const preventFontLayoutShift = () => {
      if (!("fonts" in document)) return;
      let fontsLoaded = false;

      document.fonts.ready
        .then(() => {
          document.documentElement.classList.add("fonts-loaded");
          fontsLoaded = true;
        })
        .catch(() => {
          // Fallback even if promise rejects
          document.documentElement.classList.add("fonts-loaded");
          fontsLoaded = true;
        });

      // Timeout fallback in case fonts take too long or promise doesn't resolve
      setTimeout(() => {
        if (!fontsLoaded) {
          document.documentElement.classList.add("fonts-loaded");
        }
      }, 3000); // Increased timeout slightly
    };

    // Measure and report layout shifts
    const monitorLayoutShifts = () => {
      if (!("PerformanceObserver" in window)) return;

      try {
        // Create a layout shift observer
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Log layout shifts for debugging
            if (entry.hadRecentInput) continue;

            console.debug("Layout shift detected:", {
              value: entry.value.toFixed(4),
              sources: entry.sources || [],
              elements: entry.sources
                ? entry.sources.map((source) => source.node)
                : [],
            });
          }
        });

        // Start observing layout shifts
        observer.observe({ type: "layout-shift", buffered: true });
      } catch (e) {
        // console.error('Layout shift monitoring failed:', e);
      }
    };

    // Initialize content visibility for off-screen elements
    const initContentVisibility = () => {
      if (!("IntersectionObserver" in window)) return;

      const sections = document.querySelectorAll('[data-cv="auto"]');
      if (sections.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const targetElement = entry.target;
            if (entry.isIntersecting) {
              targetElement.style.contentVisibility = "visible"; // Changed from auto for immediate rendering
              // No need to set contain here if it forces re-layout, let CSS handle it or be more specific.
            } else {
              // When far from viewport, turn off content-visibility for better performance
              if (
                Math.abs(entry.boundingClientRect.top) >
                window.innerHeight * 2
              ) {
                targetElement.style.contentVisibility = "hidden";
              }
            }
          });
        },
        {
          rootMargin: "200px 0px",
          threshold: 0.01, // Changed from 0 to ensure some part is visible
        },
      );

      sections.forEach((section) => {
        observer.observe(section);
      });
    };

    // Run our layout optimization functions
    // requestAnimationFrame is good for visual changes like fixImageAspectRatios
    requestAnimationFrame(() => {
      fixImageAspectRatios();
    });

    preventFontLayoutShift();
    initContentVisibility();

    // Only run in development or if debugging is enabled
    if (
      window.location.hostname === "localhost" ||
      localStorage.getItem("debug")
    ) {
      monitorLayoutShifts();
    }
  };

  // Delay execution slightly after DCL
  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    ric(executeLayoutOptimizations, { timeout: 150 }); // Slightly longer timeout than preload
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      ric(executeLayoutOptimizations, { timeout: 150 });
    });
  }
});
