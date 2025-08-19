import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("🔄 Restoring original configuration...");

try {
  const originalConfig = path.join(rootDir, "astro.config.mjs");
  const backupConfig = path.join(rootDir, "astro.config.backup.mjs");

  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, originalConfig);
    fs.unlinkSync(backupConfig);
    console.log("✅ Original configuration restored");
  } else {
    console.log("⚠️ No backup configuration found");
  }
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
