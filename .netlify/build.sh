#!/usr/bin/env bash
set -eux

# Install your deps, skipping Playwright’s browsers
npm ci

# Install Playwright’s dependencies (fonts, libs) but NOT browsers
npx playwright install-deps

# Build and test
npm run build
npx playwright test --config=playwright.dist.config.ts
