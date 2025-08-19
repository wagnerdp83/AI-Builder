import { promises as fs } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { getComponentsDir, getRenderingDir } from '../utils/directory';

export interface HtmlToAstroResult {
  components: string[];
  styles: string;
  scripts: string;
  componentPaths: string[];
}

export class HtmlToAstroConverter {
  /**
   * Converts HTML content to clean Astro components
   * @param htmlContent - The HTML content to convert
   * @param baseComponentName - Base name for components (e.g., "landing-page" -> "landing-page-hero", "landing-page-header")
   * @returns Promise<HtmlToAstroResult>
   */
  private static toPascalCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]+/g, ' ') // Replace non-alphanumeric with space
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  static async convertHtmlToAstroComponents(
    htmlContent: string, 
    baseComponentName: string = 'component'
  ): Promise<HtmlToAstroResult> {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Extract styles and scripts
    const styleTags = document.querySelectorAll('style') || [];
    const scriptTags = document.querySelectorAll('script') || [];
    const linkStylesheets = document.querySelectorAll('link[rel="stylesheet"]') || [];

    // Extract body content
    const body = document.querySelector('body');
    if (!body) {
      throw new Error('No body tag found in HTML');
    }

    // Create styles content
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

    // Create scripts content
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

    // Extract components from body
    const selectors = ['header', 'section', 'footer', 'main', 'nav', 'aside'];
    const sections: { tag: string, index: number, html: string, className: string }[] = [];

    selectors.forEach(tag => {
      body.querySelectorAll(tag).forEach((el, idx) => {
        const className = el.className ? el.className.split(' ')[0] : `${tag}-${idx + 1}`;
        const pascalName = this.toPascalCase(`${baseComponentName} ${className}`);
        sections.push({ 
          tag, 
          index: idx, 
          html: el.outerHTML,
          className: pascalName
        });
      });
    });

    // Generate component files
    const componentDir = getComponentsDir();
    const componentPaths: string[] = [];

    for (const section of sections) {
      const componentName = `${section.className}.astro`;
      const componentPath = path.join(componentDir, componentName);
      
      const componentContent = `---
// Auto-generated component from ${section.tag} section
// Generated from HTML content
---

${section.html}`;

      await fs.writeFile(componentPath, componentContent, 'utf-8');
      componentPaths.push(componentPath);
    }

    return {
      components: sections.map(s => s.className),
      styles: stylesContent,
      scripts: scriptsContent,
      componentPaths
    };
  }

  /**
   * Converts HTML file to Astro components
   * @param htmlFilePath - Path to the HTML file
   * @param baseComponentName - Base name for components
   * @returns Promise<HtmlToAstroResult>
   */
  static async convertHtmlFileToAstroComponents(
    htmlFilePath: string,
    baseComponentName: string = 'component'
  ): Promise<HtmlToAstroResult> {
    const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
    return this.convertHtmlToAstroComponents(htmlContent, baseComponentName);
  }

  /**
   * Saves extracted styles and scripts to files
   * @param styles - CSS content
   * @param scripts - JavaScript content
   * @param outputDir - Directory to save files
   * @returns Promise<{stylesPath: string, scriptsPath: string}>
   */
  static async saveStylesAndScripts(
    styles: string,
    scripts: string,
    outputDir: string
  ): Promise<{stylesPath: string, scriptsPath: string}> {
    await fs.mkdir(outputDir, { recursive: true });

    const stylesPath = path.join(outputDir, 'extracted-styles.css');
    const scriptsPath = path.join(outputDir, 'extracted-scripts.js');

    await fs.writeFile(stylesPath, styles, 'utf-8');
    await fs.writeFile(scriptsPath, scripts, 'utf-8');

    return { stylesPath, scriptsPath };
  }

  /**
   * Creates an integration guide for the converted components
   * @param result - The conversion result
   * @param outputDir - Directory to save the guide
   * @returns Promise<string> - Path to the guide file
   */
  static async createIntegrationGuide(
    result: HtmlToAstroResult,
    outputDir: string
  ): Promise<string> {
    const guideContent = `# HTML to Astro Integration Guide

## Generated Components:
${result.components.map(comp => `- \`${comp}.astro\``).join('\n')}

## Integration Steps:

### 1. Add Styles to Your Astro Project
Copy the contents of \`extracted-styles.css\` to your main CSS file, or import it in your \`index.astro\` or \`BaseLayout.astro\` using:

\`\`\`astro
<head>
  <style is:global>{await import('../styles/extracted/extracted-styles.css?raw')}</style>
</head>
\`\`\`

Or add the file to your global styles import.

### 2. Add Scripts to Your Astro Project
Copy the contents of \`extracted-scripts.js\` to your main JS file, or import it in your \`index.astro\` or \`BaseLayout.astro\` using:

\`\`\`astro
<head>
  <script is:inline>{await import('../styles/extracted/extracted-scripts.js?raw')}</script>
</head>
\`\`\`

Or add the file to your global scripts import.

### 3. Use Components
Import and use the components in your \`index.astro\`:

\`\`\`astro
---
${result.components.map(comp => `import ${comp} from '../components/${comp}.astro';`).join('\n')}
---

${result.components.map(comp => `<SectionWrapper id="${comp.toLowerCase()}">
  <${comp} />
</SectionWrapper>`).join('\n')}
\`\`\`

## Notes:
- Styles and scripts are extracted separately to avoid conflicts
- Components are ready to use with your existing Astro setup
- Check for any external resources (fonts, CDN links) that need manual inclusion
`;

    const guidePath = path.join(outputDir, 'INTEGRATION_GUIDE.md');
    await fs.writeFile(guidePath, guideContent, 'utf-8');
    return guidePath;
  }
} 