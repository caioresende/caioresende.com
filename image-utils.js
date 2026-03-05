/**
 * Image optimization utilities.
 * Maps original image paths to optimized responsive variants.
 */

// ── WebP detection (cached) ──────────────────────────────────

let _webpResult = null;

export function supportsWebPSync() {
  if (_webpResult !== null) return _webpResult;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    _webpResult = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    _webpResult = false;
  }
  return _webpResult;
}

// ── Path mapping ─────────────────────────────────────────────

function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function getOrigExt(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

/**
 * Map categories to their optimized subdirectory.
 * Original path patterns → optimized output folder.
 */
const PATH_MAP = [
  { match: "/images/portrait-",                 dir: "hero",           sanitizeName: false },
  { match: "/images/timber-interior-texture",    dir: "background",     sanitizeName: false },
  { match: "/images/projects/",                  dir: "projects",       sanitizeName: false },
  { match: "/images/icons/final_",               dir: "icons",          sanitizeName: false },
  { match: "/images/icons/slot_",                dir: "logos",          sanitizeName: false },
  { match: "/images/photos/stickers/",           dir: "photos/stickers",sanitizeName: true },
  { match: "/images/photos/",                    dir: "photos",         sanitizeName: false },
];

/**
 * Build the optimized image path.
 *
 * @param {string} originalPath  e.g. "/images/projects/img1.jpg"
 * @param {number|string} size   e.g. 400 or "full"
 * @param {string} [format]      "webp" | "jpg" | "png" — defaults to webp if supported
 * @returns {string}             e.g. "/images/optimized/projects/img1-400.webp"
 */
export function optimizedPath(originalPath, size, format) {
  if (!format) {
    format = supportsWebPSync() ? "webp" : getOrigExt(originalPath);
  }

  // Find matching category
  const entry = PATH_MAP.find((e) => originalPath.includes(e.match));
  if (!entry) {
    // Unknown category — return original
    return originalPath;
  }

  // Extract filename without extension
  const fileName = originalPath.split("/").pop();
  const baseName = fileName.substring(0, fileName.lastIndexOf("."));
  const cleanName = entry.sanitizeName ? sanitize(baseName) : baseName;

  return `/images/optimized/${entry.dir}/${cleanName}-${size}.${format}`;
}

/**
 * Build optimized path for case study images.
 * These preserve subdirectory structure (e.g. fifa/, portals/).
 *
 * @param {string} originalPath  e.g. "/images/case-studies/fifa/home-desktop.png"
 * @param {number|string} size   e.g. 560 or "full"
 * @param {string} [format]      "webp" | "jpg" | "png"
 * @param {boolean} [isFull]     true → use case-studies-full/ dir
 * @returns {string}
 */
export function optimizedCaseStudyPath(originalPath, size, format, isFull = false) {
  if (!format) {
    format = supportsWebPSync() ? "webp" : getOrigExt(originalPath);
  }

  // Extract: /images/case-studies/fifa/home-desktop.png
  //        → project = "fifa", file = "home-desktop"
  const parts = originalPath.split("/images/case-studies/");
  if (parts.length < 2) return originalPath;

  const rest = parts[1]; // "fifa/home-desktop.png"
  const segments = rest.split("/");
  const project = segments.slice(0, -1).join("/"); // "fifa"
  const fileName = segments[segments.length - 1];
  const baseName = fileName.substring(0, fileName.lastIndexOf("."));

  const dir = isFull ? "case-studies-full" : "case-studies";
  const suffix = isFull ? "full" : size;

  return `/images/optimized/${dir}/${project}/${baseName}-${suffix}.${format}`;
}

/**
 * Pick the smallest available size that is >= displayWidth * DPR.
 *
 * @param {number[]} availableSizes  e.g. [600, 400, 200]
 * @param {number} displaySize       CSS pixel width or height of the container
 * @returns {number}
 */
export function selectSize(availableSizes, displaySize) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const target = displaySize * dpr;
  const sorted = [...availableSizes].sort((a, b) => a - b);
  return sorted.find((s) => s >= target) || sorted[sorted.length - 1];
}
