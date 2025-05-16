import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const harnessDir = path.join(__dirname, ".."),
  publishDir = path.join(harnessDir, "dist");
const indexDest = path.join(publishDir, "index.html");
const PORT = 8080;

// Utility: Recursively copy a directory (used for subdirs only)
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

// Clean and copy the contents of a directory (not the dir itself)
function cleanAndCopyDirContents(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
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

function cleanAndCopyDirContentsFlat(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      // Instead of copying the whole subdir, copy its contents flatly
      for (const subEntry of fs.readdirSync(srcPath)) {
        const subSrcPath = path.join(srcPath, subEntry);
        const subDestPath = path.join(dest, subEntry);
        if (fs.statSync(subSrcPath).isDirectory()) {
          copyDirRecursive(subSrcPath, subDestPath);
        } else {
          fs.copyFileSync(subSrcPath, subDestPath);
        }
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Start the local server in dist mode
function startServer() {
  return spawn("node", [path.join(harnessDir, "serve.js")], {
    env: { ...process.env, HARNESS_DIST: "1", PORT: PORT.toString() },
    stdio: "ignore", // Don't pollute output
    detached: true, // Allow killing child process
  });
}

// Wait for the server to be ready
async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error("Server did not start in time");
}

function logDistContents() {
  console.log("[prepare-netlify] dist/ contents:");
  function walk(dir, prefix = "") {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = path.relative(publishDir, full);
      if (fs.statSync(full).isDirectory()) {
        walk(full, prefix + rel + "/");
      } else {
        console.log("  ", prefix + rel);
      }
    }
  }
  walk(publishDir);
}

async function prerender() {
  logDistContents();
  const server = startServer();
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    // Log browser console and errors for Netlify CI debugging
    page.on("console", (msg) => console.log("[browser]", msg.text()));
    page.on("pageerror", (err) => console.log("[browser error]", err));
    page.on("requestfailed", (req) => {
      console.log(
        `[browser request failed] ${req.url()} - ${req.failure()?.errorText}`
      );
    });
    page.on("response", (resp) => {
      if (resp.status() === 404) {
        console.log(`[browser 404] ${resp.url()}`);
      }
    });
    await page.goto(`http://localhost:${PORT}/`);
    // Wait for at least one test card to appear (robust selector)
    await page.waitForSelector(".carousel-track .testcase", { timeout: 30000 });
    await page.waitForTimeout(250); // Shorter wait for perf
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    fs.writeFileSync(indexDest, html);
    await browser.close();
  } finally {
    process.kill(-server.pid, "SIGKILL"); // Kill process group
  }
  console.log("[prepare-netlify] Pre-rendered HTML written to dist/index.html");
}

function copyAssetsAndBundles() {
  // Clean and copy assets (contents only, flat)
  cleanAndCopyDirContentsFlat(
    path.join(harnessDir, "assets"),
    path.join(publishDir, "assets")
  );
  // Copy styles
  fs.copyFileSync(
    path.join(harnessDir, "styles.css"),
    path.join(publishDir, "styles.css")
  );
  // Copy runtime JS
  fs.copyFileSync(
    path.join(harnessDir, "main.js"),
    path.join(publishDir, "main.js")
  );
  fs.copyFileSync(
    path.join(harnessDir, "sp8d-diagnostics-worker.js"),
    path.join(publishDir, "sp8d-diagnostics-worker.js")
  );
  // Clean and copy scenarios (contents only, flat)
  cleanAndCopyDirContentsFlat(
    path.join(harnessDir, "scenarios"),
    path.join(publishDir, "scenarios")
  );
  // Copy extra JS
  const extraFiles = ["testcases.js"];
  for (const file of extraFiles) {
    const src = path.join(harnessDir, file);
    const dest = path.join(publishDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
  // Copy core/diagnostics bundles
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
  for (const file of coreFiles) {
    const src = path.join(coreDist, file);
    const dest = path.join(publishDir, file);
    if (!fs.existsSync(src))
      throw new Error(
        `${file} not found. Please run 'npm run build' at the monorepo root.`
      );
    fs.copyFileSync(src, dest);
  }
  for (const file of diagFiles) {
    const src = path.join(diagDist, file);
    const dest = path.join(publishDir, file);
    if (!fs.existsSync(src))
      throw new Error(
        `${file} not found. Please run 'npm run build' at the monorepo root.`
      );
    fs.copyFileSync(src, dest);
  }
  // Netlify headers
  fs.writeFileSync(
    path.join(publishDir, "_headers"),
    `/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n`
  );
  console.log("[prepare-netlify] Assets and bundles copied to dist/");
}

(async () => {
  try {
    copyAssetsAndBundles();
    await prerender();
  } catch (err) {
    console.error("[prepare-netlify] ERROR:", err);
    process.exit(1);
  }
})();
