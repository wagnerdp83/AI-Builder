import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// Utility to sanitize file names
function toSafeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Main function
async function splitHtmlToSections(htmlPath: string, outputDir: string) {
  const html = await fs.promises.readFile(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Find all logical sections
  const selectors = ['header', 'section', 'footer', 'main', 'nav', 'aside'];
  const sections: { tag: string, index: number, html: string }[] = [];

  selectors.forEach(tag => {
    document.querySelectorAll(tag).forEach((el, idx) => {
      sections.push({ tag, index: idx, html: el.outerHTML });
    });
  });

  // Ensure output directory exists
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Write each section to a file and print the LLM prompt
  for (const section of sections) {
    const fileName = `${section.tag}-${section.index + 1}.html`;
    const filePath = path.join(outputDir, fileName);
    await fs.promises.writeFile(filePath, section.html, 'utf-8');
    const prompt = `Convert the following HTML ${section.tag} to a production-ready Astro component.\nPreserve all structure, classes, and content. Use Tailwind CSS and Astro best practices.\nDo not improvise or add new content.\n\nHTML:\n${section.html}`;
    console.log(`\n=== Prompt for ${fileName} ===\n${prompt}\n`);
  }

  console.log(`\nExtracted ${sections.length} sections from ${htmlPath} to ${outputDir}`);
}

// CLI usage: ts-node html-to-astro.ts /path/to/input.html /path/to/output/dir
if (require.main === module) {
  const [,, htmlPath, outputDir] = process.argv;
  if (!htmlPath || !outputDir) {
    console.error('Usage: ts-node html-to-astro.ts /path/to/input.html /path/to/output/dir');
    process.exit(1);
  }
  splitHtmlToSections(htmlPath, outputDir).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} 