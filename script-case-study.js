import { inject } from "@vercel/analytics";
inject();

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
// Lightbox
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
  lightboxImg.src = currentImages[currentIndex].src;
  lightboxImg.alt = currentImages[currentIndex].alt;
  lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;

  prevBtn.style.display = currentIndex === 0 ? "none" : "";
  nextBtn.style.display = currentIndex === currentImages.length - 1 ? "none" : "";
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
