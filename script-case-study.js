import { inject } from "@vercel/analytics";
inject();

import { optimizedCaseStudyPath, supportsWebPSync } from "./image-utils.js";

// ========================================
// Rewrite carousel images to optimized thumbnails
// ========================================

function getThumbHeight() {
  if (window.innerWidth <= 480) return 360;
  if (window.innerWidth <= 768) return 420;
  return 560;
}

const thumbHeight = getThumbHeight();
const isWebP = supportsWebPSync();

document.querySelectorAll(".cs-carousel-track img, .cs-gallery-card-media img").forEach((img) => {
  const originalSrc = img.getAttribute("src");
  // Store original for lightbox full-res loading
  img.dataset.fullSrc = originalSrc;

  // Determine fallback format from original extension
  const origExt = originalSrc.match(/\.png$/i) ? "png" : "jpg";
  const thumbFmt = isWebP ? "webp" : origExt;

  img.src = optimizedCaseStudyPath(originalSrc, thumbHeight, thumbFmt, false);
});

// ========================================
// Highlights carousel (horizontal scroll + snap)
// ========================================

document.querySelectorAll("[data-highlights]").forEach((wrapper) => {
  const track = wrapper.querySelector(".cs-highlights-track");
  const slides = [...wrapper.querySelectorAll(".cs-highlights-slide")];
  const dots = [...wrapper.querySelectorAll(".cs-highlights-dot")];
  if (!track || slides.length === 0) return;

  let current = 0;

  // Observe which slide is most visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = slides.indexOf(entry.target);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          slides.forEach((s) => s.classList.remove("is-visible"));
          entry.target.classList.add("is-visible");
          current = idx;
          dots.forEach((d, i) => d.classList.toggle("cs-highlights-dot--active", i === idx));
        }
      });
    },
    { root: track, threshold: 0.5 }
  );

  slides.forEach((s) => observer.observe(s));

  // First slide visible by default
  slides[0].classList.add("is-visible");

  // Dot click → smooth scroll to slide
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = Number(dot.dataset.index);
      slides[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  // Drag-to-scroll
  let isDown = false;
  let startX;
  let scrollLeft;

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    track.style.scrollSnapType = "none";
  });

  track.addEventListener("mouseleave", () => {
    if (isDown) track.style.scrollSnapType = "";
    isDown = false;
  });

  track.addEventListener("mouseup", () => {
    isDown = false;
    track.style.scrollSnapType = "";
  });

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
});

// ========================================
// Highlight animation on scroll (once per load)
// ========================================

const hlObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        hlObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll(".cs-hl").forEach((el) => hlObserver.observe(el));

// ========================================
// Single-slide reveal on scroll
// ========================================

const singleSlideObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        singleSlideObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);

document.querySelectorAll(".cs-single-slide .cs-highlights-slide").forEach((el) => {
  singleSlideObserver.observe(el);
});

// ========================================
// Gallery (Apple-style caption tiles)
// ========================================

document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  const track = gallery.querySelector(".cs-gallery-track");
  const cards = [...track.querySelectorAll(".cs-gallery-card")];
  const prevBtn = gallery.querySelector(".cs-gallery-arrow--prev");
  const nextBtn = gallery.querySelector(".cs-gallery-arrow--next");
  if (!track || cards.length === 0) return;

  function updateArrows() {
    if (!prevBtn || !nextBtn) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    prevBtn.disabled = scrollLeft <= 2;
    nextBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 2;
  }

  // Scroll by one card width
  function scrollByCard(direction) {
    const cardWidth = cards[0].offsetWidth + 20; // card + gap
    track.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }

  if (prevBtn) prevBtn.addEventListener("click", () => scrollByCard(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => scrollByCard(1));

  track.addEventListener("scroll", updateArrows, { passive: true });
  updateArrows();

  // Drag-to-scroll
  let isDown = false;
  let startX;
  let scrollLeft;

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    track.style.scrollSnapType = "none";
  });

  track.addEventListener("mouseleave", () => {
    if (isDown) track.style.scrollSnapType = "";
    isDown = false;
  });

  track.addEventListener("mouseup", () => {
    isDown = false;
    track.style.scrollSnapType = "";
  });

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
});

