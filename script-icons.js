import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ICONS_CONFIG } from "./icons-config.js";
import { LOGOS_CONFIG } from "./logos-config.js";

gsap.registerPlugin(ScrollTrigger);

function buildHTML(section) {
  const { icons, segments, rows } = ICONS_CONFIG;
  const { title, subtitle, logos } = LOGOS_CONFIG;
  const perRow = Math.ceil(icons.length / rows);

  // Build animated-icons container with rows
  let iconsHTML = '<div class="animated-icons">';
  for (let r = 0; r < rows; r++) {
    iconsHTML += '<div class="animated-icons-row">';
    const start = r * perRow;
    const end = Math.min(start + perRow, icons.length);
    for (let i = start; i < end; i++) {
      iconsHTML += `<div class="animated-icon icon-${i + 1}"><img src="${icons[i].src}" alt="${icons[i].alt}" /></div>`;
    }
    iconsHTML += "</div>";
  }
  iconsHTML += "</div>";

  // Build animated-text paragraph
  let textHTML = '<div class="icons-content"><h1 class="animated-text">';
  segments.forEach((seg) => {
    if (seg.icon !== undefined) {
      textHTML += '<div class="placeholder-icon"></div>';
    } else {
      textHTML += `<span class="text-segment">${seg.text}</span>`;
    }
  });
  textHTML += "</h1></div>";

  // Build logos grid (secondary, inside same pinned section)
  let logosHTML = `<div class="logos-reveal">
    <h1 class="logos-title">And many more</h1>
    <div class="logos-grid">`;
  logos.forEach((logo) => {
    logosHTML += `<div class="logo-item"><img src="${logo.src}" alt="${logo.name}" /></div>`;
  });
  logosHTML += "</div></div>";

  section.innerHTML = iconsHTML + textHTML + logosHTML;
}

function cleanupDuplicates() {
  if (window.duplicateIcons) {
    window.duplicateIcons.forEach((dup) => {
      if (dup.parentNode) dup.parentNode.removeChild(dup);
    });
    window.duplicateIcons = null;
    window.iconTilts = null;
  }
}

