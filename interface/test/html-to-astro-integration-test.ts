import { runHtmlToAstroPipeline } from '../lib/tools/htmlToAstroPipeline';
import { promises as fs } from 'fs';
import path from 'path';

async function testHtmlToAstroIntegration() {
  console.log('🧪 Testing HTML-to-Astro Integration with Abstract Pipeline\n');

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

    const result = await runHtmlToAstroPipeline({
      htmlContent: sampleHtml,
      baseComponentName: 'test-landing',
      prompt: 'Create a modern landing page with header, hero, features, and footer sections',
      saveStylesAndScripts: true
    });

    if (result.success) {
      console.log('✅ HTML-to-Astro conversion successful!\n');
      console.log('📄 Generated components:');
      result.components.forEach(comp => {
        console.log(`   - ${comp}.astro`);
      });

      console.log('\n📄 Generated files:');
      if (result.stylesPath) console.log(`   - Styles: ${result.stylesPath}`);
      if (result.scriptsPath) console.log(`   - Scripts: ${result.scriptsPath}`);
      if (result.guidePath) console.log(`   - Guide: ${result.guidePath}`);

      console.log('\n🎯 Integration ready! The components are now available in your /rendering/src/components/ directory.');
      console.log('📖 Check the integration guide for instructions on adding styles and scripts to your Astro setup.');

      // Show a sample of the extracted styles
      if (result.styles) {
        console.log('\n📋 Sample extracted styles:');
        const styleLines = result.styles.split('\n').slice(0, 10);
        styleLines.forEach(line => console.log(`   ${line}`));
        if (result.styles.split('\n').length > 10) {
          console.log('   ... (truncated)');
        }
      }

    } else {
      console.log('❌ HTML-to-Astro conversion failed');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testHtmlToAstroIntegration().catch(console.error);
}

export { testHtmlToAstroIntegration }; 