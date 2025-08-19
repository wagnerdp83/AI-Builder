/**
 * Main JavaScript file with performance optimizations
 */

// Image lazy loading
document.addEventListener("DOMContentLoaded", () => {
  // Only use IntersectionObserver if it's supported
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute("data-src");

            if (src) {
              // Set image source only when it's about to enter viewport
              img.setAttribute("src", src);
              img.classList.add("loaded");
              imageObserver.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: "200px 0px", // Start loading 200px before image enters viewport
        threshold: 0.01, // Trigger when just 1% of the image is visible
      },
    );

    // Find all images with data-src attribute
    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll("img[data-src]").forEach((img) => {
      img.setAttribute("src", img.getAttribute("data-src"));
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      if (href.length > 1) {
        e.preventDefault();
        const targetElement = document.querySelector(href);

        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });
});

// Deferred loading for testimonial animations
window.addEventListener("load", () => {
  setTimeout(() => {
    // Init testimonial animations only after main content is loaded
    const sliders = document.querySelectorAll(".testimonials-slider");
    if (sliders.length > 0) {
      initTestimonialSliders(sliders);
    }
  }, 100);
});

function initTestimonialSliders(sliders) {
  sliders.forEach((slider) => {
    const slides = slider.querySelectorAll(".testimonial-slide");
    const prevButton = slider.parentElement.querySelector(".testimonial-prev");
    const nextButton = slider.parentElement.querySelector(".testimonial-next");

    if (!slides.length || !prevButton || !nextButton) return;

    let currentIndex = 0;
    let slidesToShow = getSlidesToShow();

    function getSlidesToShow() {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 768) return 2;
      return 3;
    }

    function updateSlider() {
      const slideWidth = 100 / slidesToShow;
      const translateValue = currentIndex * slideWidth;
      slider.style.transform = `translateX(-${translateValue}%)`;
    }

    prevButton.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentIndex = slides.length - slidesToShow;
      }
      updateSlider();
    });

    nextButton.addEventListener("click", () => {
      if (currentIndex < slides.length - slidesToShow) {
        currentIndex++;
      } else {
        currentIndex = 0;
      }
      updateSlider();
    });

    window.addEventListener("resize", () => {
      const previousSlidesToShow = slidesToShow;
      slidesToShow = getSlidesToShow();

      if (previousSlidesToShow !== slidesToShow) {
        const maxIndex = slides.length - slidesToShow;
        if (currentIndex > maxIndex) {
          currentIndex = maxIndex < 0 ? 0 : maxIndex;
        }
        updateSlider();
      }
    });

    // Initialize slider
    updateSlider();
  });
}
