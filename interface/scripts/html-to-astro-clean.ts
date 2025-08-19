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

async function convertHtmlToCleanAstro(htmlPath: string, outputDir: string) {
  const html = await fs.promises.readFile(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extract only styles and scripts (no meta tags, links, etc.)
  const styleTags = document.querySelectorAll('style') || [];
  const scriptTags = document.querySelectorAll('script') || [];
  const linkStylesheets = document.querySelectorAll('link[rel="stylesheet"]') || [];

  // Extract body content
  const body = document.querySelector('body');
  if (!body) {
    throw new Error('No body tag found in HTML');
  }

  // Create styles.css file
  let stylesContent = `/* Auto-extracted styles from HTML */\n\n`;
  
  // Add external stylesheets
  linkStylesheets.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      stylesContent += `/* External stylesheet: ${href} */\n`;
      stylesContent += `/* You may need to manually include this in your Astro setup */\n\n`;
    }
  });

  // Add embedded styles
  styleTags.forEach((style, index) => {
    stylesContent += `/* Embedded style block ${index + 1} */\n`;
    stylesContent += style.textContent + '\n\n';
  });

  // Create scripts.js file
  let scriptsContent = `// Auto-extracted scripts from HTML\n\n`;
  
  scriptTags.forEach((script, index) => {
    if (script.src) {
      scriptsContent += `// External script: ${script.src}\n`;
      scriptsContent += `// You may need to manually include this in your Astro setup\n\n`;
    } else {
      scriptsContent += `// Embedded script block ${index + 1}\n`;
      scriptsContent += script.textContent + '\n\n';
    }
  });

  // Create output directory
  await fs.promises.mkdir(outputDir, { recursive: true });

  // Save styles and scripts
  const stylesPath = path.join(outputDir, 'extracted-styles.css');
  const scriptsPath = path.join(outputDir, 'extracted-scripts.js');
  
  await fs.promises.writeFile(stylesPath, stylesContent, 'utf-8');
  await fs.promises.writeFile(scriptsPath, scriptsContent, 'utf-8');
  
  console.log(`📄 Styles extracted to: ${stylesPath}`);
  console.log(`📄 Scripts extracted to: ${scriptsPath}`);

  // Now slice the body content into clean components
  const selectors = ['header', 'section', 'footer', 'main', 'nav', 'aside'];
  const sections: { tag: string, index: number, html: string, className: string }[] = [];

  selectors.forEach(tag => {
    body.querySelectorAll(tag).forEach((el, idx) => {
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

  // Generate clean component files (no head content)
  for (const section of sections) {
    const componentName = `${section.className}.astro`;
    const componentPath = path.join(componentsDir, componentName);
    
    const componentContent = `---
// Auto-generated component from ${section.tag} section
// Styles and scripts are in separate files: extracted-styles.css and extracted-scripts.js
---

${section.html}`;

    await fs.promises.writeFile(componentPath, componentContent, 'utf-8');
    console.log(`📄 Component created: ${componentName}`);
  }

  // Create integration guide
  const integrationGuide = `# HTML to Astro Integration Guide

## Files Created:
- \`extracted-styles.css\` - All CSS styles from the HTML
- \`extracted-scripts.js\` - All JavaScript from the HTML  
- \`components/\` - Individual Astro components

## Integration Steps:

### 1. Add Styles to Your Astro Project
Copy the contents of \`extracted-styles.css\` to your main CSS file or include it in your Astro layout.

### 2. Add Scripts to Your Astro Project
Copy the contents of \`extracted-scripts.js\` to your main JavaScript file or include it in your Astro layout.

### 3. Use Components
Import and use the components in your existing \`index.astro\`:

\`\`\`astro
---
import Header from './components/header.astro';
import Hero from './components/hero.astro';
import Services from './components/services.astro';
import Contact from './components/contact.astro';
import Footer from './components/footer.astro';
import Navbar from './components/navbar.astro';
---

<Header />
<Hero />
<Services />
<Contact />
<Footer />
\`\`\`

### 4. External Resources
Check \`extracted-styles.css\` and \`extracted-scripts.js\` for any external resources (fonts, CDN links) that need to be manually included in your Astro setup.

## Notes:
- Meta tags and other head elements were excluded to avoid conflicts
- Only structural HTML, styles, and scripts were extracted
- Components are ready to use with your existing Astro setup
`;

  const guidePath = path.join(outputDir, 'INTEGRATION_GUIDE.md');
  await fs.promises.writeFile(guidePath, integrationGuide, 'utf-8');
  console.log(`📄 Integration guide created: INTEGRATION_GUIDE.md`);

  console.log(`\n🎉 Clean conversion complete!`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📄 Files created:`);
  console.log(`   - extracted-styles.css (all CSS styles)`);
  console.log(`   - extracted-scripts.js (all JavaScript)`);
  console.log(`   - components/ (${sections.length} clean components)`);
  console.log(`   - INTEGRATION_GUIDE.md (integration instructions)`);
  
  return {
    styles: stylesPath,
    scripts: scriptsPath,
    components: sections.map(s => s.className),
    guide: guidePath
  };
}

if (require.main === module) {
  const [,, htmlPath, outputDir] = process.argv;
  if (!htmlPath || !outputDir) {
    console.error('Usage: tsx html-to-astro-clean.ts /path/to/input.html /path/to/output/dir');
    process.exit(1);
  }
  convertHtmlToCleanAstro(htmlPath, outputDir).catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
} 