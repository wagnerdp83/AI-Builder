/**
 * Build script that skips compression
 * Use this to build the site without the astro-compress integration
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get directory paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("🔨 Building site without compression...");

try {
  // Create temporary config without compression
  const configPath = path.join(rootDir, "astro.config.mjs");
  const backupPath = path.join(rootDir, "astro.config.backup.mjs");

  // Backup original config
  fs.copyFileSync(configPath, backupPath);

  // Read the config file
  let configContent = fs.readFileSync(configPath, "utf8");

  // Modify the config to disable compression
  configContent = configContent.replace(
    /compress\(\{[\s\S]*?\}\)/,
    "/* Disabled for build */ null",
  );

  // Write the modified config
  fs.writeFileSync(configPath, configContent);

  console.log("✅ Temporarily disabled compress integration");

  try {
    // Run the build
    execSync("astro build", {
      stdio: "inherit",
      cwd: rootDir,
    });

    console.log("✅ Build completed without compression");
  } finally {
    // Restore original config
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
    console.log("✅ Restored original configuration");
  }

  console.log("");
  console.log("✨ Build completed successfully!");
  console.log("");
  console.log("To preview the site:");
  console.log("  npm run preview");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
