import { PROJECTS } from "./projects.js";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const PROJECTS_PER_ROW = 9;
const TOTAL_ROWS = 10;

const SVG_PATH_1 = "M227.549 1818.76C227.549 1818.76 406.016 2207.75 569.049 2130.26C843.431 1999.85 -264.104 1002.3 227.549 876.262C552.918 792.849 773.647 2456.11 1342.05 2130.26C1885.43 1818.76 14.9644 455.772 760.548 137.262C1342.05 -111.152 1663.5 2266.35 2209.55 1972.76C2755.6 1679.18 1536.63 384.467 1826.55 137.262C2013.5 -22.1463 2209.55 381.262 2209.55 381.262";
const SVG_PATH_2 = "M1661.28 2255.51C1661.28 2255.51 2311.09 1960.37 2111.78 1817.01C1944.47 1696.67 718.456 2870.17 499.781 2255.51C308.969 1719.17 2457.51 1613.83 2111.78 963.512C1766.05 313.198 427.949 2195.17 132.281 1455.51C-155.219 736.292 2014.78 891.514 1708.78 252.012C1437.81 -314.29 369.471 909.169 132.281 566.512C18.1772 401.672 244.781 193.012 244.781 193.012";
const BASE_STROKE = "#e0e0e0";

let rowStartWidth = 125;
let rowEndWidth = 500;

function init() {
  const section = document.querySelector(".projects");
  if (!section) return;

  let html = "";
  let idx = 0;
  for (let r = 0; r < TOTAL_ROWS; r++) {
    html += '<div class="projects-row">';
    for (let c = 0; c < PROJECTS_PER_ROW; c++) {
      const project = PROJECTS[idx % PROJECTS.length];
      const lazy = r > 0 ? ' loading="lazy"' : '';
      html += `
        <div class="project">
          <div class="project-img">
            <img src="${project.img}" alt="${project.name}"${lazy} />
          </div>
          <div class="svg-stroke svg-stroke-1">
            <svg width="2453" height="2273" viewBox="0 0 2453 2273" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="${SVG_PATH_1}" stroke="${project.color}" stroke-width="200" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="svg-stroke svg-stroke-2">
            <svg width="2250" height="2535" viewBox="0 0 2250 2535" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="${SVG_PATH_2}" stroke="${BASE_STROKE}" stroke-width="200" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="project-title">
            <h3>${project.name}</h3>
            <p>${project.year}</p>
          </div>
        </div>`;
      idx++;
    }
    html += "</div>";
  }
  section.innerHTML = html;

  const rows = [...section.querySelectorAll(".projects-row")];
  const isMobile = window.innerWidth < 1000;
  rowStartWidth = isMobile ? 250 : 125;
  rowEndWidth = isMobile ? 750 : 500;

  calculateSectionHeight(section, rows);
  initHoverAnimations(section);

  gsap.ticker.add(function onScrollUpdate() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    rows.forEach((row) => {
      const rect = row.getBoundingClientRect();
      const rowTop = rect.top + scrollY;
      const rowBottom = rowTop + rect.height;

      const scrollStart = rowTop - viewportHeight;
      const scrollEnd = rowBottom;

      let progress = (scrollY - scrollStart) / (scrollEnd - scrollStart);
      progress = Math.max(0, Math.min(1, progress));

      const width = rowStartWidth + (rowEndWidth - rowStartWidth) * progress;
      row.style.width = `${width}%`;
    });
  });

  window.addEventListener("resize", () => {
    const isMobile = window.innerWidth < 1000;
    rowStartWidth = isMobile ? 250 : 125;
    rowEndWidth = isMobile ? 750 : 500;
    calculateSectionHeight(section, rows);
  });
}

function initHoverAnimations(section) {
  const projects = section.querySelectorAll(".project");

  projects.forEach((project) => {
    const paths = project.querySelectorAll(".svg-stroke path");
    const titleEl = project.querySelector(".project-title h3");

    const split = SplitText.create(titleEl, {
      type: "words",
      mask: "words",
      wordsClass: "word",
    });

    gsap.set(split.words, { yPercent: 100 });

    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
    });

    let tl;

    project.addEventListener("mouseenter", () => {
      if (tl) tl.kill();
      tl = gsap.timeline();

      paths.forEach((path) => {
        tl.to(path, {
          strokeDashoffset: 0,
          attr: { "stroke-width": 700 },
          duration: 1.5,
          ease: "power2.out",
        }, 0);
      });

      tl.to(split.words, {
        yPercent: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.075,
      }, 0.35);
    });

    project.addEventListener("mouseleave", () => {
      if (tl) tl.kill();
      tl = gsap.timeline();

      paths.forEach((path) => {
        const length = path.getTotalLength();
        tl.to(path, {
          strokeDashoffset: length,
          attr: { "stroke-width": 200 },
          duration: 1,
          ease: "power2.out",
        }, 0);
      });

      tl.to(split.words, {
        yPercent: 100,
        duration: 0.5,
        ease: "power3.out",
        stagger: { each: 0.05, from: "end" },
      }, 0);
    });
  });
}

function calculateSectionHeight(section, rows) {
  const firstRow = rows[0];
  firstRow.style.width = `${rowEndWidth}%`;
  const expandedRowHeight = firstRow.offsetHeight;
  firstRow.style.width = "";

  const sectionGap = parseFloat(getComputedStyle(section).gap) || 0;
  const sectionPadding =
    parseFloat(getComputedStyle(section).paddingTop) || 0;

  const expandedSectionHeight =
    expandedRowHeight * rows.length +
    sectionGap * (rows.length - 1) +
    sectionPadding * 2;

  section.style.height = `${expandedSectionHeight}px`;
}

window.addEventListener("load", init);
