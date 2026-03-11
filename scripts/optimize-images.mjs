import sharp from "sharp";
import { glob } from "glob";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const PUBLIC = "public/images";
const OUTPUT = "public/images/optimized";
const MANIFEST_PATH = "scripts/.image-manifest.json";

// ── Category configs ──────────────────────────────────────────
const CATEGORIES = [
  {
    name: "hero",
    patterns: [`${PUBLIC}/portrait-top.jpg`, `${PUBLIC}/portrait-bottom.jpg`],
    resizeBy: "width",
    sizes: [1920, 1280],
    formats: ["webp", "jpg"],
    quality: { webp: 85, jpg: 85 },
  },
  {
    name: "background",
    patterns: [`${PUBLIC}/timber-interior-texture.jpg`],
    resizeBy: "width",
    sizes: [1920, 1280],
    formats: ["webp", "jpg"],
    quality: { webp: 80, jpg: 80 },
  },
  {
    name: "projects",
    patterns: [`${PUBLIC}/projects/*.jpg`],
    resizeBy: "width",
    sizes: [600, 400, 200],
    formats: ["webp", "jpg"],
    quality: { webp: 80, jpg: 82 },
  },
  {
    name: "icons",
    patterns: [`${PUBLIC}/icons/final_*.png`],
    resizeBy: "width",
    sizes: [144, 72],
    formats: ["webp", "png"],
    quality: { webp: "lossless", png: {} },
  },
  {
    name: "logos",
    patterns: [`${PUBLIC}/icons/slot_*.png`],
    resizeBy: "height",
    sizes: [128, 64],
    formats: ["webp", "png"],
    quality: { webp: "lossless", png: {} },
  },
  {
    name: "photos",
    patterns: [`${PUBLIC}/photos/*.jpg`, `${PUBLIC}/photos/*.png`],
    resizeBy: "width",
    sizes: [900, 600, 400],
    formats: ["webp", "original"],
    quality: { webp: 82, jpg: 85, png: {} },
  },
  {
    name: "photos/stickers",
    patterns: [`${PUBLIC}/photos/stickers/3x/*.png`],
    resizeBy: "width",
    sizes: [400, 200, 134],
    formats: ["webp", "png"],
    quality: { webp: "lossless", png: {} },
    sanitize: true,
  },
  {
    name: "case-studies-thumb",
    patterns: [`${PUBLIC}/case-studies/**/*.jpg`, `${PUBLIC}/case-studies/**/*.png`],
    resizeBy: "height",
    sizes: [560, 420, 360],
    formats: ["webp", "original"],
    quality: { webp: 80, jpg: 82, png: {} },
    preserveStructure: true,
    structureBase: `${PUBLIC}/case-studies`,
  },
  {
    name: "case-studies-full",
    patterns: [`${PUBLIC}/case-studies/**/*.jpg`, `${PUBLIC}/case-studies/**/*.png`],
    resizeBy: "maxEdge",
    sizes: [2400],
    formats: ["webp", "original"],
    quality: { webp: 90, jpg: 90, png: {} },
    preserveStructure: true,
    structureBase: `${PUBLIC}/case-studies`,
    suffix: "full",
  },
];

// ── Manifest (cache) ────────────────────────────────────────

async function loadManifest() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveManifest(manifest) {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function manifestKey(filePath, categoryName) {
  return `${categoryName}::${filePath}`;
}

async function getFileFingerprint(filePath) {
  const stat = await fs.stat(filePath);
  return `${stat.mtimeMs}:${stat.size}`;
}

// ── Helpers ───────────────────────────────────────────────────

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function getOriginalFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  return ext;
}

function getOutputDir(category, filePath) {
  if (category.preserveStructure && category.structureBase) {
    const rel = path.relative(category.structureBase, path.dirname(filePath));
    const baseName = category.suffix === "full" ? "case-studies-full" : "case-studies";
    return path.join(OUTPUT, baseName, rel);
  }
  return path.join(OUTPUT, category.name);
}

function getOutputBasename(category, filePath) {
  const parsed = path.parse(filePath);
  let name = parsed.name;
  if (category.sanitize) {
    name = sanitizeFilename(name);
  }
  return name;
}

