import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const harnessDir = path.resolve(__dirname, ".."),
  publishDir = path.resolve(harnessDir, "dist");
const indexDest = path.resolve(publishDir, "index.html");
const PORT = 8080;

// --- LOGGING UTILS ---
const LOG_LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
const LOG_LEVEL = (() => {
  const env = process.env.PREPARE_NETLIFY_LOG_LEVEL;
  if (!env) return LOG_LEVELS.info;
  const level = LOG_LEVELS[env.toLowerCase()];
  return level !== undefined ? level : LOG_LEVELS.info;
})();
const DRY_RUN =
  process.env.PREPARE_NETLIFY_DRY_RUN === "1" ||
  process.env.PREPARE_NETLIFY_DRY_RUN === "true";
function color(level) {
  switch (level) {
    case "error":
      return "\x1b[31m"; // red
    case "warn":
      return "\x1b[33m"; // yellow
    case "info":
      return "\x1b[36m"; // cyan
    case "debug":
      return "\x1b[90m"; // gray
    default:
      return "";
  }
}
function log(level, ...args) {
  if (LOG_LEVEL < LOG_LEVELS[level]) return;
  const c = color(level);
  const reset = c ? "\x1b[0m" : "";
  if (c) {
    console.log(c, ...args, reset);
  } else {
    console.log(...args);
  }
}

// --- FILE UTILS ---
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
async function copyDirRecursive(src, dest, summary) {
  if (!(await exists(dest))) {
    if (!DRY_RUN) await fs.mkdir(dest, { recursive: true });
    summary.createdDirs.push(dest);
  }
  for (const entry of await fs.readdir(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if ((await fs.stat(srcPath)).isDirectory()) {
      await copyDirRecursive(srcPath, destPath, summary);
    } else {
      if (!DRY_RUN) await fs.copyFile(srcPath, destPath);
      summary.copiedFiles.push(destPath);
    }
  }
}
async function cleanAndCopyDirContents(src, dest, summary) {
  if (await exists(dest)) {
    if (!DRY_RUN) await fs.rm(dest, { recursive: true, force: true });
    summary.deletedDirs.push(dest);
  }
  if (!DRY_RUN) await fs.mkdir(dest, { recursive: true });
  summary.createdDirs.push(dest);
  for (const entry of await fs.readdir(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if ((await fs.stat(srcPath)).isDirectory()) {
      await copyDirRecursive(srcPath, destPath, summary);
    } else {
      if (!DRY_RUN) await fs.copyFile(srcPath, destPath);
      summary.copiedFiles.push(destPath);
    }
  }
}
async function logDistContents(label = "[prepare-netlify] dist/ contents:") {
  if (LOG_LEVEL < LOG_LEVELS.info) return;
  log("info", label);
  const seen = new Set();
  async function walk(dir, prefix = "") {
    for (const entry of await fs.readdir(dir)) {
      const full = path.join(dir, entry);
      if ((await fs.stat(full)).isDirectory()) {
        await walk(full, prefix + entry + "/");
      } else {
        const rel = prefix + entry;
        if (!seen.has(rel)) {
          log("info", "  ", rel);
          seen.add(rel);
        }
      }
    }
  }
  await walk(publishDir);
}

// --- BUILD STEPS ---
async function validateRequiredFiles() {
  const required = [
    "index.html",
    "styles.css",
    "main.js",
    "sp8d-diagnostics-worker.js",
    "assets",
    "scenarios",
    "testcases.js",
  ];
  for (const file of required) {
    const p = path.resolve(harnessDir, file);
    if (!(await exists(p))) throw new Error(`Missing required: ${file}`);
  }
  const coreDist = path.resolve(__dirname, "../../core/dist");
  const diagDist = path.resolve(__dirname, "../../diagnostics/dist");
  for (const file of [
    "sp8d-core.js",
    "sp8d-core.js.map",
    "sp8d-core.d.ts",
    "sp8d-core.d.ts.map",
    "sp8d-diagnostics.js",
    "sp8d-diagnostics.js.map",
    "sp8d-diagnostics.d.ts",
    "sp8d-diagnostics.d.ts.map",
  ]) {
    const src = file.startsWith("sp8d-core")
      ? path.join(coreDist, file)
      : path.join(diagDist, file);
    if (!(await exists(src)))
      throw new Error(
        `${file} not found. Please run 'npm run build' at the monorepo root.`
      );
  }
}
async function cleanDist(summary) {
  if (await exists(publishDir)) {
    if (!DRY_RUN) await fs.rm(publishDir, { recursive: true, force: true });
    summary.deletedDirs.push(publishDir);
  }
  if (!DRY_RUN) await fs.mkdir(publishDir, { recursive: true });
  summary.createdDirs.push(publishDir);
}
async function copyAssetsAndBundles(summary) {
  await cleanDist(summary);
  await validateRequiredFiles();
  const copy = async (src, dest) => {
    if (!DRY_RUN) await fs.copyFile(src, dest);
    summary.copiedFiles.push(dest);
  };
  await copy(
    path.resolve(harnessDir, "index.html"),
    path.resolve(publishDir, "index.html")
  );
  await cleanAndCopyDirContents(
    path.resolve(harnessDir, "assets"),
    path.resolve(publishDir, "assets"),
    summary
  );
  await copy(
    path.resolve(harnessDir, "styles.css"),
    path.resolve(publishDir, "styles.css")
  );
  await copy(
    path.resolve(harnessDir, "main.js"),
    path.resolve(publishDir, "main.js")
  );
  await copy(
    path.resolve(harnessDir, "sp8d-diagnostics-worker.js"),
    path.resolve(publishDir, "sp8d-diagnostics-worker.js")
  );
  await cleanAndCopyDirContents(
    path.resolve(harnessDir, "scenarios"),
    path.resolve(publishDir, "scenarios"),
    summary
  );
  if (await exists(path.resolve(harnessDir, "testcases.js"))) {
    await copy(
      path.resolve(harnessDir, "testcases.js"),
      path.resolve(publishDir, "testcases.js")
    );
  }
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
  const coreDist = path.resolve(__dirname, "../../core/dist");
  const diagDist = path.resolve(__dirname, "../../diagnostics/dist");
  for (const file of coreFiles) {
    await copy(path.join(coreDist, file), path.join(publishDir, file));
  }
  for (const file of diagFiles) {
    await copy(path.join(diagDist, file), path.join(publishDir, file));
  }
  if (!DRY_RUN)
    await fs.writeFile(
      path.resolve(publishDir, "_headers"),
      `/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n`
    );
  summary.copiedFiles.push(path.resolve(publishDir, "_headers"));
  log("info", `[prepare-netlify] Assets and bundles copied to dist/`);
}

// --- PRERENDER ---
async function prerender(summary) {
  await logDistContents();
  if (DRY_RUN) {
    log("info", "[prepare-netlify] DRY RUN: Skipping prerender step.");
    return;
  }
  const server = startServer();
  const prerenderDest = path.resolve(publishDir, "index.prerender.html");
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (msg) =>
      log("debug", "[browser]", msg.type(), msg.text())
    );
    page.on("pageerror", (err) => log("error", "[browser error]", err));
    page.on("request", (req) =>
      log("debug", "[browser request]", req.method(), req.url())
    );
    page.on("requestfinished", (req) =>
      log("debug", "[browser request finished]", req.url())
    );
    page.on("requestfailed", (req) =>
      log(
        "warn",
        `[browser request failed] ${req.url()} - ${req.failure()?.errorText}`
      )
    );
    page.on("response", (resp) => {
      if (resp.status() === 404) log("warn", `[browser 404] ${resp.url()}`);
    });
    await page.goto(`http://localhost:${PORT}/`);
    try {
      await page.waitForSelector(".carousel-track", { timeout: 10000 });
      await page.waitForSelector(".carousel-track .testcase", {
        timeout: 20000,
      });
    } catch (e) {
      log(
        "error",
        "[prerender] .carousel-track or .testcase did not appear in time"
      );
      const debugHtml = await page.evaluate(
        () => document.documentElement.outerHTML
      );
      await fs.writeFile(
        path.resolve(publishDir, "debug-prerender.html"),
        debugHtml
      );
      summary.failed = true;
      throw e;
    }
    await page.waitForTimeout(250);
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    await fs.writeFile(prerenderDest, html);
    await browser.close();
    summary.copiedFiles.push(prerenderDest);
  } finally {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch (e) {
      if (!e || e.code !== "ESRCH") throw e;
    }
  }
  await fs.rename(prerenderDest, indexDest);
  summary.copiedFiles.push(indexDest);
  log("info", "[prepare-netlify] Pre-rendered HTML written to dist/index.html");
}

