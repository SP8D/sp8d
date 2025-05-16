#!/usr/bin/env bash
set -eux

# 1) Install prerequisites
apt-get update
apt-get install -y wget gnupg2 ca-certificates

# 2) Add Microsoft’s APT repo and GPG key
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge.list

# 3) Install Edge Stable
apt-get update
apt-get install -y microsoft-edge-stable

# 4) Install your deps, skipping Playwright’s browsers
npm ci

# 5) Install Playwright’s dependencies (fonts, libs) but NOT browsers
npx playwright install-deps

# 6) Build and test
npm run build
npx playwright test --config=playwright.dist.config.ts