async function processImage(filePath, category) {
  const outputDir = getOutputDir(category, filePath);
  await fs.mkdir(outputDir, { recursive: true });

  const baseName = getOutputBasename(category, filePath);
  const origFormat = getOriginalFormat(filePath);
  const metadata = await sharp(filePath).metadata();
  const results = [];

  for (const size of category.sizes) {
    // Determine resize options
    let resizeOpts = {};
    let sizeSuffix = size;

    if (category.resizeBy === "width") {
      if (metadata.width <= size) {
        resizeOpts = {}; // don't upscale
      } else {
        resizeOpts = { width: size };
      }
    } else if (category.resizeBy === "height") {
      if (metadata.height <= size) {
        resizeOpts = {};
      } else {
        resizeOpts = { height: size };
      }
    } else if (category.resizeBy === "maxEdge") {
      const maxDim = Math.max(metadata.width, metadata.height);
      if (maxDim <= size) {
        resizeOpts = {};
      } else if (metadata.width >= metadata.height) {
        resizeOpts = { width: size };
      } else {
        resizeOpts = { height: size };
      }
      sizeSuffix = category.suffix || size;
    }

    for (const format of category.formats) {
      const actualFormat = format === "original" ? origFormat : format;
      const ext = actualFormat === "jpg" ? "jpg" : actualFormat;
      const outFile = path.join(outputDir, `${baseName}-${sizeSuffix}.${ext}`);

      let pipeline = sharp(filePath);

      if (Object.keys(resizeOpts).length > 0) {
        pipeline = pipeline.resize(resizeOpts);
      }

      // Apply format + quality
      if (actualFormat === "webp") {
        if (category.quality.webp === "lossless") {
          pipeline = pipeline.webp({ lossless: true });
        } else {
          pipeline = pipeline.webp({ quality: category.quality.webp });
        }
      } else if (actualFormat === "jpg") {
        pipeline = pipeline.jpeg({ quality: category.quality.jpg || 85 });
      } else if (actualFormat === "png") {
        pipeline = pipeline.png({
          compressionLevel: 9,
          palette: false,
        });
      }

      await pipeline.toFile(outFile);
      results.push(outFile);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const forceAll = process.argv.includes("--force");
  console.log(`Optimizing images${forceAll ? " (forced full rebuild)" : ""}...\n`);
  const startTime = Date.now();
  let totalFiles = 0;
  let skippedFiles = 0;

  const manifest = forceAll ? {} : await loadManifest();
  const newManifest = {};

  for (const category of CATEGORIES) {
    const files = [];
    for (const pattern of category.patterns) {
      const matches = await glob(pattern);
      files.push(...matches);
    }

    if (files.length === 0) {
      console.log(`  [${category.name}] No files found, skipping.`);
      continue;
    }

    let processed = 0;
    let skipped = 0;

    for (const filePath of files) {
      const key = manifestKey(filePath, category.name);
      const fingerprint = await getFileFingerprint(filePath);

      // Skip if unchanged since last build
      if (manifest[key] === fingerprint) {
        newManifest[key] = fingerprint;
        skipped++;
        skippedFiles++;
        continue;
      }

      try {
        const outputs = await processImage(filePath, category);
        totalFiles += outputs.length;
        processed++;
        newManifest[key] = fingerprint;
      } catch (err) {
        console.error(`    ERROR processing ${filePath}: ${err.message}`);
      }
    }

    if (processed > 0) {
      console.log(`  [${category.name}] Processed ${processed} images${skipped > 0 ? `, skipped ${skipped} unchanged` : ""}`);
    } else {
      console.log(`  [${category.name}] All ${skipped} images unchanged, skipped.`);
    }
  }

  await saveManifest(newManifest);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s — ${totalFiles} files generated, ${skippedFiles} images skipped (cached)`);
}

async function dirSize(dir) {
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(entry.parentPath || entry.path, entry.name);
        const stat = await fs.stat(fullPath);
        total += stat.size;
      }
    }
  } catch {
    // ignore
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

main().catch(console.error);
