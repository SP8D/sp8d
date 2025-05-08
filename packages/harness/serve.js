import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
const serveDist =
  process.env.HARNESS_DIST === "1" || process.argv.includes("--dist");

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

if (serveDist) {
  // Serve distributable version from dist/
  const distDir = path.join(__dirname, "dist");
  app.use(express.static(distDir));
  app.use((req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
  console.log("[harness] Serving distributable version from /dist");
} else {
  // Dev mode: serve from source
  app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
  app.use(express.static(__dirname));
  // Map /core/* to ../core/dist/*
  app.use("/core", express.static(path.join(__dirname, "../core/dist")));
  // Map /diagnostics/* to ../diagnostics/dist/*
  app.use(
    "/diagnostics",
    express.static(path.join(__dirname, "../diagnostics/dist"))
  );
  console.log("[harness] Serving development version from source files");
}

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(port, () => {
  console.log(`SP8D harness server running at http://localhost:${port}`);
});
