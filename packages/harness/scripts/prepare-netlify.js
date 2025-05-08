import fs from "fs";
import path from "path";

const harnessDir = process.cwd();
const publishDir = path.join(harnessDir, "dist");
const indexSrc = path.join(harnessDir, "index.html");
const scenariosSrc = path.join(harnessDir, "scenarios");
const coreDistSrc = path.join(harnessDir, "../core/dist");
const diagDistSrc = path.join(harnessDir, "../diagnostics/dist");
const indexDest = path.join(publishDir, "index.html");
const scenariosDest = path.join(publishDir, "scenarios");
const coreDest = path.join(publishDir, "core");
const diagDest = path.join(publishDir, "diagnostics");
const workerSrc = path.join(harnessDir, "sp8d-diagnostics-worker.js");
const workerDest = path.join(publishDir, "sp8d-diagnostics-worker.js");
const headersFile = path.join(publishDir, "_headers");

fs.rmSync(publishDir, { recursive: true, force: true });
fs.mkdirSync(publishDir, { recursive: true });

// Copy index.html
fs.copyFileSync(indexSrc, indexDest);
// Copy main.js
fs.copyFileSync(path.join(harnessDir, "main.js"), path.join(publishDir, "main.js"));
// Copy styles.css
fs.copyFileSync(path.join(harnessDir, "styles.css"), path.join(publishDir, "styles.css"));
// Copy scenarios/
fs.mkdirSync(scenariosDest, { recursive: true });
for (const file of fs.readdirSync(scenariosSrc)) {
  fs.copyFileSync(
    path.join(scenariosSrc, file),
    path.join(scenariosDest, file)
  );
}
// Copy core dist to dist/core
fs.mkdirSync(coreDest, { recursive: true });
for (const file of fs.readdirSync(coreDistSrc)) {
  fs.copyFileSync(path.join(coreDistSrc, file), path.join(coreDest, file));
}
// Copy diagnostics dist to dist/diagnostics
fs.mkdirSync(diagDest, { recursive: true });
for (const file of fs.readdirSync(diagDistSrc)) {
  fs.copyFileSync(path.join(diagDistSrc, file), path.join(diagDest, file));
}
// Copy diagnostics worker
fs.copyFileSync(workerSrc, workerDest);
// Write _headers
fs.writeFileSync(
  headersFile,
  `/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n`
);

console.log("Netlify publish directory prepared at:", publishDir);
