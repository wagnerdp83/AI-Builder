/**
 * Critical resource preloading script
 * This helps improve performance by selectively preloading critical assets
 */

document.addEventListener("DOMContentLoaded", () => {
  // Check if browser supports requestIdleCallback
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

  const executePreloading = () => {
    const preloadCriticalImages = () => {
      // Find visible critical images (above the fold)
      const criticalImages = [
        ...document.querySelectorAll('img[fetchpriority="high"]'),
        ...Array.from(document.querySelectorAll("img")).filter((img) => {
          if (!img.isConnected) return false; // Ensure image is in DOM
          const rect = img.getBoundingClientRect();
          return (
            rect.top < window.innerHeight && rect.height > 0 && rect.width > 0
          );
        }),
      ];

      if (criticalImages.length === 0) return;

      // Preload each critical image
      ric(
        () => {
          const fragment = document.createDocumentFragment();

          criticalImages.forEach((img) => {
            const imgSrc = img.dataset.src || img.currentSrc || img.src;
            if (
              !imgSrc ||
              img.classList.contains("lazyloaded") ||
              img.classList.contains("loaded")
            )
              return;

            const preloadLink = document.createElement("link");
            preloadLink.rel = "preload";
            preloadLink.as = "image";
            preloadLink.href = imgSrc;
            if (img.getAttribute("fetchpriority") === "high") {
              preloadLink.fetchpriority = "high";
            }
            // Add imageset for responsive preloading if applicable
            if (img.srcset) {
              preloadLink.imageSrcset = img.srcset;
              preloadLink.imageSizes = img.sizes;
            }

            fragment.appendChild(preloadLink);
          });

          if (fragment.childNodes.length > 0) {
            document.head.appendChild(fragment);
          }
        },
        { timeout: 500 },
      );
    };

    const preloadCriticalFonts = () => {
      // Only preload fonts if they're not already loaded
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          if (document.fonts.status !== "loaded") {
            ric(
              () => {
                const fontUrls = [
                  // Add your most critical font URLs here (ensure these are correct)
                  // e.g., '/fonts/your-critical-font.woff2',
                ];

                if (fontUrls.length === 0) return;

                const fragment = document.createDocumentFragment();

                fontUrls.forEach((url) => {
                  const preloadLink = document.createElement("link");
                  preloadLink.rel = "preload";
                  preloadLink.as = "font";
                  preloadLink.type = "font/woff2"; // Be specific if you know the type
                  preloadLink.href = url;
                  preloadLink.crossOrigin = "anonymous";

                  fragment.appendChild(preloadLink);
                });

                if (fragment.childNodes.length > 0) {
                  document.head.appendChild(fragment);
                }
              },
              { timeout: 500 },
            );
          }
        });
      }
    };

    const preloadCriticalCSS = () => {
      // Check for any critical external CSS (those intended to be loaded async but needed soon)
      const stylesheets = Array.from(
        document.querySelectorAll(
          'link[rel="stylesheet"][media="print"][data-critical="true"]',
        ),
      );

      if (stylesheets.length === 0) return;

      ric(
        () => {
          stylesheets.forEach((link) => {
            link.media = "all";
            // Optionally remove data-critical attribute after processing
            // link.removeAttribute('data-critical');
          });
        },
        { timeout: 500 },
      );
    };

    // Run our preload functions
    preloadCriticalImages();
    preloadCriticalFonts();
    preloadCriticalCSS();

    // Connection-aware resource loading
    if ("connection" in navigator) {
      const connection = navigator.connection;

      if (connection.saveData) {
        // User has requested reduced data usage
        document.documentElement.classList.add("save-data");
      } else if (
        connection.effectiveType &&
        connection.effectiveType.includes("4g")
      ) {
        // Fast connection - we can load more resources
        ric(
          () => {
            // Preload additional resources for fast connections
            const nonCriticalImages = Array.from(
              document.querySelectorAll('img[loading="lazy"]'),
            ).filter(
              (img) =>
                img.dataset.src &&
                !img.classList.contains("lazyloaded") &&
                !img.classList.contains("loaded"),
            );

            if (nonCriticalImages.length > 0) {
              nonCriticalImages.slice(0, 3).forEach((img) => {
                // Limit to a few images
                if (img.dataset.src) {
                  // This part seems more like lazy-loading execution than preloading.
                  // Consider if this should be here or handled by the main lazy loader.
                  // For now, let's assume it's an eager load for fast connections.
                  img.src = img.dataset.src;
                  img.classList.add("loaded");
                }
              });
            }
          },
          { timeout: 1000 },
        );
      }
    }
  };

  // Delay execution slightly after DCL
  if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
  ) {
    ric(executePreloading, { timeout: 100 });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      ric(executePreloading, { timeout: 100 });
    });
  }
});
