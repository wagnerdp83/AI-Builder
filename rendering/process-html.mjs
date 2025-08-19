import { minify } from "html-minifier-terser";
import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

const minifyOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  minifyURLs: true,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  removeOptionalTags: true,
  removeTagWhitespace: true,
  sortAttributes: true,
  sortClassName: true,
  processScripts: ["application/ld+json"],
};

async function processDirectory(directory) {
  const files = await readdir(directory, { withFileTypes: true });

  for (const file of files) {
    const path = join(directory, file.name);

    if (file.isDirectory()) {
      await processDirectory(path);
    } else if (file.name.endsWith(".html")) {
      try {
        const content = await readFile(path, "utf-8");
        const minified = await minify(content, minifyOptions);
        await writeFile(path, minified);
        console.log(`Minified: ${path}`);
      } catch (error) {
        console.error(`Error processing ${path}:`, error);
      }
    }
  }
}

// Process the dist directory
const distDir = "./dist";
processDirectory(distDir).catch(console.error);
