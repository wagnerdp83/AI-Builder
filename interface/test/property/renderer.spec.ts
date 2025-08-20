import { renderAstroFromIR } from '../../lib/tools/ir-renderer';
import { ComponentIR } from '../../lib/types/ir';

describe('Deterministic Renderer properties', () => {
  test('renders placeholders, not external URLs', () => {
    const ir: ComponentIR = {
      version: '1.0',
      componentName: 'Hero',
      semanticTag: 'section',
placeholders: ['MOCKUP_IMAGE', 'VIDEO_URL'],
      content: { paragraphs: ['Welcome!'] }
    };
    const code = renderAstroFromIR(ir);
    expect(code).toContain('{{');
    expect(code).not.toMatch(/https:\/\/images\.unsplash\.com/);
  });

  test('single lucide import when icons provided', () => {
    const ir: ComponentIR = {
      version: '1.0',
      componentName: 'Gallery',
      semanticTag: 'section',
      lucideIcons: ['User', 'Star', 'User'],
      content: { items: [{ title: 'A', image: '{{MOCKUP_IMAGE}}' }] }
    };
    const code = renderAstroFromIR(ir);
    const imports = code.match(/import\s*\{[^}]+\}\s*from\s*'@lucide\/astro'/g) || [];
    expect(imports.length).toBe(1);
  });
});