// ========================================
// Carousel drag-to-scroll
// ========================================

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const track = carousel.querySelector(".cs-carousel-track");
  let isDown = false;
  let startX;
  let scrollLeft;
  let hasDragged = false;

  track.addEventListener("mousedown", (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    track.style.cursor = "grabbing";
  });

  track.addEventListener("mouseleave", () => {
    isDown = false;
    track.style.cursor = "grab";
  });

  track.addEventListener("mouseup", () => {
    isDown = false;
    track.style.cursor = "grab";
  });

  track.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) hasDragged = true;
    track.scrollLeft = scrollLeft - walk;
  });

  // Prevent click on images after drag
  track.querySelectorAll("img").forEach((img) => {
    img.addEventListener("click", (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
});

// ========================================
// Stacked pile carousel
// ========================================

document.querySelectorAll("[data-stack-carousel]").forEach((carousel) => {
  if (!window.matchMedia("(hover: hover)").matches) return;

  const track = carousel.querySelector(".cs-carousel-track");
  const images = [...track.querySelectorAll("img")];
  if (!track || images.length === 0) return;

  let stacked = false;

  function calcAndApplyStack(animate) {
    // Measure layout positions BEFORE adding --stacked
    const centerX = carousel.clientWidth / 2;

    const precomputed = images.map((img, i) => {
      const imgCenter = img.offsetLeft + img.offsetWidth / 2;
      const dx = centerX - imgCenter;
      const mid = (images.length - 1) / 2;
      const off = i - mid;
      const angle = off * 5;
      return {
        t: `translateX(${dx}px) translateY(-150px) rotate(${angle}deg) scale(0.8)`,
        z: images.length - Math.abs(i - Math.floor(images.length / 2)),
      };
    });

    if (!animate) {
      images.forEach((img) => (img.style.transition = "none"));
    }

    carousel.classList.add("--stacked");

    images.forEach((img, i) => {
      img.style.transform = precomputed[i].t;
      img.style.zIndex = precomputed[i].z;
    });

    stacked = true;

    if (!animate) {
      track.offsetHeight;
      images.forEach((img) => (img.style.transition = ""));
    }
  }

  function expand() {
    carousel.classList.remove("--stacked");
    images.forEach((img) => {
      img.style.transform = "";
      img.style.zIndex = "";
    });
    stacked = false;
  }

  function tryInit() {
    if (images.every((img) => img.offsetWidth > 0)) {
      calcAndApplyStack(false);
      carousel.classList.add("--initialized");
      return true;
    }
    return false;
  }

  if (!tryInit()) {
    Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.addEventListener("load", r, { once: true });
              img.addEventListener("error", r, { once: true });
            })
      )
    ).then(() => tryInit());
  }

  carousel.addEventListener("mouseenter", () => {
    if (stacked) expand();
  });

  carousel.addEventListener("mouseleave", () => {
    if (!stacked) calcAndApplyStack(true);
  });
});

// ========================================
// Device tilt (3D rotate + zoom on hover)
// ========================================

document.querySelectorAll(".cs-feature-panel-media").forEach((media) => {
  const wrap = media.querySelector(".cs-device-wrap");
  if (!wrap) return;

  media.style.perspective = "800px";
  wrap.style.transition = "transform 0.15s ease-out";
  wrap.style.willChange = "transform";

  media.addEventListener("mousemove", (e) => {
    const rect = media.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 → 1
    const y = (e.clientY - rect.top) / rect.height; // 0 → 1

    const rotateY = (x - 0.5) * 24; // -12° to +12°
    const scale = 1 + y * 0.3; // 1.0 at top → 1.3 at bottom

    wrap.style.transform = `rotateY(${rotateY}deg) scale(${scale})`;
  });

  media.addEventListener("mouseleave", () => {
    wrap.style.transform = "rotateY(0deg) scale(1)";
  });
});

// ========================================
// Lightbox (thumbnail → full-res swap)
// ========================================

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCounter = document.getElementById("lightbox-counter");
const closeBtn = lightbox.querySelector(".cs-lightbox-close");
const prevBtn = lightbox.querySelector(".cs-lightbox-prev");
const nextBtn = lightbox.querySelector(".cs-lightbox-next");

let currentImages = [];
let currentIndex = 0;

function openLightbox(images, index) {
  currentImages = images;
  currentIndex = index;
  updateLightbox();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("active");
  document.body.style.overflow = "";
}

function updateLightbox() {
  const img = currentImages[currentIndex];

  // Show thumbnail immediately as placeholder
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || "";
  lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

  prevBtn.style.display = currentIndex === 0 ? "none" : "";
  nextBtn.style.display = currentIndex === currentImages.length - 1 ? "none" : "";

  // Load full-res in background, swap when ready
  const originalSrc = img.dataset.fullSrc;
  if (originalSrc) {
    const origExt = originalSrc.match(/\.png$/i) ? "png" : "jpg";
    const fullFmt = isWebP ? "webp" : origExt;
    const fullSrc = optimizedCaseStudyPath(originalSrc, "full", fullFmt, true);

    // Tag this request so stale loads don't overwrite
    lightboxImg.dataset.targetSrc = fullSrc;

    const loader = new Image();
    loader.onload = () => {
      // Only swap if we're still on the same image
      if (lightboxImg.dataset.targetSrc === fullSrc) {
        lightboxImg.src = fullSrc;
      }
    };
    loader.onerror = () => {
      // Fall back to original unoptimized file
      if (lightboxImg.dataset.targetSrc === fullSrc) {
        lightboxImg.src = originalSrc;
      }
    };
    loader.src = fullSrc;
  }
}

function nextImage() {
  if (currentIndex < currentImages.length - 1) {
    currentIndex++;
    updateLightbox();
  }
}

function prevImage() {
  if (currentIndex > 0) {
    currentIndex--;
    updateLightbox();
  }
}

// Click on carousel images → open lightbox
document.querySelectorAll(".cs-carousel-track img").forEach((img) => {
  img.addEventListener("click", (e) => {
    // Get all images in the same carousel
    const track = img.closest(".cs-carousel-track");
    const images = [...track.querySelectorAll("img")];
    const index = images.indexOf(img);
    openLightbox(images, index);
  });
});

// Click on gallery card images → open lightbox
document.querySelectorAll(".cs-gallery-card-media img").forEach((img) => {
  img.addEventListener("click", (e) => {
    const gallery = img.closest(".cs-gallery");
    const images = [...gallery.querySelectorAll(".cs-gallery-card-media img")];
    const index = images.indexOf(img);
    openLightbox(images, index);
  });
});

// Controls
closeBtn.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", prevImage);
nextBtn.addEventListener("click", nextImage);

// Click backdrop to close
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target.classList.contains("cs-lightbox-content")) {
    closeLightbox();
  }
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("active")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
});

// Touch swipe in lightbox
let touchStartX = 0;
let touchEndX = 0;

lightbox.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

lightbox.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) nextImage();
    else prevImage();
  }
});
