#!/usr/bin/env node

/**
 * This script removes test pages from the build output
 * Run it after the build process completes
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

// Test pages to remove
const testPagesToRemove = ["performance-test", "template-tester"];

console.log("Removing test pages from production build...");

// Function to recursively remove a directory
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recurse
        removeDirectory(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// Remove each test page directory
testPagesToRemove.forEach((page) => {
  const pagePath = path.join(distDir, page);

  if (fs.existsSync(pagePath)) {
    console.log(`Removing test page: ${page}`);
    removeDirectory(pagePath);
  }
});

// Also remove test pages from sitemap
const sitemapPath = path.join(distDir, "sitemap-0.xml");
if (fs.existsSync(sitemapPath)) {
  console.log("Updating sitemap...");

  let sitemapContent = fs.readFileSync(sitemapPath, "utf8");

  // Remove test page entries from sitemap
  testPagesToRemove.forEach((page) => {
    const pageRegex = new RegExp(`<url><loc>.*?/${page}/.*?</loc></url>`, "g");
    sitemapContent = sitemapContent.replace(pageRegex, "");
  });

  fs.writeFileSync(sitemapPath, sitemapContent);
}

console.log("✅ Test pages successfully removed from production build");
