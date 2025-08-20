import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// Test for Framework-Specific Imports Detection
describe('Framework-Specific Imports Test - Generic Pipeline', () => {
  const testPrompt = "Create a modern landing page for my Natural & Organic Shop with exactly 3 sections: Hero Section with navigation and call-to-action, Gallery Section with product showcase, and Testimonials Section with customer reviews. Use organic colors and nature-inspired design.";

  beforeAll(async () => {
    console.log('🧪 [Test] Starting Framework-Specific Imports Test');
  });

  afterAll(async () => {
    console.log('🧪 [Test] Completed Framework-Specific Imports Test');
  });

  it('should detect and fix solid-js imports', async () => {
    console.log('🧪 [Test] Testing solid-js import detection...');

    // Create a mock component with solid-js imports
    const mockComponentWithSolidJS = `---
import { Star } from '@lucide/astro';
import { createSignal, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;

const [currentIndex, setCurrentIndex] = createSignal(0);
const [isPlaying, setIsPlaying] = createSignal(true);
const [store, setStore] = createStore({
  testimonials: [],
  currentIndex,
  isPlaying
});

onMount(() => {
  console.log('Component mounted');
});
---

<div class="test">
  <h1>{title}</h1>
  <button onClick={nextSlide}>Next</button>
  <div ref={carouselRef}>Content</div>
</div>`;

    // Test validation detection
    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    // Create temporary file
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithSolidJS);

    // Validate the component
    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Framework-specific errors found:', 
      validationResult.errors.filter(e => e.message.includes('solid-js')).length
    );
    
    // Should detect solid-js imports
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some(error => 
      error.message.includes('solid-js')
    )).toBe(true);

    // Fix the component
    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    console.log('🧪 [Test] Fix result:', fixResult.isValid);
    
    // Should be valid after fixing
    expect(fixResult.isValid).toBe(true);

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix react imports', async () => {
    console.log('🧪 [Test] Testing react import detection...');

    const mockComponentWithReact = `---
import { Star } from '@lucide/astro';
import { useState, useEffect } from 'react';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;

const [count, setCount] = useState(0);

useEffect(() => {
  console.log('Component mounted');
}, []);
---

<div class="test">
  <h1>{title}</h1>
  <button onClick={() => setCount(count + 1)}>Count: {count}</button>
</div>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithReact);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] React errors found:', 
      validationResult.errors.filter(e => e.message.includes('react')).length
    );
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some(error => 
      error.message.includes('react')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    expect(fixResult.isValid).toBe(true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix vue imports', async () => {
    console.log('🧪 [Test] Testing vue import detection...');

    const mockComponentWithVue = `---
import { Star } from '@lucide/astro';
import { ref, onMounted } from 'vue';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;

const count = ref(0);

onMounted(() => {
  console.log('Component mounted');
});
---

<div class="test">
  <h1>{title}</h1>
  <button @click="count++">Count: {count}</button>
</div>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithVue);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Vue errors found:', 
      validationResult.errors.filter(e => e.message.includes('vue')).length
    );
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some(error => 
      error.message.includes('vue')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    expect(fixResult.isValid).toBe(true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should detect and fix framework-specific event handlers', async () => {
    console.log('🧪 [Test] Testing framework-specific event handler detection...');

    const mockComponentWithFrameworkEvents = `---
import { Star } from '@lucide/astro';

interface TestProps {
  title: string;
}

const { title = "Test" } = Astro.props;
---

<div class="test">
  <h1>{title}</h1>
  <button onClick={handleClick}>Click me</button>
  <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
    Hover me
  </div>
</div>`;

    const { AstroLintValidator } = await import('../lib/services/astro-lint-validator');
    
    const tempDir = path.join(process.cwd(), 'test-temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'TestComponent.astro');
    await fs.writeFile(tempFile, mockComponentWithFrameworkEvents);

    const validationResult = await AstroLintValidator.validateComponent(tempFile);
    
    console.log('🧪 [Test] Framework event handler errors found:', 
      validationResult.errors.filter(e => e.message.includes('event handlers')).length
    );
    
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.some(error => 
      error.message.includes('event handlers')
    )).toBe(true);

    const fixResult = await AstroLintValidator.fixComponent(tempFile);
    
    // Should convert to standard HTML events
    expect(fixResult.fixedCode).toContain('onclick=');
    expect(fixResult.fixedCode).toContain('onmouseenter=');
    expect(fixResult.fixedCode).toContain('onmouseleave=');

    await fs.rm(tempDir, { recursive: true, force: true });
  });
}); 