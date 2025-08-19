import 'dotenv/config'; // <-- add this as the first line
import { runHtmlToAstroPipeline } from '../lib/tools/htmlToAstroPipeline';
import { promises as fs } from 'fs';
import path from 'path';
import { getComponentsDir } from '../lib/utils/directory';

async function testRealHtmlToAstro() {
  console.log('🧪 Testing HTML-to-Astro with REAL landing-page-example-2.html\n');

  try {
    // Read the actual HTML file
    const htmlFilePath = path.join(process.cwd(), 'landing-page-example-2.html');
    console.log(`📄 Reading HTML from: ${htmlFilePath}`);
    
    const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
    console.log(`✅ HTML file loaded (${htmlContent.length} characters)\n`);

    // Ensure components directory exists
    const componentsDir = getComponentsDir();
    await fs.mkdir(componentsDir, { recursive: true });
    console.log(`📁 Components directory: ${componentsDir}`);

    console.log('📝 Running HTML-to-Astro conversion with real file...\n');

    const result = await runHtmlToAstroPipeline({
      htmlContent: htmlContent,
      baseComponentName: '', // Use empty to trigger auto-naming
      prompt: 'Create a futuristic gaming landing page with neon effects and character showcases',
      saveStylesAndScripts: true
    });

    // Save extracted CSS and JS to the correct public folders
    const stylesPath = path.join(process.cwd(), 'rendering/public/assets/styles/extracted-styles.css');
    const scriptsPath = path.join(process.cwd(), 'rendering/public/assets/js/extracted-scripts.js');
    if (result.styles) {
      await fs.mkdir(path.dirname(stylesPath), { recursive: true });
      await fs.writeFile(stylesPath, result.styles, 'utf-8');
      console.log(`✅ Saved extracted CSS to: ${stylesPath}`);
    }
    if (result.scripts) {
      await fs.mkdir(path.dirname(scriptsPath), { recursive: true });
      await fs.writeFile(scriptsPath, result.scripts, 'utf-8');
      console.log(`✅ Saved extracted JS to: ${scriptsPath}`);
    }

    // Update BaseLayout.astro to include the CSS and JS calls if not present
    const baseLayoutPath = path.join(process.cwd(), 'rendering/src/layouts/BaseLayout.astro');
    let baseLayoutContent = await fs.readFile(baseLayoutPath, 'utf-8');
    const cssLink = '<link rel="stylesheet" href="/assets/styles/extracted-styles.css" />';
    // Remove any previous <script src=...> or <script is:inline src=...> for extracted-scripts.js
    baseLayoutContent = baseLayoutContent.replace(/<script[^>]*src=["'][^"']*extracted-scripts\.js["'][^>]*><\/script>\s*/g, '');
    // Inject CSS link if not present
    if (!baseLayoutContent.includes(cssLink)) {
      baseLayoutContent = baseLayoutContent.replace('</head>', `  ${cssLink}\n</head>`);
      console.log('✅ Injected extracted CSS <link> into BaseLayout.astro');
    }
    // Inject JS as inline script before </body>
    if (result.scripts) {
      const inlineScript = `<script is:inline>\n${result.scripts}\n</script>`;
      if (!baseLayoutContent.includes(inlineScript)) {
        baseLayoutContent = baseLayoutContent.replace('</body>', `  ${inlineScript}\n</body>`);
        console.log('✅ Injected extracted JS <script is:inline> into BaseLayout.astro');
      }
    }
    await fs.writeFile(baseLayoutPath, baseLayoutContent, 'utf-8');

    // After generating components, refactor each .astro file to use consts for all strings, links, images, etc.
    // For each generated component path:
    if (result.componentPaths && result.componentPaths.length > 0) {
      for (const compPath of result.componentPaths) {
        let compContent = await fs.readFile(compPath, 'utf-8');
        
        // Ensure the component has proper frontmatter with constants
        let constBlock = '---\n';
        const constants: string[] = [];
        
        // Extract all text between tags (excluding class names and attributes)
        const textMatches = [...compContent.matchAll(/>([^<>{}\n]+)</g)];
        textMatches.forEach((m, i) => {
          const val = m[1].trim();
          if (val && !/^\s*$/.test(val) && val.length < 100 && !val.includes('class=') && !val.includes('id=') && !val.includes('href=') && !val.includes('src=')) {
            const constName = `text${i+1}`;
            constants.push(`const ${constName} = ${JSON.stringify(val)};`);
          }
        });
        
        // Extract all img src
        const imgMatches = [...compContent.matchAll(/img src="([^"]+)"/g)];
        imgMatches.forEach((m, i) => {
          const constName = `imgSrc${i+1}`;
          constants.push(`const ${constName} = ${JSON.stringify(m[1])};`);
        });
        
        // Extract all href
        const hrefMatches = [...compContent.matchAll(/href="([^"]+)"/g)];
        hrefMatches.forEach((m, i) => {
          const constName = `href${i+1}`;
          constants.push(`const ${constName} = ${JSON.stringify(m[1])};`);
        });
        
        // Extract all placeholder text
        const placeholderMatches = [...compContent.matchAll(/placeholder="([^"]+)"/g)];
        placeholderMatches.forEach((m, i) => {
          const constName = `placeholder${i+1}`;
          constants.push(`const ${constName} = ${JSON.stringify(m[1])};`);
        });
        
        // Extract all button text
        const buttonMatches = [...compContent.matchAll(/<button[^>]*>([^<]+)<\/button>/g)];
        buttonMatches.forEach((m, i) => {
          const val = m[1].trim();
          if (val && !/^\s*$/.test(val)) {
            const constName = `buttonText${i+1}`;
            constants.push(`const ${constName} = ${JSON.stringify(val)};`);
          }
        });
        
        // If no constants were found, add at least one default
        if (constants.length === 0) {
          constants.push('const title = "Component";');
        }
        
        constBlock += constants.join('\n') + '\n---\n';
        
        // Replace the frontmatter block
        if (compContent.includes('---')) {
          compContent = compContent.replace(/^---[\s\S]*?---/, constBlock);
        } else {
          compContent = constBlock + compContent;
        }
        
        // Replace text content with constants
        let replaced = compContent;
        textMatches.forEach((m, i) => {
          const val = m[1].trim();
          if (val && !/^\s*$/.test(val) && val.length < 100 && !val.includes('class=') && !val.includes('id=') && !val.includes('href=') && !val.includes('src=')) {
            const constName = `text${i+1}`;
            const pattern = `>${val}<`;
            if (replaced.includes(pattern)) {
              replaced = replaced.replace(pattern, `>{${constName}}<`);
            }
          }
        });
        
        // Replace img src with constants
        imgMatches.forEach((m, i) => {
          const constName = `imgSrc${i+1}`;
          const pattern = `img src="${m[1]}"`;
          if (replaced.includes(pattern)) {
            replaced = replaced.replace(pattern, `img src={${constName}}`);
          }
        });
        
        // Replace href with constants
        hrefMatches.forEach((m, i) => {
          const constName = `href${i+1}`;
          const pattern = `href="${m[1]}"`;
          if (replaced.includes(pattern)) {
            replaced = replaced.replace(pattern, `href={${constName}}`);
          }
        });
        
        // Replace placeholder with constants
        placeholderMatches.forEach((m, i) => {
          const constName = `placeholder${i+1}`;
          const pattern = `placeholder="${m[1]}"`;
          if (replaced.includes(pattern)) {
            replaced = replaced.replace(pattern, `placeholder={${constName}}`);
          }
        });
        
        // Replace button text with constants
        buttonMatches.forEach((m, i) => {
          const val = m[1].trim();
          if (val && !/^\s*$/.test(val)) {
            const constName = `buttonText${i+1}`;
            const pattern = `<button[^>]*>${val}</button>`;
            const replacement = `<button[^>]*>{${constName}}</button>`;
            if (replaced.includes(pattern)) {
              replaced = replaced.replace(pattern, replacement);
            }
          }
        });
        
        await fs.writeFile(compPath, replaced, 'utf-8');
      }
    }

    if (result.success) {
      console.log('✅ HTML-to-Astro conversion successful!\n');
      console.log('📄 Generated components:');
      result.components.forEach(comp => {
        // Show only the base name (e.g., Hero.astro)
        const baseName = comp.replace(/^.*[\/]/, '');
        console.log(`   - ${baseName}.astro`);
      });

      console.log('\n📄 Generated files:');
      if (result.styles) console.log(`   - Styles: /public/assets/styles/extracted-styles.css`);
      if (result.scripts) console.log(`   - Scripts: /public/assets/js/extracted-scripts.js`);
      if (result.guidePath) console.log(`   - Guide: ${result.guidePath}`);

      console.log('\n🎯 Real HTML conversion completed!');
      console.log('\n📖 Integration Guide:');
      console.log('1. Import the extracted CSS in your BaseLayout.astro <head> using:');
      console.log('   <link rel="stylesheet" href="/assets/styles/extracted-styles.css" />');
      console.log('2. Import the extracted JS at the end of <body> using:');
      console.log('   <script src="/assets/js/extracted-scripts.js"></script>');

      // Show a sample of the extracted styles
      if (result.styles) {
        console.log('\n📋 Sample extracted styles:');
        const styleLines = result.styles.split('\n').slice(0, 15);
        styleLines.forEach(line => console.log(`   ${line}`));
        if (result.styles.split('\n').length > 15) {
          console.log('   ... (truncated)');
        }
      }

      // Show component count
      console.log(`\n📊 Summary:`);
      console.log(`   - Components generated: ${result.components.length}`);
      console.log(`   - Styles extracted: ${result.styles ? result.styles.length : 0} characters`);
      console.log(`   - Scripts extracted: ${result.scripts ? result.scripts.length : 0} characters`);

    } else {
      console.log('❌ HTML-to-Astro conversion failed');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRealHtmlToAstro().catch(console.error);
}

export { testRealHtmlToAstro }; 