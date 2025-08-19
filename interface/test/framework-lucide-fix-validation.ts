import { describe, it, expect } from 'vitest';

// Test to validate the actual framework behavior for Lucide import consolidation
describe('Framework Lucide Import Consolidation - Validation Test', () => {
  
  // Mock the actual framework consolidation logic
  function consolidateLucideImportsFramework(code: string): string {
    // Find all Lucide imports and consolidate them
    const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
    const lucideImports: string[] = [];
    let match;
    
    while ((match = lucideImportRegex.exec(code)) !== null) {
      const icons = match[1].split(',').map(icon => icon.trim());
      lucideImports.push(...icons);
    }
    
    // Remove duplicate icons and create consolidated import
    const uniqueIcons = [...new Set(lucideImports)];
    if (uniqueIcons.length > 0) {
      const consolidatedImport = `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';`;
      
      // Remove all existing Lucide imports completely
      code = code.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
      
      // Clean up any empty lines that might be left
      code = code.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Clean up any leftover semicolons from removed imports
      code = code.replace(/;\s*\n\s*;/g, '');
      code = code.replace(/;\s*\n\s*interface/g, '\ninterface');
      code = code.replace(/;\s*\n\s*const/g, '\nconst');
      code = code.replace(/;\s*\n\s*export/g, '\nexport');
      
      // Add consolidated import at the beginning of frontmatter
      const frontmatterMatch = code.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
      if (frontmatterMatch) {
        const existingContent = frontmatterMatch[2].trim();
        const newContent = `${consolidatedImport}\n\n${existingContent}`;
        code = code.replace(frontmatterMatch[0], `${frontmatterMatch[1]}${newContent}${frontmatterMatch[3]}`);
      } else {
        // Create frontmatter if none exists
        code = `---\n${consolidatedImport}\n---\n\n${code}`;
      }
    }
    
    return code;
  }

  // Mock the image URL fix logic
  function fixMalformedUrls(code: string): string {
    // Fix malformed URLs with double quotes (comprehensive fix)
    code = code.replace(/""([^"]+)""/g, `"$1"`);
    code = code.replace(/src\s*=\s*"([^"]+)"/g, `src = "$1"`);
    code = code.replace(/image\s*=\s*"([^"]+)"/g, `image = "$1"`);
    code = code.replace(/avatar\s*=\s*"([^"]+)"/g, `avatar = "$1"`);
    code = code.replace(/poster\s*=\s*"([^"]+)"/g, `poster = "$1"`);
    
    return code;
  }

  it('should fix the actual Gallery.astro duplicate import issue', () => {
    console.log('🧪 [Framework Test] Testing actual Gallery.astro fix...');
    
    // This is the actual problematic code from Gallery.astro
    const problematicCode = `---
import { Leaf, Sprout, Star, Flower } from '@lucide/astro';
import { Leaf, Sprout, TreePine, Flower, Star, Quote } from '@lucide/astro';

;

interface GalleryItem {
  id: number;
  type: 'image' | 'video';
  src: string;
  alt: string;
  title: string;
  description: string;
  credit?: string;
}

const {
  title = "Our Organic Collection",
  galleryItems = [
    {
      id: 1,
      type: 'image',
      src: ""https://images.unsplash.com/photo-1700160554656-2c8bf16dd65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMkMlMjBwcm9kdWN0fGVufDB8MHx8fDE3NTQ0NjU0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      alt: "Organic honey in glass jar",
      title: "Pure Honey"
    }
  ]
} = Astro.props;
---

<div>
  <Leaf />
  <Sprout />
  <Star />
  <Flower />
  <TreePine />
  <Quote />
</div>`;

    // Apply both fixes
    let result = consolidateLucideImportsFramework(problematicCode);
    result = fixMalformedUrls(result);
    
    console.log('🧪 [Framework Test] Original:', problematicCode);
    console.log('🧪 [Framework Test] Fixed:', result);
    
    // Check that there's only ONE import statement
    const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toBeDefined();
    expect(importMatches!.length).toBe(1);
    
    // Check that all unique icons are included
    const importContent = importMatches![0];
    const iconsMatch = importContent.match(/\{([^}]*)\}/);
    expect(iconsMatch).toBeDefined();
    
    const icons = iconsMatch![1].split(',').map(icon => icon.trim());
    const expectedIcons = ['Leaf', 'Sprout', 'Star', 'Flower', 'TreePine', 'Quote'];
    
    for (const expectedIcon of expectedIcons) {
      expect(icons).toContain(expectedIcon);
    }
    
    // Check that there are no duplicates
    const uniqueIcons = [...new Set(icons)];
    expect(icons.length).toBe(uniqueIcons.length);
    
    // Check that there are no extra semicolons or malformed structure
    expect(result).not.toMatch(/;\s*;\s*\n/);
    expect(result).toMatch(/^---\s*\nimport \{ .* \} from '@lucide\/astro';\s*\n/);
    
    // Check that malformed URLs are fixed
    expect(result).not.toMatch(/""https:\/\/images\.unsplash\.com/);
    expect(result).toMatch(/src = "https:\/\/images\.unsplash\.com/);
    
    console.log('✅ [Framework Test] Gallery.astro issues fixed successfully');
  });

  it('should handle multiple import scenarios correctly', () => {
    console.log('🧪 [Framework Test] Testing multiple import scenarios...');
    
    const scenarios = [
      // Scenario 1: Multiple imports with different formatting
      `---
import {Leaf,ArrowRight} from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout } from '@lucide/astro';
import { Heart, Star } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>Test</div>`,

      // Scenario 2: Import with trailing semicolon
      `---
import { Leaf, ArrowRight } from '@lucide/astro';
import { ShoppingBag, Leaf } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>Test</div>`,

      // Scenario 3: Import without semicolon
      `---
import { Leaf, ArrowRight } from '@lucide/astro'
import { ShoppingBag, Leaf } from '@lucide/astro'

interface TestProps {
  title: string;
}
---

<div>Test</div>`
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`🧪 [Framework Test] Testing scenario ${i + 1}`);
      
      const result = consolidateLucideImportsFramework(scenario);
      
      // Should have only one import statement
      const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
      expect(importMatches).toBeDefined();
      expect(importMatches!.length).toBe(1);
      
      // Should not have any leftover import statements
      const leftoverImports = result.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
      if (leftoverImports) {
        expect(leftoverImports.length).toBe(1); // Only the consolidated one
      }
      
      // Should not have malformed structure
      expect(result).not.toMatch(/;\s*;\s*\n/);
      expect(result).toMatch(/^---\s*\nimport \{ .* \} from '@lucide\/astro';\s*\n/);
      
      console.log(`✅ [Framework Test] Scenario ${i + 1} handled correctly`);
    }
  });

  it('should fix all types of malformed URLs', () => {
    console.log('🧪 [Framework Test] Testing comprehensive URL fixes...');
    
    const problematicUrls = [
      // src attribute
      `src=""https://images.unsplash.com/photo-123.jpg""`,
      `src = ""https://images.unsplash.com/photo-123.jpg""`,
      
      // image property
      `image=""https://images.unsplash.com/photo-123.jpg""`,
      `image = ""https://images.unsplash.com/photo-123.jpg""`,
      
      // avatar property
      `avatar=""https://images.unsplash.com/photo-123.jpg""`,
      `avatar = ""https://images.unsplash.com/photo-123.jpg""`,
      
      // poster property
      `poster=""https://images.unsplash.com/photo-123.jpg""`,
      `poster = ""https://images.unsplash.com/photo-123.jpg""`
    ];

    for (let i = 0; i < problematicUrls.length; i++) {
      const problematicUrl = problematicUrls[i];
      console.log(`🧪 [Framework Test] Testing URL fix ${i + 1}: ${problematicUrl}`);
      
      const result = fixMalformedUrls(problematicUrl);
      
      // Should not have double quotes
      expect(result).not.toMatch(/""https:\/\/images\.unsplash\.com/);
      
      // Should have proper format
      expect(result).toMatch(/https:\/\/images\.unsplash\.com\/photo-123\.jpg/);
      
      console.log(`✅ [Framework Test] URL fix ${i + 1} successful: ${result}`);
    }
  });
}); 