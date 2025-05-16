#!/usr/bin/env bash
set -eux

# Install your deps, skipping Playwright’s browsers
npm ci

# Build and test (no playwright install-deps, as Netlify does not allow root)
npm run build
npx playwright test --config=playwright.dist.config.ts