function init() {
  const iconsSection = document.querySelector(".icons-section");
  if (!iconsSection) return;

  buildHTML(iconsSection);

  const animatedIcons = iconsSection.querySelector(".animated-icons");
  const iconElements = iconsSection.querySelectorAll(".animated-icon");
  const textSegments = iconsSection.querySelectorAll(".text-segment");
  const placeholders = iconsSection.querySelectorAll(".placeholder-icon");
  const iconsContent = iconsSection.querySelector(".icons-content");
  const logosReveal = iconsSection.querySelector(".logos-reveal");
  const logoItems = iconsSection.querySelectorAll(".logo-item");

  // Initially hide logos below
  gsap.set(logosReveal, { y: window.innerHeight * 0.5, opacity: 0 });

  // Randomize text reveal order
  const textAnimationOrder = [];
  textSegments.forEach((segment, index) => {
    textAnimationOrder.push({ segment, originalIndex: index });
  });

  for (let i = textAnimationOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [textAnimationOrder[i], textAnimationOrder[j]] = [
      textAnimationOrder[j],
      textAnimationOrder[i],
    ];
  }

  const isMobile = window.innerWidth <= 1000;
  const headerIconSize = isMobile ? 36 : 72;
  const currentIconSize = iconElements[0].getBoundingClientRect().width;
  const exactScale = headerIconSize / currentIconSize;

  // Compute center offset for the icons container
  const containerRect = animatedIcons.getBoundingClientRect();
  const centerX = window.innerWidth / 2 - (containerRect.left + containerRect.width / 2);
  const centerY = window.innerHeight / 2 - (containerRect.top + containerRect.height / 2);

  // Start with icons full size and centered
  gsap.set(animatedIcons, { x: centerX, y: centerY, scale: 1, opacity: 1 });

  // Slot-machine pool: all available logos
  const slotPool = [];
  for (let i = 1; i <= 21; i++) slotPool.push(`/images/icons/logo_${i}.png`);
  for (let i = 1; i <= 7; i++) slotPool.push(`/images/icons/final_${i}.png`);

  // Save original (final) src for each icon
  const originalSrcs = [];
  iconElements.forEach((icon) => {
    originalSrcs.push(icon.querySelector("img").src);
  });

  // Pre-generate random swap sequences per icon (deterministic on scroll)
  const slotSteps = 20; // number of swaps during Phase 1
  const slotSequences = [];
  for (let i = 0; i < iconElements.length; i++) {
    const seq = [];
    for (let s = 0; s < slotSteps; s++) {
      seq.push(slotPool[Math.floor(Math.random() * slotPool.length)]);
    }
    slotSequences.push(seq);
  }
  let lastSlotStep = -1;

  // Pre-generate random tilts (alternating CW and CCW)
  const tilts = iconElements.length;
  const iconTilts = [];
  for (let i = 0; i < tilts; i++) {
    const direction = i % 2 === 0 ? 1 : -1; // alternate CW / CCW
    const angle = direction * (3 + Math.random() * 2); // 3–5 degrees
    iconTilts.push(angle);
  }

  function createDuplicates() {
    if (window.duplicateIcons) return;
    window.duplicateIcons = [];
    window.iconTilts = iconTilts;
    iconElements.forEach((icon, index) => {
      const duplicate = icon.cloneNode(true);
      // Force correct final image regardless of slot-machine state
      duplicate.querySelector("img").src = originalSrcs[index];
      duplicate.className = "duplicate-icon";
      duplicate.style.position = "absolute";
      duplicate.style.width = headerIconSize + "px";
      duplicate.style.height = headerIconSize + "px";
      duplicate.style.borderRadius = "16px";
      duplicate.style.border = "solid 2px rgba(0,0,0,0.1)";
      duplicate.style.background = "#fff";
      duplicate.style.padding = "2px";
      duplicate.style.boxShadow = "0px 25px 50px -12px rgba(0, 0, 0, 0.25)";
      document.body.appendChild(duplicate);
      window.duplicateIcons.push(duplicate);
    });
  }

  ScrollTrigger.create({
    trigger: ".icons-section",
    start: "top top",
    end: `+=${window.innerHeight * 5}px`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;

      textSegments.forEach((segment) => {
        gsap.set(segment, { opacity: 0 });
      });

      // Phase 1: Icons scale down from big to small in center (0–0.15)
      if (progress <= 0.15) {
        const scaleProgress = progress / 0.15;
        const currentScale = 1 + (exactScale - 1) * scaleProgress;

        // Clean up duplicates if scrolling back
        cleanupDuplicates();

        // Slot-machine: swap icon images at discrete steps
        const step = Math.min(Math.floor(scaleProgress * slotSteps), slotSteps - 1);
        if (step !== lastSlotStep) {
          lastSlotStep = step;
          iconElements.forEach((icon, i) => {
            icon.querySelector("img").src = slotSequences[i][step];
          });
        }

        gsap.set(animatedIcons, { x: centerX, y: centerY, scale: currentScale, opacity: 1 });
        gsap.set(iconsContent, { y: 0, scale: 1 });
        gsap.set(logosReveal, { y: window.innerHeight * 0.5, opacity: 0 });

      // Phase 2: Duplicates fly to text placeholders (0.15–0.4)
      } else if (progress <= 0.4) {
        const moveProgress = (progress - 0.15) / 0.25;

        // Restore original icon sources (for correct duplicate cloning)
        if (lastSlotStep !== -1) {
          iconElements.forEach((icon, i) => {
            icon.querySelector("img").src = originalSrcs[i];
          });
          lastSlotStep = -1;
        }

        // Hide original icons immediately
        gsap.set(animatedIcons, { opacity: 0 });
        gsap.set(iconsContent, { y: 0, scale: 1 });
        gsap.set(logosReveal, { y: window.innerHeight * 0.5, opacity: 0 });

        // Create duplicates once
        createDuplicates();

        window.duplicateIcons.forEach((duplicate, index) => {
          if (index < placeholders.length) {
            // Start position: where the original icon was (center of viewport, at exactScale)
            const iconRect = iconElements[index].getBoundingClientRect();
            const startPageX = iconRect.left + iconRect.width / 2 + window.pageXOffset;
            const startPageY = iconRect.top + iconRect.height / 2 + window.pageYOffset;
            const targetRect = placeholders[index].getBoundingClientRect();
            const targetPageX = targetRect.left + targetRect.width / 2 + window.pageXOffset;
            const targetPageY = targetRect.top + targetRect.height / 2 + window.pageYOffset;

            const moveX = targetPageX - startPageX;
            const moveY = targetPageY - startPageY;
            let currentX = 0, currentY = 0;

            if (moveProgress <= 0.5) {
              currentY = moveY * (moveProgress / 0.5);
            } else {
              currentY = moveY;
              currentX = moveX * ((moveProgress - 0.5) / 0.5);
            }

            const tilt = window.iconTilts[index] * moveProgress;
            duplicate.style.left = (startPageX + currentX - headerIconSize / 2) + "px";
            duplicate.style.top = (startPageY + currentY - headerIconSize / 2) + "px";
            duplicate.style.opacity = "1";
            duplicate.style.display = "flex";
            duplicate.style.transform = `rotate(${tilt}deg)`;
          } else {
            duplicate.style.opacity = "0";
          }
        });

      // Phase 3: Text reveals (0.4–0.65)
      } else if (progress <= 0.65) {
        gsap.set(animatedIcons, { opacity: 0 });
        gsap.set(iconsContent, { y: 0, scale: 1 });
        gsap.set(logosReveal, { y: window.innerHeight * 0.5, opacity: 0 });

        // Create duplicates if needed (scrolling forward past Phase 1)
        createDuplicates();

        // Keep duplicates at target positions with tilt
        window.duplicateIcons.forEach((duplicate, index) => {
          if (index < placeholders.length) {
            const targetRect = placeholders[index].getBoundingClientRect();
            duplicate.style.left = (targetRect.left + targetRect.width / 2 + window.pageXOffset - headerIconSize / 2) + "px";
            duplicate.style.top = (targetRect.top + targetRect.height / 2 + window.pageYOffset - headerIconSize / 2) + "px";
            duplicate.style.width = headerIconSize + "px";
            duplicate.style.height = headerIconSize + "px";
            duplicate.style.opacity = "1";
            duplicate.style.display = "flex";
            duplicate.style.transform = `rotate(${window.iconTilts[index]}deg)`;
          } else {
            duplicate.style.opacity = "0";
          }
        });

        const revealPerSegment = Math.min(0.04, 0.2 / textAnimationOrder.length);
        textAnimationOrder.forEach((item, randomIndex) => {
          const segmentStart = 0.4 + randomIndex * revealPerSegment;
          const segmentEnd = segmentStart + revealPerSegment * 0.5;
          const segmentProgress = gsap.utils.mapRange(segmentStart, segmentEnd, 0, 1, progress);
          gsap.set(item.segment, { opacity: Math.max(0, Math.min(1, segmentProgress)) });
        });

      // Phase 4: Slide text up, reveal logos below (0.65–1.0)
      } else {
        gsap.set(animatedIcons, { opacity: 0 });

        // All text fully visible
        textSegments.forEach((segment) => gsap.set(segment, { opacity: 1 }));

        const slideProgress = (progress - 0.65) / 0.35;
        const clamped = Math.max(0, Math.min(1, slideProgress));

        // Text slides up and scales down to make room for logos
        const textShift = window.innerHeight * 0.22;
        const textScale = 1 - 0.5 * clamped;
        gsap.set(iconsContent, { y: -textShift * clamped, scale: textScale, transformOrigin: "center center" });

        // Create duplicates if needed
        createDuplicates();

        // Scale and reposition duplicate icons to follow scaled text
        const dupSize = headerIconSize * textScale;
        window.duplicateIcons.forEach((duplicate, index) => {
          if (index < placeholders.length) {
            const targetRect = placeholders[index].getBoundingClientRect();
            duplicate.style.left = (targetRect.left + targetRect.width / 2 + window.pageXOffset - dupSize / 2) + "px";
            duplicate.style.top = (targetRect.top + targetRect.height / 2 + window.pageYOffset - dupSize / 2) + "px";
            duplicate.style.width = dupSize + "px";
            duplicate.style.height = dupSize + "px";
            duplicate.style.opacity = "1";
            duplicate.style.display = "flex";
            duplicate.style.transform = `rotate(${window.iconTilts[index]}deg)`;
          } else {
            duplicate.style.opacity = "0";
          }
        });

        // Logos slide up from below into lower portion
        const logosShift = window.innerHeight * 0.6;
        gsap.set(logosReveal, {
          y: logosShift * (1 - clamped),
          opacity: clamped,
        });

        // Stagger logo items
        logoItems.forEach((item, i) => {
          const itemStart = i * 0.03;
          const itemProgress = Math.max(0, Math.min(1, (clamped - itemStart) / 0.3));
          item.style.opacity = itemProgress;
          item.style.transform = `translateY(${20 * (1 - itemProgress)}px)`;
        });
      }
    },
  });
}

window.addEventListener("load", init);
