import { inject } from "@vercel/analytics";
inject();

// Highlight animation on scroll
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
// Typewriter Animation (hover-triggered)
// ========================================

(function typewriter() {
  const titleEl = document.querySelector(".cs-title");
  const textEl = document.querySelector(".tw-text");
  if (!titleEl || !textEl) return;

  const NAME = "Caio";
  const CORRECTION = "not 'Ciao'";

  const PAUSE_AFTER_CORRECTION = 1000;
  const PUNCTUATION = new Set(['"', "'", ",", ".", "!", "?", " "]);

  let running = false;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Random keystroke timing — natural variance per character
  function typeDelay(char) {
    const base = 60 + Math.random() * 60;
    if (PUNCTUATION.has(char)) return base + 80 + Math.random() * 60;
    return base;
  }

  async function typeText(str) {
    for (let i = 0; i < str.length; i++) {
      textEl.textContent += str[i];
      await sleep(typeDelay(str[i]));
    }
  }

  // Eased deletion — starts slow, accelerates
  function deleteDelay(remaining, total) {
    const progress = 1 - remaining / total;
    const speed = 70 - progress * 40;
    return speed + Math.random() * 15;
  }

  async function deleteText() {
    const current = textEl.textContent;
    const total = current.length;
    for (let i = total; i > 0; i--) {
      textEl.textContent = current.slice(0, i - 1);
      await sleep(deleteDelay(i, total));
    }
  }

  // Chunk delete — highlight then clear
  async function chunkDelete() {
    const text = textEl.textContent;
    textEl.innerHTML = `<span class="tw-highlight">${text}</span>`;
    await sleep(350);
    textEl.textContent = "";
  }

  async function animate() {
    if (running) return;
    running = true;

    // Delete "Caio"
    await deleteText();
    await sleep(300);

    // Type correction
    await typeText(CORRECTION);
    await sleep(PAUSE_AFTER_CORRECTION);

    // Chunk delete — highlight flash then clear
    await chunkDelete();
    await sleep(250);

    // Retype name
    await typeText(NAME);

    // 👋 wave cursor after name is back
    startWave();

    running = false;
  }

  // Animated 👋 wave cursor — cycle through rotated SVGs
  const waveCursors = [-15, 0, 15, 0].map(
    (deg) =>
      `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text y='24' font-size='24' transform='rotate(${deg} 16 16)'>👋</text></svg>") 16 16, help`
  );

  let waveInterval = null;

  function startWave() {
    let frame = 0;
    titleEl.style.cursor = waveCursors[0];
    waveInterval = setInterval(() => {
      frame = (frame + 1) % waveCursors.length;
      titleEl.style.cursor = waveCursors[frame];
    }, 150);

    setTimeout(stopWave, 150 * waveCursors.length * 3);
  }

  function stopWave() {
    if (waveInterval) {
      clearInterval(waveInterval);
      waveInterval = null;
    }
    titleEl.style.cursor = "";
  }

  titleEl.addEventListener("mouseenter", animate);
  titleEl.addEventListener("mouseleave", stopWave);
})();
