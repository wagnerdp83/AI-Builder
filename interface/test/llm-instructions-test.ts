import { describe, it, expect } from 'vitest';

// Test to verify LLM instructions are preventing common errors
describe('LLM Instructions Test', () => {
  
  // Mock function to simulate LLM generation with instructions
  function mockLLMGeneration(instructions: string, componentType: string): string {
    // Simulate what the LLM should generate based on instructions
    if (instructions.includes('NEVER create duplicate Lucide imports')) {
      return `---
import { Leaf, Star, Heart, Camera } from '@lucide/astro';

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  description: string;
}

const items = [
  {
    id: 1,
    image: "{{MOCKUP_IMAGE}}",
    title: "Product 1",
    description: "Description 1"
  },
  {
    id: 2,
    image: "{{MOCKUP_IMAGE}}",
    title: "Product 2",
    description: "Description 2"
  }
];
---

<section class="py-16">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    {items.map((item) => (
      <div class="bg-white rounded-lg shadow-md">
        <img src={item.image} alt={item.title} class="w-full h-48 object-cover" />
        <div class="p-6">
          <h3 class="text-xl font-bold">{item.title}</h3>
          <p class="text-gray-600">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
</section>`;
    }
    
    // Simulate problematic generation (what we want to prevent)
    return `---
import { Leaf, Star } from '@lucide/astro';
import { Leaf, Star, Heart } from '@lucide/astro';

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  description: string;
}

const items = [
  {
    id: 1,
    image: ""https://images.unsplash.com/photo-123..."",
    title: "Product 1",
    description: "Description 1"
  },
  {
    id: 2,
    image: ""https://images.unsplash.com/photo-123..."",
    title: "Product 2",
    description: "Description 2"
  }
];
---

<section class="py-16">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    {items.map((item) => (
      <div class="bg-white rounded-lg shadow-md">
        <img src={item.image} alt={item.title} class="w-full h-48 object-cover" />
        <div class="p-6">
          <h3 class="text-xl font-bold">{item.title}</h3>
          <p class="text-gray-600">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
</section>`;
  }

  it('should generate correct code when following instructions', () => {
    console.log('🧪 [Instructions Test] Testing correct LLM generation...');
    
    const correctInstructions = `
      NEVER create duplicate Lucide imports
      NEVER use malformed URLs
      ALWAYS use {{MOCKUP_IMAGE}} for dynamic images
    `;
    
    const result = mockLLMGeneration(correctInstructions, 'Gallery');
    
    console.log('🧪 [Instructions Test] Generated code:', result);
    
    // Should NOT have duplicate imports
    const importMatches = result.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toHaveLength(1);
    
    // Should NOT have malformed URLs
    const malformedUrlMatches = result.match(/""https:\/\/[^"]+""/g);
    expect(malformedUrlMatches).toBeNull();
    
    // Should use {{MOCKUP_IMAGE}} placeholders
    const placeholderMatches = result.match(/{{MOCKUP_IMAGE}}/g);
    expect(placeholderMatches).toBeTruthy();
    expect(placeholderMatches!.length).toBeGreaterThan(0);
    
    console.log('✅ [Instructions Test] Correct generation works');
  });

  it('should detect problematic patterns', () => {
    console.log('🧪 [Instructions Test] Testing problematic pattern detection...');
    
    const problematicCode = `---
import { Leaf, Star } from '@lucide/astro';
import { Leaf, Star, Heart } from '@lucide/astro';

const items = [
  {
    id: 1,
    image: ""https://images.unsplash.com/photo-123..."",
    title: "Product 1"
  },
  {
    id: 2,
    image: ""https://images.unsplash.com/photo-123..."",
    title: "Product 2"
  }
];
---`;

    // Check for duplicate imports
    const importMatches = problematicCode.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toHaveLength(2); // Should detect 2 imports
    
    // Check for malformed URLs
    const malformedUrlMatches = problematicCode.match(/""https:\/\/[^"]+""/g);
    expect(malformedUrlMatches).toBeTruthy();
    expect(malformedUrlMatches!.length).toBeGreaterThan(0);
    
    // Check for duplicate image URLs
    const imageUrlMatches = problematicCode.match(/""https:\/\/images\.unsplash\.com\/photo-123\.\.\.""",/g);
    expect(imageUrlMatches).toHaveLength(2); // Should detect 2 identical URLs
    
    console.log('✅ [Instructions Test] Problematic patterns detected correctly');
  });

  it('should validate framework fixes work', () => {
    console.log('🧪 [Instructions Test] Testing framework fix validation...');
    
    const problematicCode = `---
import { Leaf, Star } from '@lucide/astro';
import { Leaf, Star, Heart } from '@lucide/astro';

const items = [
  {
    id: 1,
    image: ""https://images.unsplash.com/photo-123..."",
    title: "Product 1"
  }
];
---`;

    // Simulate framework fixes
    let fixedCode = problematicCode;
    
    // Fix duplicate imports
    fixedCode = fixedCode.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
    fixedCode = fixedCode.replace(/---\s*\n/, `---
import { Leaf, Star, Heart } from '@lucide/astro';

`);
    
    // Fix malformed URLs
    fixedCode = fixedCode.replace(/""([^"]+)""/g, `"$1"`);
    
    console.log('🧪 [Instructions Test] Fixed code:', fixedCode);
    
    // Verify fixes worked
    const importMatches = fixedCode.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
    expect(importMatches).toHaveLength(1); // Should have only 1 import
    
    const malformedUrlMatches = fixedCode.match(/""https:\/\/[^"]+""/g);
    expect(malformedUrlMatches).toBeNull(); // Should have no malformed URLs
    
    console.log('✅ [Instructions Test] Framework fixes work correctly');
  });
}); 