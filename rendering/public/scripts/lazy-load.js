/**
 * Ultra-lightweight lazy loading
 * Optimized to minimize Total Blocking Time
 */

// Use an immediately-invoked function expression to avoid globals
(() => {
  // Only start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLazyLoading, {
      once: true,
      passive: true,
    });
  } else {
    // Start asynchronously if we're already loaded
    setTimeout(initLazyLoading, 1);
  }

  function initLazyLoading() {
    // Only use IntersectionObserver if supported
    if ("IntersectionObserver" in window) {
      // Single observer for images
      const imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const src = img.getAttribute("data-src");
              if (src) {
                // Create new image to preload
                const newImg = new Image();
                newImg.onload = () => {
                  img.src = src;
                  img.classList.add("loaded");
                };
                newImg.src = src;
                imageObserver.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: "200px 0px", // Start loading before image enters viewport
          threshold: 0.01, // Trigger when just 1% of the image is visible
        },
      );

      // Observe all images with data-src in one go
      document.querySelectorAll("img[data-src]").forEach((img) => {
        imageObserver.observe(img);
      });

      // Handle background images separately
      const bgElements = document.querySelectorAll("[data-bg]");
      if (bgElements.length > 0) {
        const bgObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const element = entry.target;
                const bg = element.getAttribute("data-bg");
                if (bg) {
                  element.style.backgroundImage = `url(${bg})`;
                  element.classList.add("bg-loaded");
                  bgObserver.unobserve(element);
                }
              }
            });
          },
          {
            rootMargin: "200px 0px",
            threshold: 0.01,
          },
        );

        bgElements.forEach((el) => bgObserver.observe(el));
      }
    } else {
      // Simple fallback for browsers without IntersectionObserver
      document.querySelectorAll("img[data-src]").forEach((img) => {
        img.src = img.getAttribute("data-src");
      });
      document.querySelectorAll("[data-bg]").forEach((el) => {
        el.style.backgroundImage = `url(${el.getAttribute("data-bg")})`;
      });
    }
  }
})();

// Utility for lazy loading components
class LazyLoader {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: "50px",
      threshold: 0.1,
      ...options,
    };

    this.observer = null;
    this.components = new Map();
    this.loadedComponents = new Set();
  }

  init() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options,
    );
    this.observeComponents();
  }

  observeComponents() {
    // Find all components that should be lazy loaded
    document.querySelectorAll("[data-lazy-component]").forEach((element) => {
      const componentName = element.getAttribute("data-lazy-component");
      if (componentName && !this.loadedComponents.has(componentName)) {
        this.components.set(element, componentName);
        this.observer.observe(element);
      }
    });
  }

  async handleIntersection(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target;
        const componentName = this.components.get(element);

        if (componentName && !this.loadedComponents.has(componentName)) {
          try {
            // Load the component
            await this.loadComponent(componentName);
            this.loadedComponents.add(componentName);
            this.observer.unobserve(element);
            this.components.delete(element);
          } catch (error) {
            console.error(`Failed to load component ${componentName}:`, error);
          }
        }
      }
    }
  }

  async loadComponent(componentName) {
    // This is a placeholder for the actual component loading logic
    // In a real implementation, you would load the component's JavaScript and CSS
    console.log(`Loading component: ${componentName}`);

    // Simulate component loading
    return new Promise((resolve) => {
      setTimeout(() => {
        // Dispatch an event when the component is loaded
        const event = new CustomEvent("componentLoaded", {
          detail: { componentName },
        });
        document.dispatchEvent(event);
        resolve();
      }, 100);
    });
  }
}

// Initialize lazy loader when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const lazyLoader = new LazyLoader();
  lazyLoader.init();
});

// Export for use in other scripts
window.LazyLoader = LazyLoader;
