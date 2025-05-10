import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { testCases } from "../testcases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const harnessDir = path.join(__dirname, "..");
const publishDir = path.join(harnessDir, "dist");
const indexSrc = path.join(harnessDir, "index.html");
const indexDest = path.join(publishDir, "index.html");

function createTestCaseHTML({
  id,
  title,
  scenario,
  why,
  metricId,
  outputId,
  keyMetric,
}) {
  return `
    <div class="testcase" id="${id}">
      <div class="testcase-header">
        <h2>${title}</h2>
        <button class="runbtn">▶ Run</button>
      </div>
      <div class="test-desc">
        <b>Scenario:</b> ${scenario}<br />
        <b>Why It Matters:</b> ${why}
      </div>
      <div class="metricbar">
        <span class="metric" id="${metricId}">Not run</span>
      </div>
      <div class="live-output" id="${outputId}"></div>
      <div class="case-footer">Key metric: ${keyMetric}</div>
    </div>`;
}

function injectTestCases(html, cardsHTML) {
  return html.replace(
    /(<div class="carousel-track" id="carousel-track" tabindex="0">)([\s\S]*?)(<\/div>)/,
    `$1\n${cardsHTML}\n$3`
  );
}

try {
  fs.mkdirSync(publishDir, { recursive: true });
  const html = fs.readFileSync(indexSrc, "utf8");
  const cardsHTML = testCases.map(createTestCaseHTML).join("\n");
  const outHTML = injectTestCases(html, cardsHTML);
  fs.writeFileSync(indexDest, outHTML, "utf8");
  console.log(
    "[prepare-netlify] Static test cards injected for SEO: dist/index.html"
  );
  // Copy assets folder to dist
  const assetsSrc = path.join(harnessDir, "assets");
  const assetsDest = path.join(publishDir, "assets");
  if (fs.existsSync(assetsDest)) {
    fs.rmSync(assetsDest, { recursive: true, force: true });
  }
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const file of fs.readdirSync(assetsSrc)) {
    fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file));
  }
  // Copy styles.css to dist
  const stylesSrc = path.join(harnessDir, "styles.css");
  const stylesDest = path.join(publishDir, "styles.css");
  fs.copyFileSync(stylesSrc, stylesDest);

  // === Copy runtime JS for production ===
  // Copy main.js
  fs.copyFileSync(
    path.join(__dirname, "../main.js"),
    path.join(__dirname, "../dist/main.js")
  );
  // Copy sp8d-diagnostics-worker.js
  fs.copyFileSync(
    path.join(__dirname, "../sp8d-diagnostics-worker.js"),
    path.join(__dirname, "../dist/sp8d-diagnostics-worker.js")
  );
  // Copy scenarios directory recursively
  function copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  const scenariosSrc = path.join(__dirname, "../scenarios");
  const scenariosDest = path.join(__dirname, "../dist/scenarios");
  copyDirRecursive(scenariosSrc, scenariosDest);

  // Optionally copy any other runtime JS (e.g., testcases.js)
  const extraFiles = ["testcases.js"];
  for (const file of extraFiles) {
    const src = path.join(__dirname, "../" + file);
    const dest = path.join(__dirname, "../dist/" + file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  // === Copy browser-ready SP8D core and diagnostics (including .js, .map, .d.ts) ===
  const coreFiles = [
    "sp8d-core.js",
    "sp8d-core.js.map",
    "sp8d-core.d.ts",
    "sp8d-core.d.ts.map",
  ];
  const diagFiles = [
    "sp8d-diagnostics.js",
    "sp8d-diagnostics.js.map",
    "sp8d-diagnostics.d.ts",
    "sp8d-diagnostics.d.ts.map",
  ];
  const coreDist = path.join(__dirname, "../../core/dist");
  const diagDist = path.join(__dirname, "../../diagnostics/dist");
  const harnessDist = path.join(__dirname, "../dist");
  for (const file of coreFiles) {
    const src = path.join(coreDist, file);
    const dest = path.join(harnessDist, file);
    if (!fs.existsSync(src)) {
      throw new Error(
        `${file} not found. Please run 'npm run build' at the monorepo root.`
      );
    }
    fs.copyFileSync(src, dest);
  }
  for (const file of diagFiles) {
    const src = path.join(diagDist, file);
    const dest = path.join(harnessDist, file);
    if (!fs.existsSync(src)) {
      throw new Error(
        `${file} not found. Please run 'npm run build' at the monorepo root.`
      );
    }
    fs.copyFileSync(src, dest);
  }
} catch (err) {
  console.error("[prepare-netlify] ERROR:", err);
  process.exit(1);
}
