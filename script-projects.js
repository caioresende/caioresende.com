import { PROJECTS } from "./projects.js";
import gsap from "gsap";

const PROJECTS_PER_ROW = 9;
const TOTAL_ROWS = 10;

let rowStartWidth = 125;
let rowEndWidth = 500;

function init() {
  const section = document.querySelector(".projects");
  if (!section) return;

  // Build grid HTML
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
          <div class="project-info">
            <p>${project.name}</p>
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

  function onScrollUpdate() {
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
  }

  gsap.ticker.add(onScrollUpdate);

  window.addEventListener("resize", () => {
    const isMobile = window.innerWidth < 1000;
    rowStartWidth = isMobile ? 250 : 125;
    rowEndWidth = isMobile ? 750 : 500;
    calculateSectionHeight(section, rows);
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
