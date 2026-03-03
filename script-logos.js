import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LOGOS_CONFIG } from "./logos-config.js";

gsap.registerPlugin(ScrollTrigger);

function buildHTML(section) {
  const { title, subtitle, logos } = LOGOS_CONFIG;

  let html = `
    <div class="logos-header">
      <h2>${title}</h2>
      <p>${subtitle}</p>
    </div>
    <div class="logos-grid">`;

  logos.forEach((logo) => {
    html += `
      <div class="logo-item">
        <img src="${logo.src}" alt="${logo.name}" />
        <span>${logo.name}</span>
      </div>`;
  });

  html += "</div>";
  section.innerHTML = html;
}

function init() {
  const section = document.querySelector(".logos-section");
  if (!section) return;

  buildHTML(section);

  // Animate header
  const header = section.querySelector(".logos-header");
  const h2 = header.querySelector("h2");
  const p = header.querySelector("p");

  gsap.set([h2, p], { opacity: 0, y: 30 });

  ScrollTrigger.create({
    trigger: header,
    start: "top 80%",
    once: true,
    onEnter: () => {
      gsap.to(h2, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
      });
      gsap.to(p, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        delay: 0.2,
      });
    },
  });

  // Staggered reveal for logo items
  const items = section.querySelectorAll(".logo-item");

  items.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(item, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: (i % 7) * 0.08, // stagger within each row
        });
      },
    });
  });
}

window.addEventListener("load", init);
