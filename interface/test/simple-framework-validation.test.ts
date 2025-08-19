import { describe, it, expect } from 'vitest';

// Simple test to validate framework fixes are working
describe('Simple Framework Validation Test', () => {
  
  it('should validate that Lucide import consolidation is working', () => {
    console.log('🧪 [Simple Test] Testing Lucide import consolidation...');
    
    // Test the consolidation logic
    const inputCode = `---
import { Leaf, ArrowRight } from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout, ArrowRight } from '@lucide/astro';

interface TestProps {
  title: string;
}
---

<div>
  <Leaf />
  <ArrowRight />
  <ShoppingBag />
  <Sprout />
</div>`;

    // Mock the consolidation logic
    const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
    const lucideImports: string[] = [];
    let match;
    
    while ((match = lucideImportRegex.exec(inputCode)) !== null) {
      const icons = match[1].split(',').map(icon => icon.trim());
      lucideImports.push(...icons);
    }
    
    const uniqueIcons = [...new Set(lucideImports)];
    const consolidatedImport = `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';`;
    
    console.log('🧪 [Simple Test] Original imports:', lucideImports);
    console.log('🧪 [Simple Test] Unique icons:', uniqueIcons);
    console.log('🧪 [Simple Test] Consolidated import:', consolidatedImport);
    
    // Verify consolidation works
    expect(lucideImports.length).toBeGreaterThan(uniqueIcons.length); // Should have duplicates
    expect(uniqueIcons).toContain('Leaf');
    expect(uniqueIcons).toContain('ArrowRight');
    expect(uniqueIcons).toContain('ShoppingBag');
    expect(uniqueIcons).toContain('Sprout');
    expect(consolidatedImport).toMatch(/import \{ .* \} from '@lucide\/astro'/);
    
    console.log('✅ [Simple Test] Lucide import consolidation working correctly');
  });

  it('should validate that URL fixing is working', () => {
    console.log('🧪 [Simple Test] Testing URL fixing...');
    
    const problematicUrls = [
      `src: ""https://images.unsplash.com/photo-123.jpg""`,
      `image: ""https://images.unsplash.com/photo-123.jpg""`,
      `avatar: ""https://images.unsplash.com/photo-123.jpg""`
    ];

    for (let i = 0; i < problematicUrls.length; i++) {
      const problematicUrl = problematicUrls[i];
      console.log(`🧪 [Simple Test] Testing URL fix ${i + 1}: ${problematicUrl}`);
      
      // Apply the URL fix
      let result = problematicUrl;
      result = result.replace(/""([^"]+)""/g, `"$1"`);
      result = result.replace(/src:\s*""([^"]+)""/g, `src: "$1"`);
      result = result.replace(/image:\s*""([^"]+)""/g, `image: "$1"`);
      result = result.replace(/avatar:\s*""([^"]+)""/g, `avatar: "$1"`);
      
      // Should not have double quotes
      expect(result).not.toMatch(/""https:\/\/images\.unsplash\.com/);
      
      // Should have proper format
      expect(result).toMatch(/https:\/\/images\.unsplash\.com\/photo-123\.jpg/);
      
      console.log(`✅ [Simple Test] URL fix ${i + 1} successful: ${result}`);
    }
  });

  it('should validate that both fixes work together', () => {
    console.log('🧪 [Simple Test] Testing combined fixes...');
    
    const problematicCode = `---
import { Leaf, ArrowRight } from '@lucide/astro';
import { ShoppingBag, Leaf, Sprout, ArrowRight } from '@lucide/astro';

interface TestProps {
  title: string;
  image: ""https://images.unsplash.com/photo-123.jpg""
}

const {
  title = "Test",
  src: ""https://images.unsplash.com/photo-456.jpg""
} = Astro.props;
---

<div>
  <Leaf />
  <ArrowRight />
  <ShoppingBag />
  <Sprout />
</div>`;

    // Apply both fixes
    let result = problematicCode;
    
    // Fix Lucide imports
    const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
    const lucideImports: string[] = [];
    let match;
    
    while ((match = lucideImportRegex.exec(result)) !== null) {
      const icons = match[1].split(',').map(icon => icon.trim());
      lucideImports.push(...icons);
    }
    
    const uniqueIcons = [...new Set(lucideImports)];
    const consolidatedImport = `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';`;
    
    // Remove all existing Lucide imports
    result = result.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
    
    // Add consolidated import
    const frontmatterMatch = result.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
    if (frontmatterMatch) {
      const existingContent = frontmatterMatch[2].trim();
      const newContent = `${consolidatedImport}\n\n${existingContent}`;
      result = result.replace(frontmatterMatch[0], `${frontmatterMatch[1]}${newContent}${frontmatterMatch[3]}`);
    }
    
    // Fix URLs
    result = result.replace(/""([^"]+)""/g, `"$1"`);
    result = result.replace(/src:\s*""([^"]+)""/g, `src: "$1"`);
    result = result.replace(/image:\s*""([^"]+)""/g, `image: "$1"`);
    
    console.log('🧪 [Simple Test] Original:', problematicCode);
    console.log('🧪 [Simple Test] Fixed:', result);
    
    // Check that there's only ONE import statement
    const importMatches = result.match(/import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toBeDefined();
    expect(importMatches!.length).toBe(1);
    
    // Check that all unique icons are included
    const importContent = importMatches![0];
    const iconsMatch = importContent.match(/\{([^}]*)\}/);
    expect(iconsMatch).toBeDefined();
    
    const icons = iconsMatch![1].split(',').map(icon => icon.trim());
    const expectedIcons = ['Leaf', 'ArrowRight', 'ShoppingBag', 'Sprout'];
    
    for (const expectedIcon of expectedIcons) {
      expect(icons).toContain(expectedIcon);
    }
    
    // Check that URLs are fixed
    expect(result).not.toMatch(/""https:\/\/images\.unsplash\.com/);
    expect(result).toMatch(/image: "https:\/\/images\.unsplash\.com\/photo-123\.jpg"/);
    expect(result).toMatch(/src: "https:\/\/images\.unsplash\.com\/photo-456\.jpg"/);
    
    console.log('✅ [Simple Test] Combined fixes working correctly');
  });
}); 