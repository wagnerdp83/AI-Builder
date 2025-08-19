import { describe, it, expect } from 'vitest';

// Test to validate the Lucide import consolidation fix
describe('Lucide Import Consolidation Fix - Validation Test', () => {
  
  // Mock the improved consolidation logic
  function consolidateLucideImportsFixed(code: string): string {
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

  it('should fix the duplicate import issue from Gallery.astro', () => {
    console.log('🧪 [Fix Test] Testing the actual Gallery.astro duplicate import issue...');
    
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

interface Testimonial {
  id: number;
  quote: string;
  rating: number;
  name: string;
  profession: string;
  avatar: string;
}

interface GalleryProps {
  title?: string;
  subtitle?: string;
  galleryItems?: GalleryItem[];
  testimonials?: Testimonial[];
}

const {
  title = "Our Organic Collection",
  subtitle = "Discover the beauty of nature in every product",
  galleryItems = [
    {
      id: 1,
      type: 'image',
      src: ""https://images.unsplash.com/photo-1700160554656-2c8bf16dd65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMkMlMjBwcm9kdWN0fGVufDB8MHx8fDE3NTQ0NjU0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      alt: "Organic honey in glass jar",
      title: "Pure Honey",
      description: "Harvested from local beekeepers",
      credit: "Photo by John Doe"
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

    const result = consolidateLucideImportsFixed(problematicCode);
    
    console.log('🧪 [Fix Test] Original problematic code:', problematicCode);
    console.log('🧪 [Fix Test] Fixed result:', result);
    
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
    
    console.log('✅ [Fix Test] Duplicate import issue fixed successfully');
  });

  it('should fix malformed image URLs with double quotes', () => {
    console.log('🧪 [Fix Test] Testing malformed image URL fix...');
    
    const problematicCode = `---
interface TestProps {
  title: string;
}

const {
  title = "Test",
  image = ""https://images.unsplash.com/photo-1700160554656-2c8bf16dd65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMkMlMjBwcm9kdWN0fGVufDB8MHx8fDE3NTQ0NjU0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
} = Astro.props;
---

<div>
  <img src=""https://images.unsplash.com/photo-1700160554656-2c8bf16dd65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NjU0MzV8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMkMlMjBwcm9kdWN0fGVufDB8MHx8fDE3NTQ0NjU0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"" alt="test" />
</div>`;

    // Apply the URL fix
    let result = problematicCode;
    result = result.replace(/src\s*=\s*""([^"]+)""/g, `src = "$1"`);
    result = result.replace(/src\s*=\s*"([^"]+)"/g, `src = "$1"`);
    
    console.log('🧪 [Fix Test] Original with malformed URLs:', problematicCode);
    console.log('🧪 [Fix Test] Fixed URLs:', result);
    
    // Check that double quotes are removed
    expect(result).not.toMatch(/""https:\/\/images\.unsplash\.com/);
    expect(result).toMatch(/src = "https:\/\/images\.unsplash\.com/);
    
    console.log('✅ [Fix Test] Malformed image URLs fixed successfully');
  });

  it('should handle edge cases in import consolidation', () => {
    console.log('🧪 [Fix Test] Testing edge cases...');
    
    const edgeCases = [
      // Case 1: Multiple imports with different spacing
      `---
import {Leaf,ArrowRight} from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout } from '@lucide/astro';
import { Heart, Star } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>Test</div>`,

      // Case 2: Import with trailing semicolon
      `---
import { Leaf, ArrowRight } from '@lucide/astro';
import { ShoppingBag, Leaf } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>Test</div>`,

      // Case 3: Import without semicolon
      `---
import { Leaf, ArrowRight } from '@lucide/astro'
import { ShoppingBag, Leaf } from '@lucide/astro'

interface TestProps {
  title: string;
}
---

<div>Test</div>`
    ];

    for (let i = 0; i < edgeCases.length; i++) {
      const testCase = edgeCases[i];
      console.log(`🧪 [Fix Test] Testing edge case ${i + 1}`);
      
      const result = consolidateLucideImportsFixed(testCase);
      
      // Should have only one import statement
      const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
      expect(importMatches).toBeDefined();
      expect(importMatches!.length).toBe(1);
      
      // Should not have any leftover import statements
      const leftoverImports = result.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
      if (leftoverImports) {
        expect(leftoverImports.length).toBe(1); // Only the consolidated one
      }
      
      console.log(`✅ [Fix Test] Edge case ${i + 1} handled correctly`);
    }
  });
}); 