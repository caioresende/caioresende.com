import { PROJECTS } from "./projects.js";
import { PHOTOS_CONFIG } from "./photos-config.js";
import { ICONS_CONFIG } from "./icons-config.js";
import { LOGOS_CONFIG } from "./logos-config.js";

// Collect all image URLs
const urls = new Set();

// Hero images
urls.add("/images/portrait-top.jpg");
urls.add("/images/portrait-bottom.jpg");

// Background texture
urls.add("/images/timber-interior-texture.jpg");

// Project thumbnails
PROJECTS.forEach((p) => urls.add(p.img));

// Photo cards + stickers
PHOTOS_CONFIG.cards.forEach((c) => urls.add(c.src));
(PHOTOS_CONFIG.stickers || []).forEach((s) => urls.add(s.src));

// Icon images
ICONS_CONFIG.icons.forEach((i) => urls.add(i.src));

// Logo images
LOGOS_CONFIG.logos.forEach((l) => urls.add(l.src));

const allUrls = [...urls];
const total = allUrls.length;
let loaded = 0;

const progressEl = document.querySelector(".loader-progress");
const loaderEl = document.querySelector(".loader");

function updateProgress() {
  loaded++;
  const pct = Math.round((loaded / total) * 100);
  progressEl.textContent = pct + "%";

  if (loaded >= total) {
    startSite();
  }
}

function preloadImages() {
  allUrls.forEach((url) => {
    const img = new Image();
    img.onload = updateProgress;
    img.onerror = updateProgress; // count errors too so we don't stall
    img.src = url;
  });
}

async function startSite() {
  // Import and init all sections in order
  const { init: initSmoothScroll } = await import("./script-smooth-scroll.js");
  const { init: initHero } = await import("./script-hero.js");
  const { init: initIcons } = await import("./script-icons.js");
  const { init: initProjects } = await import("./script-projects.js");
  const { init: initPhotos } = await import("./script-photos.js");

  initSmoothScroll();
  initHero();
  initIcons();
  initProjects();
  initPhotos();

  // Fade out loader
  loaderEl.classList.add("loaded");
  loaderEl.addEventListener("transitionend", () => {
    loaderEl.remove();
  });
}

preloadImages();
