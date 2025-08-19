#!/usr/bin/env node

/**
 * Specialized Performance Testing Script
 * This script:
 * 1. Backs up your current config
 * 2. Uses the performance-optimized config
 * 3. Builds your site
 * 4. Starts a preview server for testing
 * 5. Restores your original config
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Config paths
const configPath = path.join(rootDir, "astro.config.mjs");
const backupPath = path.join(rootDir, "astro.config.original.mjs");
const performanceConfigPath = path.join(rootDir, "astro.config.original.mjs");

// Print nice banner
console.log("\n");
console.log("┌──────────────────────────────────────────────────┐");
console.log("│                                                  │");
console.log("│   🚀 PERFORMANCE TESTING ENVIRONMENT             │");
console.log("│                                                  │");
console.log("└──────────────────────────────────────────────────┘");
console.log("\n");

try {
  // Step 1: Backup current config
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, backupPath);
    console.log("✅ Original configuration backed up");
  }

  // Step 2: Copy performance config
  if (fs.existsSync(performanceConfigPath)) {
    fs.copyFileSync(performanceConfigPath, configPath);
    console.log("✅ Performance-optimized configuration activated");
  } else {
    console.error("❌ Performance config not found at:", performanceConfigPath);
    process.exit(1);
  }

  // Step 3: Build site
  console.log("\n🔨 Building site with performance-optimized settings...");
  execSync("astro build", {
    stdio: "inherit",
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
  });

  console.log("\n✅ Build complete!");
  console.log("\n🌐 Starting preview server for performance testing");

  // Step 4: Instructions for testing
  console.log("\n📋 Testing Instructions:");
  console.log(
    "  1. Open Chrome and navigate to http://localhost:4321/performance-test/",
  );
  console.log("  2. Open Chrome DevTools (F12)");
  console.log("  3. Go to the Lighthouse tab");
  console.log("  4. Run Lighthouse for Performance (mobile mode recommended)");
  console.log("  5. When finished, press Ctrl+C in this terminal\n");

  // Launch preview
  execSync("astro preview", {
    stdio: "inherit",
    cwd: rootDir,
  });
} catch (error) {
  console.error("❌ Error:", error.message);
} finally {
  // Step 5: Always restore original config
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
    console.log("\n✅ Original configuration restored");
  }
}
