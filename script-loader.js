import { inject } from "@vercel/analytics";
inject();

import { ICONS_CONFIG } from "./icons-config.js";
import { optimizedPath, selectSize } from "./image-utils.js";

// ── Phase 1: Only preload critical above-the-fold images ─────
// Hero textures + icons. Everything else loads lazily per section.
const urls = new Set();

const heroSize = selectSize([1920, 1280], window.innerWidth);
urls.add(optimizedPath("/images/portrait-top.jpg", heroSize));
urls.add(optimizedPath("/images/portrait-bottom.jpg", heroSize));

const iconSize = selectSize([144, 72], 72);
ICONS_CONFIG.icons.forEach((i) => urls.add(optimizedPath(i.src, iconSize)));

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
    img.onerror = updateProgress;
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

  // Menu dropdown toggle & scroll
  const menuEl = document.querySelector(".menu");
  const menuToggle = menuEl?.querySelector("p");
  const menuLinks = menuEl?.querySelectorAll(".menu-link");

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      menuEl.classList.toggle("open");
    });
  }

  if (menuLinks) {
    menuLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        menuEl.classList.remove("open");
        const target = document.querySelector(link.getAttribute("href"));
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  // Close menu on click outside
  document.addEventListener("click", (e) => {
    if (menuEl && !menuEl.contains(e.target)) {
      menuEl.classList.remove("open");
    }
  });

  // Fade out loader
  loaderEl.classList.add("loaded");
  loaderEl.addEventListener("transitionend", () => {
    loaderEl.remove();
  });
}

preloadImages();
