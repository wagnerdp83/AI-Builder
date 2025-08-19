/**
 * Ultra-lightweight script to fix aspect ratio issues
 * Fixes the "Displays images with incorrect aspect ratio" error
 */
(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAspectRatioFixer, {
      once: true,
      passive: true,
    });
  } else {
    setTimeout(initAspectRatioFixer, 10);
  }

  function initAspectRatioFixer() {
    // Only use if IntersectionObserver is supported
    if (!("IntersectionObserver" in window)) return;

    // Find all images that have width and height attributes
    const imgElements = document.querySelectorAll(
      "img[width][height]:not([data-aspect-fixed])",
    );

    // Create observer to process images as they enter viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            fixAspectRatio(img);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: "200px 0px",
        threshold: 0.01,
      },
    );

    // Process images
    imgElements.forEach((img) => {
      // Add immediately if already loaded
      if (img.complete) {
        fixAspectRatio(img);
      } else {
        // Or observe for later
        observer.observe(img);
      }
    });
  }

  function fixAspectRatio(img) {
    const width = parseInt(img.getAttribute("width"), 10);
    const height = parseInt(img.getAttribute("height"), 10);

    // Skip if dimensions are invalid
    if (!width || !height) return;

    // Calculate aspect ratio
    const aspectRatio = width / height;

    // Mark as fixed
    img.setAttribute("data-aspect-fixed", "true");

    // Add aspect ratio CSS via style attribute
    img.style.aspectRatio = `${width} / ${height}`;

    // If parent is already sized correctly, we're done
    const parent = img.parentElement;
    if (parent && parent.classList.contains("image-container")) {
      // Parent might already handle this
      return;
    }

    // Otherwise, make sure image honors aspect ratio
    img.style.objectFit = "cover";

    // For container images, also fix parent
    if (img.classList.contains("object-cover") && parent) {
      parent.style.aspectRatio = `${width} / ${height}`;
    }
  }
})();
