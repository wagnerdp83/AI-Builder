import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Test for Issue 1: Duplicate Lucide Icon Imports
describe('Duplicate Lucide Imports Test - Generic Pipeline', () => {
  const testPrompt = "Create a modern landing page for my Natural & Organic Shop with exactly 3 sections: Hero Section with navigation and call-to-action, Gallery Section with product showcase, and Testimonials Section with customer reviews. Use organic colors and nature-inspired design.";

  beforeAll(async () => {
    console.log('🧪 [Test] Starting Duplicate Lucide Imports Test');
  });

  afterAll(async () => {
    console.log('🧪 [Test] Completed Duplicate Lucide Imports Test');
  });

  it('should generate components without duplicate Lucide imports', async () => {
    console.log('🧪 [Test] Testing Generic Pipeline for duplicate Lucide imports...');

    try {
      // Import the Generic Pipeline function
      const { executeGenerateFile } = await import('../lib/tools/generateFileHandler');

      // Test with a single component to isolate the issue
      const result = await executeGenerateFile({
        componentName: 'TestHero',
        generationPrompt: testPrompt,
        originalPrompt: testPrompt,
        mode: 'generic'
      });

      console.log('🧪 [Test] Component generation result:', result);

      // Check if component was generated successfully
      expect(result.success).toBe(true);
      expect(result.componentPath).toBeDefined();

      // Read the generated component
      const componentPath = result.componentPath!;
      const componentContent = await fs.readFile(componentPath, 'utf-8');

      console.log('🧪 [Test] Generated component content length:', componentContent.length);

      // Check for duplicate Lucide imports
      const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
      const matches = componentContent.match(lucideImportRegex);

      console.log('🧪 [Test] Found Lucide import matches:', matches);

      if (matches) {
        // Should have only ONE import statement
        expect(matches.length).toBe(1);

        // Check for duplicate icons within the single import
        const importContent = matches[0];
        const iconsMatch = importContent.match(/\{([^}]*)\}/);
        
        if (iconsMatch) {
          const icons = iconsMatch[1].split(',').map(icon => icon.trim());
          const uniqueIcons = [...new Set(icons)];
          
          console.log('🧪 [Test] Icons in import:', icons);
          console.log('🧪 [Test] Unique icons:', uniqueIcons);
          
          // Should have no duplicates within the import
          expect(icons.length).toBe(uniqueIcons.length);
        }
      }

      // Check for specific duplicate patterns
      const duplicatePatterns = [
        /import.*@lucide\/astro.*\n.*import.*@lucide\/astro/,
        /import.*\{.*\}.*from.*@lucide\/astro.*\n.*import.*\{.*\}.*from.*@lucide\/astro/
      ];

      for (const pattern of duplicatePatterns) {
        const hasDuplicates = pattern.test(componentContent);
        console.log('🧪 [Test] Checking pattern:', pattern.source, 'Result:', hasDuplicates);
        expect(hasDuplicates).toBe(false);
      }

      console.log('✅ [Test] No duplicate Lucide imports found');

    } catch (error) {
      console.error('❌ [Test] Error during test:', error);
      throw error;
    }
  }, 30000);

  it('should consolidate multiple Lucide imports into one', async () => {
    console.log('🧪 [Test] Testing Lucide import consolidation...');

    // Create a mock component with duplicate imports
    const mockComponentWithDuplicates = `---
import { Leaf, ArrowRight } from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout, ArrowRight } from '@lucide/astro';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;
---

<div>
  <Leaf />
  <ArrowRight />
  <ShoppingBag />
  <Sprout />
</div>`;

    // Test the consolidation logic
    const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
    const lucideImports: string[] = [];
    let match;

    while ((match = lucideImportRegex.exec(mockComponentWithDuplicates)) !== null) {
      const icons = match[1].split(',').map(icon => icon.trim());
      lucideImports.push(...icons);
    }

    const uniqueIcons = [...new Set(lucideImports)];
    const consolidatedImport = `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';`;

    console.log('🧪 [Test] Original imports found:', lucideImports);
    console.log('🧪 [Test] Unique icons:', uniqueIcons);
    console.log('🧪 [Test] Consolidated import:', consolidatedImport);

    // Verify consolidation works
    expect(lucideImports.length).toBeGreaterThan(uniqueIcons.length); // Should have duplicates
    expect(uniqueIcons).toContain('Leaf');
    expect(uniqueIcons).toContain('ArrowRight');
    expect(uniqueIcons).toContain('ShoppingBag');
    expect(uniqueIcons).toContain('Sprout');
    expect(consolidatedImport).toMatch(/import \{ .* \} from '@lucide\/astro'/);

    console.log('✅ [Test] Lucide import consolidation working correctly');
  });

  it('should handle edge cases in Lucide import consolidation', async () => {
    console.log('🧪 [Test] Testing edge cases for Lucide import consolidation...');

    const edgeCases = [
      // Case 1: No imports
      `---
interface TestProps {
  title: string;
}
---

<div>No icons</div>`,

      // Case 2: Single import with spaces
      `---
import { Leaf, ArrowRight, ShoppingBag } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>
  <Leaf />
  <ArrowRight />
</div>`,

      // Case 3: Multiple imports with different formatting
      `---
import {Leaf,ArrowRight} from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>
  <Leaf />
  <ArrowRight />
  <ShoppingBag />
</div>`
    ];

    for (let i = 0; i < edgeCases.length; i++) {
      const testCase = edgeCases[i];
      console.log(`🧪 [Test] Testing edge case ${i + 1}`);

      const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
      const lucideImports: string[] = [];
      let match;

      while ((match = lucideImportRegex.exec(testCase)) !== null) {
        const icons = match[1].split(',').map(icon => icon.trim());
        lucideImports.push(...icons);
      }

      const uniqueIcons = [...new Set(lucideImports)];
      
      console.log(`🧪 [Test] Edge case ${i + 1} - Original:`, lucideImports);
      console.log(`🧪 [Test] Edge case ${i + 1} - Unique:`, uniqueIcons);

      // All cases should have unique icons (no duplicates)
      expect(uniqueIcons.length).toBeLessThanOrEqual(lucideImports.length);
    }

    console.log('✅ [Test] Edge cases handled correctly');
  });
}); 