import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Serve the test/index.html from the core package at root
app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "packages", "core", "test", "index.html"));
});

// Serve static files from the test directory
app.use(express.static(path.join(__dirname, "packages", "core", "test")));
// Serve static files from the dist directory (for browser modules)
app.use(
  "/dist",
  express.static(path.join(__dirname, "packages", "core", "dist"))
);

// Catch-all: 404 for anything else
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(port, () => {
  console.log(`SP8D test server running at http://localhost:${port}`);
});
