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
