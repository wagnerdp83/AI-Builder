import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Test for Enhanced Validation System
describe('Enhanced Validation Test - Generic Pipeline', () => {
  const testPrompt = "Create a modern landing page for my Natural & Organic Shop with exactly 3 sections: Hero Section with navigation and call-to-action, Gallery Section with product showcase, and Testimonials Section with customer reviews. Use organic colors and nature-inspired design.";

  beforeAll(async () => {
    console.log('🧪 [Test] Starting Enhanced Validation Test');
  });

  afterAll(async () => {
    console.log('🧪 [Test] Completed Enhanced Validation Test');
  });

  it('should detect and fix wrong Lucide imports', async () => {
    console.log('🧪 [Test] Testing wrong Lucide import detection...');

    // Create a mock component with wrong imports
    const mockComponentWithWrongImports = `---
import { Star, ShoppingCart, MessageSquare } from 'lucide-astro';
import { Star, Pill, Capsule, Stethoscope } from 'lucide-react';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;
---

<div class="test">
  <h1>{title}</h1>
</div>`;

    // Test validation detection
    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithWrongImports);

    // Validate the component
    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Validation errors found:', validationResult.errors.length);
    
    // Should detect wrong imports
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some(error => 
      error.message.includes('Wrong Lucide import source')
    )).toBe(true);

    // Fix the component
    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    console.log('🧪 [Test] Fix result:', fixResult.isValid);
    
    // Should be valid after fixing
    expect(fixResult.isValid).toBe(true);

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix duplicate image URLs', async () => {
    console.log('🧪 [Test] Testing duplicate image URL detection...');

    const mockComponentWithDuplicateImages = `---
import { Star, Heart } from '@lucide/astro';

interface TestProps {
  products: Product[];
}

const {
  products = [
    { id: "1", name: "Product 1", image: "https://images.unsplash.com/photo-123.jpg" },
    { id: "2", name: "Product 2", image: "https://images.unsplash.com/photo-123.jpg" },
    { id: "3", name: "Product 3", image: "https://images.unsplash.com/photo-123.jpg" }
  ]
} = Astro.props;
---

<div class="products">
  {products.map(product => (
    <div class="product">
      <img src={product.image} alt={product.name} />
    </div>
  ))}
</div>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithDuplicateImages);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Duplicate image errors found:', 
      validationResult.errors.filter(e => e.message.includes('Duplicate')).length
    );
    
    expect(validationResult.errors.some(error => 
      error.message.includes('Duplicate Unsplash image URLs')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    // Should replace hardcoded URLs with placeholders
    expect(fixResult.fixedCode).toContain('{{MOCKUP_IMAGE}}');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix TypeScript errors in map functions', async () => {
    console.log('🧪 [Test] Testing TypeScript map function validation...');

    const mockComponentWithUntypedMaps = `---
import { Star } from '@lucide/astro';

interface TestProps {
  items: any[];
}

const { items = [] } = Astro.props;
---

<div class="items">
  {items.map(item => (
    <div class="item">
      <h3>{item.name}</h3>
    </div>
  ))}
</div>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithUntypedMaps);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] TypeScript errors found:', 
      validationResult.errors.filter(e => e.message.includes('Untyped')).length
    );
    
    expect(validationResult.errors.some(error => 
      error.message.includes('Untyped map function')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    // Should add types to map functions
    expect(fixResult.fixedCode).toContain(': any');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix wrong video source attributes', async () => {
    console.log('🧪 [Test] Testing video source attribute validation...');

    const mockComponentWithWrongVideo = `---
import { Play } from '@lucide/astro';

interface TestProps {
  videoSrc: string;
}

const { videoSrc = "video.mp4" } = Astro.props;
---

<video autoplay loop muted>
  <source url={videoSrc} type="video/mp4" />
</video>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithWrongVideo);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Video source errors found:', 
      validationResult.errors.filter(e => e.message.includes('video source')).length
    );
    
    expect(validationResult.errors.some(error => 
      error.message.includes('Wrong video source attribute')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    // Should fix url to src
    expect(fixResult.fixedCode).toContain('<source src=');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should validate all components in a directory', async () => {
    console.log('🧪 [Test] Testing bulk validation...');

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create multiple test components
    const testComponents = [
      {
        name: 'ValidComponent.astro',
        content: `---
import { Star } from '@lucide/astro';

interface Props {
  title: string;
}

const { title = "Test" } = Astro.props as Partial<Props>;
---

<div class="valid">
  <h1>{title}</h1>
</div>`
      },
      {
        name: 'InvalidComponent.astro',
        content: `---
import { Star } from 'lucide-astro';

const { title = "Test" } = Astro.props;
---

<div class="invalid">
  <h1 className={title}>{title}</h1>
</div>`
      }
    ];

    for (const component of testComponents) {
      await fs.writeFile(path.join(tempDir, component.name), component.content);
    }

    const validationResult = await AstroLintValidator.validateAllComponents(tempDir);
    
    console.log('🧪 [Test] Bulk validation results:', {
      total: validationResult.totalFiles,
      valid: validationResult.validFiles,
      invalid: validationResult.invalidFiles
    });
    
    expect(validationResult.totalFiles).toBe(2);
    expect(validationResult.validFiles).toBe(1);
    expect(validationResult.invalidFiles).toBe(1);

    const fixResult = await AstroLintValidator.fixAllComponents(tempDir);
    
    console.log('🧪 [Test] Bulk fix results:', {
      total: fixResult.totalFiles,
      fixed: fixResult.fixedFiles,
      failed: fixResult.failedFiles
    });
    
    expect(fixResult.fixedFiles).toBeGreaterThan(0);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
}); 