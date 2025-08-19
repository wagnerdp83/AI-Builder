import fs from "fs";
import path from "path";
import { minify } from "terser";
import CleanCSS from "clean-css";
import { globSync } from "glob";

// Configuration
const config = {
  js: {
    sourceDirs: ["dist/**/*.js"],
    options: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
      toplevel: true,
    },
  },
  css: {
    sourceDirs: ["dist/**/*.css"],
    options: {
      level: 2,
    },
  },
};

// Helper to get file size in KB
const getFileSizeInKB = (filePath) => {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
};

// Minify JavaScript
async function minifyJavaScript() {
  console.log("🔧 Minifying JavaScript files...");

  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  let fileCount = 0;

  try {
    const files = globSync(config.js.sourceDirs);

    for (const file of files) {
      // Skip already minified files
      if (file.includes(".min.js")) {
        continue;
      }

      const code = fs.readFileSync(file, "utf8");
      const origSize = Buffer.byteLength(code, "utf8");
      totalSizeBefore += origSize;

      try {
        const minified = await minify(code, config.js.options);

        if (minified.code) {
          fs.writeFileSync(file, minified.code);

          const newSize = Buffer.byteLength(minified.code, "utf8");
          totalSizeAfter += newSize;

          const savings = ((1 - newSize / origSize) * 100).toFixed(2);
          console.log(
            `✅ ${path.basename(file)}: ${(origSize / 1024).toFixed(2)}KB → ${(newSize / 1024).toFixed(2)}KB (${savings}% saved)`,
          );

          fileCount++;
        }
      } catch (err) {
        console.error(`❌ Error minifying ${file}:`, err.message);
      }
    }

    const totalSavings = ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(
      2,
    );
    console.log(
      `\n🎉 Minified ${fileCount} JavaScript files. Total savings: ${totalSavings}%`,
    );
    console.log(
      `   Before: ${(totalSizeBefore / 1024).toFixed(2)}KB → After: ${(totalSizeAfter / 1024).toFixed(2)}KB\n`,
    );
  } catch (err) {
    console.error("❌ JavaScript minification failed:", err);
  }
}

// Minify CSS
function minifyCSS() {
  console.log("🔧 Minifying CSS files...");

  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  let fileCount = 0;

  try {
    const cssMinifier = new CleanCSS(config.css.options);
    const files = globSync(config.css.sourceDirs);

    for (const file of files) {
      // Skip already minified files
      if (file.includes(".min.css")) {
        continue;
      }

      const code = fs.readFileSync(file, "utf8");
      const origSize = Buffer.byteLength(code, "utf8");
      totalSizeBefore += origSize;

      try {
        const minified = cssMinifier.minify(code);

        if (minified.styles) {
          fs.writeFileSync(file, minified.styles);

          const newSize = Buffer.byteLength(minified.styles, "utf8");
          totalSizeAfter += newSize;

          const savings = ((1 - newSize / origSize) * 100).toFixed(2);
          console.log(
            `✅ ${path.basename(file)}: ${(origSize / 1024).toFixed(2)}KB → ${(newSize / 1024).toFixed(2)}KB (${savings}% saved)`,
          );

          fileCount++;
        }
      } catch (err) {
        console.error(`❌ Error minifying ${file}:`, err.message);
      }
    }

    const totalSavings = ((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(
      2,
    );
    console.log(
      `\n🎉 Minified ${fileCount} CSS files. Total savings: ${totalSavings}%`,
    );
    console.log(
      `   Before: ${(totalSizeBefore / 1024).toFixed(2)}KB → After: ${(totalSizeAfter / 1024).toFixed(2)}KB\n`,
    );
  } catch (err) {
    console.error("❌ CSS minification failed:", err);
  }
}

// Run the minification process
async function run() {
  console.log("🚀 Starting build optimization...");
  await minifyJavaScript();
  minifyCSS();
  console.log("✨ Build optimization complete!");
}

run();
