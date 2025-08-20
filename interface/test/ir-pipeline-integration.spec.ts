import { renderAstroFromIR } from '../lib/tools/ir-renderer';
import { ComponentIR, validateIR } from '../lib/types/ir';

describe('IR Pipeline Integration Test', () => {
  test('IR pipeline generates valid Astro components', () => {
    // Test with a simple IR specification
    const testIR: ComponentIR = {
      version: '1.0',
      componentName: 'TestComponent',
      semanticTag: 'section',
      content: {
        headings: ['Test Heading'],
        paragraphs: ['Test paragraph content']
      },
      lucideIcons: ['Star'],
      layout: 'container',
      theme: 'default'
    };

    // Validate the IR
    const validation = validateIR(testIR);
    expect(validation.valid).toBe(true);

    // Render to Astro
    const astroCode = renderAstroFromIR(testIR);
    
    // Verify the output contains expected elements
    expect(astroCode).toContain('---');
    expect(astroCode).toContain('import { Star } from \'@lucide/astro\'');
    expect(astroCode).toContain('<section');
    expect(astroCode).toContain('Test Heading');
    expect(astroCode).toContain('Test paragraph content');
    expect(astroCode).toContain('</section>');
  });

  test('IR pipeline handles complex interactions', () => {
    const complexIR: ComponentIR = {
      version: '1.0',
      componentName: 'GalleryComponent',
      semanticTag: 'section',
      content: {
        headings: ['Photo Gallery'],
        items: [
          {
            title: 'Photo 1',
            image: '{{MOCKUP_IMAGE}}',
            description: 'Beautiful photo'
          }
        ]
      },
      lucideIcons: ['Image', 'ArrowRight'],
      layout: 'container',
      theme: 'default',
      interactions: {
        beforeAfterHover: true,
        carousel: true
      }
    };

    const validation = validateIR(complexIR);
    expect(validation.valid).toBe(true);

    const astroCode = renderAstroFromIR(complexIR);
    
    // Should contain before/after functionality
    expect(astroCode).toContain('beforeImage');
    expect(astroCode).toContain('afterImage');
    expect(astroCode).toContain('group-hover:opacity-0');
  });
}); 