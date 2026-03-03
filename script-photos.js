import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PHOTOS_CONFIG } from "./photos-config.js";

gsap.registerPlugin(ScrollTrigger);

function init() {
  const section = document.querySelector(".photos-section");
  if (!section) return;

  const isMobile = window.innerWidth <= 1000;
  const BASE_W = isMobile ? 160 : 250;
  const STICKER_BASE_W = isMobile ? 80 : 120;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // ---- Photo cards ----
  const cards = PHOTOS_CONFIG.cards.map((cfg) => {
    const card = document.createElement("div");
    card.classList.add("photo-card");

    const img = document.createElement("img");
    img.src = cfg.src;
    card.appendChild(img);
    section.appendChild(card);

    const s = cfg.scale ?? 1;
    const w = BASE_W * s;

    card.style.width = w + "px";
    card.style.zIndex = cfg.z ?? 0;

    const restX = (cfg.x / 100) * vw - w / 2;
    const restY = (cfg.y / 100) * vh;
    const entryX = (cfg.entryX / 100) * vw - w / 2;
    const entryY = (cfg.entryY / 100) * vh;
    const exitX = (cfg.exitX / 100) * vw - w / 2;
    const exitY = (cfg.exitY / 100) * vh;

    gsap.set(card, {
      left: entryX,
      top: entryY,
      rotation: cfg.entryRotation ?? 0,
    });

    return {
      element: card,
      restX, restY, restRot: cfg.rotation ?? 0,
      entryX, entryY, entryRot: cfg.entryRotation ?? 0,
      exitX, exitY, exitRot: cfg.exitRotation ?? 0,
    };
  });

  // ---- Stickers ----
  const stickers = (PHOTOS_CONFIG.stickers || []).map((cfg, i) => {
    const el = document.createElement("div");
    el.classList.add("sticker-card");

    const img = document.createElement("img");
    img.src = cfg.src;
    el.appendChild(img);
    section.appendChild(el);

    const s = cfg.scale ?? 1;
    const w = STICKER_BASE_W * s;
    el.style.width = w + "px";
    el.style.zIndex = 20 + i;

    // Final position (center cluster)
    const restX = (cfg.x / 100) * vw - w / 2;
    const restY = (cfg.y / 100) * vh - w / 2;

    // Place at final position, hidden
    gsap.set(el, {
      left: restX,
      top: restY,
      rotation: cfg.rotation ?? 0,
      opacity: 0,
    });

    return { element: el };
  });

  // ---- Scroll phases ----
  // Phase 1 (0–0.30):   Photos fly in
  // Phase 2 (0.30–0.50): Photos rest
  // Phase 3 (0.50–1.0):  Photos exit + stickers stack in center

  const P1_END = 0.30;
  const P2_END = 0.50;

  ScrollTrigger.create({
    trigger: ".photos-section",
    start: "top top",
    end: `+=${vh * 5}`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;

      // ---- Phase 1: Photos enter ----
      if (progress <= P1_END) {
        const p = progress / P1_END;
        const eased = gsap.parseEase("power2.out")(p);

        cards.forEach((c) => {
          gsap.set(c.element, {
            left: c.entryX + (c.restX - c.entryX) * eased,
            top: c.entryY + (c.restY - c.entryY) * eased,
            rotation: c.entryRot + (c.restRot - c.entryRot) * eased,
          });
        });

        // Stickers stay hidden
        stickers.forEach((s) => {
          gsap.set(s.element, { opacity: 0 });
        });

      // ---- Phase 2: Photos rest ----
      } else if (progress <= P2_END) {
        cards.forEach((c) => {
          gsap.set(c.element, {
            left: c.restX,
            top: c.restY,
            rotation: c.restRot,
          });
        });

        stickers.forEach((s) => {
          gsap.set(s.element, { opacity: 0 });
        });

      // ---- Phase 3: Photos exit + stickers stack in ----
      } else {
        const phaseProgress = (progress - P2_END) / (1 - P2_END);
        const exitEased = gsap.parseEase("power2.in")(phaseProgress);

        // Photos exit
        cards.forEach((c) => {
          gsap.set(c.element, {
            left: c.restX + (c.exitX - c.restX) * exitEased,
            top: c.restY + (c.exitY - c.restY) * exitEased,
            rotation: c.restRot + (c.exitRot - c.restRot) * exitEased,
          });
        });

        // Stickers appear sequentially in place
        const stickerCount = stickers.length;
        stickers.forEach((s, i) => {
          const threshold = i / stickerCount;
          gsap.set(s.element, { opacity: phaseProgress >= threshold ? 1 : 0 });
        });
      }
    },
  });
}

window.addEventListener("load", () => {
  init();

  // TEMP: auto-scroll to photos section resting state (50% progress)
  setTimeout(() => {
    const st = ScrollTrigger.getAll().find(
      (t) => t.vars.trigger === ".photos-section"
    );
    if (!st) return;
    window.scrollTo(0, st.start + (st.end - st.start) * 0.5);
  }, 500);
});
