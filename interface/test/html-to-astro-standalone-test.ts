import { HtmlToAstroConverter } from '../lib/services/html-to-astro-converter';
import { promises as fs } from 'fs';
import path from 'path';

async function testHtmlToAstroConversion() {
  console.log('🧪 Testing HTML-to-Astro Conversion (Standalone)\n');

  // Sample HTML content for testing
  const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Landing Page</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .header {
            padding: 1rem 2rem;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .hero {
            text-align: center;
            padding: 4rem 2rem;
        }
        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .features {
            padding: 4rem 2rem;
            background: rgba(255,255,255,0.05);
        }
        .footer {
            padding: 2rem;
            text-align: center;
            background: rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <header class="header">
        <nav>
            <a href="#" style="color: white; text-decoration: none; font-weight: 600;">Logo</a>
            <div style="float: right;">
                <a href="#" style="color: white; text-decoration: none; margin-left: 1rem;">Home</a>
                <a href="#" style="color: white; text-decoration: none; margin-left: 1rem;">About</a>
                <a href="#" style="color: white; text-decoration: none; margin-left: 1rem;">Contact</a>
            </div>
        </nav>
    </header>

    <section class="hero">
        <h1>Welcome to Our Platform</h1>
        <p>Discover amazing features that will transform your experience.</p>
        <button style="background: white; color: #667eea; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer;">
            Get Started
        </button>
    </section>

    <section class="features">
        <h2>Our Features</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem;">
            <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 12px;">
                <h3>Feature 1</h3>
                <p>Amazing feature description goes here.</p>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 12px;">
                <h3>Feature 2</h3>
                <p>Another amazing feature description.</p>
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 12px;">
                <h3>Feature 3</h3>
                <p>Yet another amazing feature description.</p>
            </div>
        </div>
    </section>

    <footer class="footer">
        <p>&copy; 2024 Our Platform. All rights reserved.</p>
    </footer>

    <script>
        console.log('Landing page loaded successfully!');
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                alert('Button clicked!');
            });
        });
    </script>
</body>
</html>`;

  try {
    console.log('📝 Running HTML-to-Astro conversion...\n');

    // Test the conversion service directly
    const result = await HtmlToAstroConverter.convertHtmlToAstroComponents(
      sampleHtml,
      'test-landing'
    );

    console.log('✅ HTML-to-Astro conversion successful!\n');
    console.log('📄 Generated components:');
    result.components.forEach(comp => {
      console.log(`   - ${comp}.astro`);
    });

    console.log('\n📄 Component paths:');
    result.componentPaths.forEach(path => {
      console.log(`   - ${path}`);
    });

    // Test saving styles and scripts
    const testOutputDir = path.join(process.cwd(), 'test-output');
    const savedFiles = await HtmlToAstroConverter.saveStylesAndScripts(
      result.styles,
      result.scripts,
      testOutputDir
    );

    console.log('\n📄 Saved files:');
    console.log(`   - Styles: ${savedFiles.stylesPath}`);
    console.log(`   - Scripts: ${savedFiles.scriptsPath}`);

    // Create integration guide
    const guidePath = await HtmlToAstroConverter.createIntegrationGuide(result, testOutputDir);
    console.log(`   - Guide: ${guidePath}`);

    console.log('\n🎯 Conversion test completed successfully!');
    console.log('📁 Check the test-output directory for generated files.');

    // Show a sample of the extracted styles
    console.log('\n📋 Sample extracted styles:');
    const styleLines = result.styles.split('\n').slice(0, 10);
    styleLines.forEach(line => console.log(`   ${line}`));
    if (result.styles.split('\n').length > 10) {
      console.log('   ... (truncated)');
    }

    // Show a sample of the extracted scripts
    console.log('\n📋 Sample extracted scripts:');
    const scriptLines = result.scripts.split('\n').slice(0, 5);
    scriptLines.forEach(line => console.log(`   ${line}`));
    if (result.scripts.split('\n').length > 5) {
      console.log('   ... (truncated)');
    }

    // Show a sample component
    if (result.componentPaths.length > 0) {
      const firstComponentPath = result.componentPaths[0];
      const componentContent = await fs.readFile(firstComponentPath, 'utf-8');
      console.log('\n📋 Sample component content:');
      const componentLines = componentContent.split('\n').slice(0, 10);
      componentLines.forEach(line => console.log(`   ${line}`));
      if (componentContent.split('\n').length > 10) {
        console.log('   ... (truncated)');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testHtmlToAstroConversion().catch(console.error);
}

export { testHtmlToAstroConversion }; 