// --- SERVER ---
function startServer() {
  return spawn("node", [path.resolve(harnessDir, "serve.js")], {
    env: { ...process.env, HARNESS_DIST: "1", PORT: PORT.toString() },
    stdio: "ignore",
    detached: true,
  });
}
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

// --- SUMMARY ---
function printSummary(summary) {
  log("info", "\n[prepare-netlify] Build Summary:");
  log("info", `  Files copied: ${summary.copiedFiles.length}`);
  log("info", `  Dirs created: ${summary.createdDirs.length}`);
  log("info", `  Dirs deleted: ${summary.deletedDirs.length}`);
  if (summary.failed)
    log("error", "  Prerender failed. See debug-prerender.html");
  if (DRY_RUN) log("info", "  DRY RUN: No files were actually written.");
}

// --- MAIN ---
(async () => {
  const summary = {
    copiedFiles: [],
    createdDirs: [],
    deletedDirs: [],
    failed: false,
  };
  try {
    log(
      "info",
      `[prepare-netlify] Starting build${DRY_RUN ? " (DRY RUN)" : ""}...`
    );
    await copyAssetsAndBundles(summary);
    await prerender(summary);
    printSummary(summary);
  } catch (err) {
    log("error", "[prepare-netlify] ERROR:", err);
    printSummary(summary);
    process.exit(1);
  }
})();
