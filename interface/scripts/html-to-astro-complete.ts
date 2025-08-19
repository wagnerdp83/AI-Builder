import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

function toSafeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function convertHtmlToAstroPage(htmlPath: string, outputDir: string) {
  const html = await fs.promises.readFile(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extract head content
  const head = document.querySelector('head');
  const title = head?.querySelector('title')?.textContent || 'Landing Page';
  const metaTags = head?.querySelectorAll('meta') || [];
  const linkTags = head?.querySelectorAll('link') || [];
  const styleTags = head?.querySelectorAll('style') || [];
  const scriptTags = head?.querySelectorAll('script') || [];

  // Extract body content
  const body = document.querySelector('body');
  if (!body) {
    throw new Error('No body tag found in HTML');
  }

  // Create the complete Astro page
  let astroPage = `---
// Auto-generated from HTML
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Meta tags -->
`;

  // Add meta tags
  metaTags.forEach(meta => {
    const attrs = Array.from(meta.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
    astroPage += `  <meta ${attrs}>\n`;
  });

  // Add link tags (fonts, CSS, etc.)
  linkTags.forEach(link => {
    const attrs = Array.from(link.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
    astroPage += `  <link ${attrs}>\n`;
  });

  // Add style tags
  styleTags.forEach(style => {
    astroPage += `  <style>\n${style.textContent}\n  </style>\n`;
  });

  // Add script tags
  scriptTags.forEach(script => {
    if (script.src) {
      const attrs = Array.from(script.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
      astroPage += `  <script ${attrs}></script>\n`;
    } else {
      astroPage += `  <script>\n${script.textContent}\n  </script>\n`;
    }
  });

  astroPage += `</head>
<body>
`;

  // Add body content
  astroPage += body.innerHTML;

  astroPage += `
</body>
</html>`;

  // Save the complete Astro page
  await fs.promises.mkdir(outputDir, { recursive: true });
  const astroPagePath = path.join(outputDir, 'complete-page.astro');
  await fs.promises.writeFile(astroPagePath, astroPage, 'utf-8');
  console.log(`\n✅ Complete Astro page saved to: ${astroPagePath}`);

  // Now slice the Astro page into components
  const astroDom = new JSDOM(astroPage);
  const astroDocument = astroDom.window.document;
  const astroBody = astroDocument.querySelector('body');

  if (!astroBody) {
    throw new Error('No body found in generated Astro page');
  }

  const selectors = ['header', 'section', 'footer', 'main', 'nav', 'aside'];
  const sections: { tag: string, index: number, html: string, className: string }[] = [];

  selectors.forEach(tag => {
    astroBody.querySelectorAll(tag).forEach((el, idx) => {
      const className = el.className ? el.className.split(' ')[0] : `${tag}-${idx + 1}`;
      sections.push({ 
        tag, 
        index: idx, 
        html: el.outerHTML,
        className: toSafeFileName(className)
      });
    });
  });

  // Create components directory
  const componentsDir = path.join(outputDir, 'components');
  await fs.promises.mkdir(componentsDir, { recursive: true });

  // Generate component files
  for (const section of sections) {
    const componentName = `${section.className}.astro`;
    const componentPath = path.join(componentsDir, componentName);
    
    const componentContent = `---
// Auto-generated component from ${section.tag} section
---

${section.html}`;

    await fs.promises.writeFile(componentPath, componentContent, 'utf-8');
    console.log(`📄 Component created: ${componentName}`);
  }

  // Create index.astro that imports all components
  let indexContent = `---
// Auto-generated index page that imports all components
import ${sections.map(s => s.className).join(', ')} from './components/${sections.map(s => s.className).join('.astro, ./components/')}.astro';
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Meta tags -->
`;

  // Add meta tags to index
  metaTags.forEach(meta => {
    const attrs = Array.from(meta.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
    indexContent += `  <meta ${attrs}>\n`;
  });

  // Add link tags to index
  linkTags.forEach(link => {
    const attrs = Array.from(link.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
    indexContent += `  <link ${attrs}>\n`;
  });

  // Add style tags to index
  styleTags.forEach(style => {
    indexContent += `  <style>\n${style.textContent}\n  </style>\n`;
  });

  // Add script tags to index
  scriptTags.forEach(script => {
    if (script.src) {
      const attrs = Array.from(script.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
      indexContent += `  <script ${attrs}></script>\n`;
    } else {
      indexContent += `  <script>\n${script.textContent}\n  </script>\n`;
    }
  });

  indexContent += `</head>
<body>
`;

  // Add component usage
  sections.forEach(section => {
    indexContent += `  <${section.tag}>\n    <${section.className} />\n  </${section.tag}>\n\n`;
  });

  indexContent += `</body>
</html>`;

  const indexPath = path.join(outputDir, 'index.astro');
  await fs.promises.writeFile(indexPath, indexContent, 'utf-8');
  console.log(`📄 Index page created: index.astro`);

  console.log(`\n🎉 Conversion complete!`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📄 Files created:`);
  console.log(`   - complete-page.astro (full Astro page)`);
  console.log(`   - index.astro (index with component imports)`);
  console.log(`   - components/ (${sections.length} individual components)`);
  
  return {
    completePage: astroPagePath,
    indexPage: indexPath,
    components: sections.map(s => s.className)
  };
}

if (require.main === module) {
  const [,, htmlPath, outputDir] = process.argv;
  if (!htmlPath || !outputDir) {
    console.error('Usage: tsx html-to-astro-complete.ts /path/to/input.html /path/to/output/dir');
    process.exit(1);
  }
  convertHtmlToAstroPage(htmlPath, outputDir).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} 