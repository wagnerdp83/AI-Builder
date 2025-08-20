import { renderAstroFromIR } from '../../lib/tools/ir-renderer';
import { ComponentIR } from '../../lib/types/ir';

describe('Determinism Properties', () => {
  test('identical IR produces identical output', () => {
    const ir: ComponentIR = {
      version: '1.0',
      componentName: 'Test',
      semanticTag: 'section',
      content: { paragraphs: ['Hello World'] }
    };
    
    const output1 = renderAstroFromIR(ir);
    const output2 = renderAstroFromIR(ir);
    
    expect(output1).toBe(output2);
  });

  test('output hash is consistent for same input', () => {
    const ir: ComponentIR = {
      version: '1.0',
      componentName: 'Test',
      semanticTag: 'section',
      content: { headings: ['Title'] }
    };
    
    const output1 = renderAstroFromIR(ir);
    const output2 = renderAstroFromIR(ir);
    
    // Simple hash simulation
    const hash1 = output1.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const hash2 = output2.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    
    expect(hash1).toBe(hash2);
  });

  test('renderer is pure function (no side effects)', () => {
    const ir: ComponentIR = {
      version: '1.0',
      componentName: 'Test',
      semanticTag: 'section',
      content: { buttons: ['Click me'] }
    };
    
    // Capture any potential side effects
    const originalConsoleLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => logs.push(args.join(' '));
    
    renderAstroFromIR(ir);
    
    // Restore console
    console.log = originalConsoleLog;
    
    // Should not have logged anything (pure function)
    expect(logs).toHaveLength(0);
  });
}); 