import { describe, it, expect } from 'vitest';

// Unit test for Lucide import consolidation logic
describe('Lucide Import Consolidation - Unit Test', () => {
  
  // Mock the consolidation logic from generateFileHandler.ts
  function consolidateLucideImports(code: string): string {
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
      
      // Remove all existing Lucide imports
      code = code.replace(lucideImportRegex, '');
      
      // Add consolidated import at the beginning of frontmatter
      const frontmatterMatch = code.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
      if (frontmatterMatch) {
        const existingContent = frontmatterMatch[2];
        const newContent = `${consolidatedImport}\n\n${existingContent}`;
        code = code.replace(frontmatterMatch[0], `${frontmatterMatch[1]}${newContent}${frontmatterMatch[3]}`);
      } else {
        // Create frontmatter if none exists
        code = `---\n${consolidatedImport}\n---\n\n${code}`;
      }
    }
    
    return code;
  }

  it('should consolidate duplicate Lucide imports into one', () => {
    console.log('🧪 [Unit Test] Testing duplicate import consolidation...');
    
    const inputCode = `---
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

    const result = consolidateLucideImports(inputCode);
    
    console.log('🧪 [Unit Test] Input code:', inputCode);
    console.log('🧪 [Unit Test] Result code:', result);
    
    // Check that there's only one import statement
    const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toBeDefined();
    expect(importMatches!.length).toBe(1);
    
    // Check that all unique icons are included
    const importContent = importMatches![0];
    const iconsMatch = importContent.match(/\{([^}]*)\}/);
    expect(iconsMatch).toBeDefined();
    
    const icons = iconsMatch![1].split(',').map(icon => icon.trim());
    expect(icons).toContain('Leaf');
    expect(icons).toContain('ArrowRight');
    expect(icons).toContain('ShoppingBag');
    expect(icons).toContain('Sprout');
    
    // Check that there are no duplicates
    const uniqueIcons = [...new Set(icons)];
    expect(icons.length).toBe(uniqueIcons.length);
    
    console.log('✅ [Unit Test] Duplicate imports consolidated successfully');
  });

  it('should handle components with no Lucide imports', () => {
    console.log('🧪 [Unit Test] Testing component with no Lucide imports...');
    
    const inputCode = `---
interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;
---

<div>
  <h1>{title}</h1>
  <p>No icons here</p>
</div>`;

    const result = consolidateLucideImports(inputCode);
    
    // Should remain unchanged
    expect(result).toBe(inputCode);
    
    console.log('✅ [Unit Test] Component with no imports handled correctly');
  });

  it('should handle components with single Lucide import', () => {
    console.log('🧪 [Unit Test] Testing component with single Lucide import...');
    
    const inputCode = `---
import { Leaf, ArrowRight } from '@lucide/astro';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;
---

<div>
  <Leaf />
  <ArrowRight />
</div>`;

    const result = consolidateLucideImports(inputCode);
    
    // Should have one import statement
    const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toBeDefined();
    expect(importMatches!.length).toBe(1);
    
    console.log('✅ [Unit Test] Single import handled correctly');
  });

  it('should handle components with multiple imports and different formatting', () => {
    console.log('🧪 [Unit Test] Testing multiple imports with different formatting...');
    
    const inputCode = `---
import {Leaf,ArrowRight} from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout } from '@lucide/astro';
import { Heart, Star } from '@lucide/astro';

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
  <Heart />
  <Star />
</div>`;

    const result = consolidateLucideImports(inputCode);
    
    console.log('🧪 [Unit Test] Input:', inputCode);
    console.log('🧪 [Unit Test] Result:', result);
    
    // Should have only one import statement
    const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toBeDefined();
    expect(importMatches!.length).toBe(1);
    
    // Check that all unique icons are included
    const importContent = importMatches![0];
    const iconsMatch = importContent.match(/\{([^}]*)\}/);
    expect(iconsMatch).toBeDefined();
    
    const icons = iconsMatch![1].split(',').map(icon => icon.trim());
    const expectedIcons = ['Leaf', 'ArrowRight', 'ShoppingBag', 'Sprout', 'Heart', 'Star'];
    
    for (const expectedIcon of expectedIcons) {
      expect(icons).toContain(expectedIcon);
    }
    
    // Check that there are no duplicates
    const uniqueIcons = [...new Set(icons)];
    expect(icons.length).toBe(uniqueIcons.length);
    
    console.log('✅ [Unit Test] Multiple imports with different formatting consolidated correctly');
  });

  it('should preserve frontmatter structure', () => {
    console.log('🧪 [Unit Test] Testing frontmatter structure preservation...');
    
    const inputCode = `---
import { Leaf } from '@lucide/astro';
import { ArrowRight } from '@lucide/astro';

interface TestProps {
  title: string;
  subtitle?: string;
}

const { 
  title = "Test",
  subtitle = "Subtitle"
} = Astro.props;
---

<div>
  <Leaf />
  <ArrowRight />
</div>`;

    const result = consolidateLucideImports(inputCode);
    
    // Should have proper frontmatter structure
    expect(result).toMatch(/^---\s*\n/);
    expect(result).toMatch(/\n---\s*\n/);
    
    // Should have consolidated import at the top of frontmatter
    const frontmatterMatch = result.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
    expect(frontmatterMatch).toBeDefined();
    
    const frontmatterContent = frontmatterMatch![2];
    expect(frontmatterContent).toMatch(/import \{ .* \} from '@lucide\/astro'/);
    
    // Should preserve interface and props
    expect(frontmatterContent).toMatch(/interface TestProps/);
    expect(frontmatterContent).toMatch(/title: string/);
    expect(frontmatterContent).toMatch(/subtitle\?\: string/);
    
    console.log('✅ [Unit Test] Frontmatter structure preserved correctly');
  });
}); 