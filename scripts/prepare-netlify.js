import fs from "fs";
import path from "path";

const root = path.resolve();
const publishDir = path.join(root, "netlify_publish");
const indexSrc = path.join(root, "packages", "core", "test", "index.html");
const distSrc = path.join(root, "packages", "core", "dist");
const indexDest = path.join(publishDir, "index.html");
const distDest = path.join(publishDir, "dist");
const headersFile = path.join(publishDir, "_headers");

fs.rmSync(publishDir, { recursive: true, force: true });
fs.mkdirSync(publishDir, { recursive: true });

// Copy index.html
fs.copyFileSync(indexSrc, indexDest);

// Copy dist/
fs.mkdirSync(distDest, { recursive: true });
for (const file of fs.readdirSync(distSrc)) {
  fs.copyFileSync(path.join(distSrc, file), path.join(distDest, file));
}

// Write _headers
fs.writeFileSync(
  headersFile,
  `/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n`
);

console.log("Netlify publish directory prepared at:", publishDir);
