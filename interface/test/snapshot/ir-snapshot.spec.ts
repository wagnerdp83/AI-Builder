import { renderAstroFromIR } from '../../lib/tools/ir-renderer';
import { ComponentIR } from '../../lib/types/ir';
import { promises as fs } from 'fs';
import path from 'path';

describe('IR Snapshot Tests', () => {
  const goldenIrDir = path.join(__dirname, '../golden-ir');
  const goldenAstroDir = path.join(__dirname, '../golden-astro');

  beforeAll(async () => {
    // Ensure golden directories exist
    await fs.mkdir(goldenIrDir, { recursive: true });
    await fs.mkdir(goldenAstroDir, { recursive: true });
  });

  test('Hero component renders deterministically', async () => {
    const irPath = path.join(goldenIrDir, 'hero.ir.json');
    const irContent = await fs.readFile(irPath, 'utf-8');
    const ir: ComponentIR = JSON.parse(irContent);
    
    const rendered = renderAstroFromIR(ir);
    
    // Store golden snapshot if it doesn't exist
    const snapshotPath = path.join(goldenAstroDir, 'hero.astro');
    if (!(await fs.stat(snapshotPath).catch(() => false))) {
      await fs.writeFile(snapshotPath, rendered);
      console.log('Created golden snapshot for Hero component');
    } else {
      // Compare against existing snapshot
      const expected = await fs.readFile(snapshotPath, 'utf-8');
      expect(rendered).toBe(expected);
    }
  });

  test('Gallery component renders deterministically', async () => {
    const irPath = path.join(goldenIrDir, 'gallery.ir.json');
    const irContent = await fs.readFile(irPath, 'utf-8');
    const ir: ComponentIR = JSON.parse(irContent);
    
    const rendered = renderAstroFromIR(ir);
    
    const snapshotPath = path.join(goldenAstroDir, 'gallery.astro');
    if (!(await fs.stat(snapshotPath).catch(() => false))) {
      await fs.writeFile(snapshotPath, rendered);
      console.log('Created golden snapshot for Gallery component');
    } else {
      const expected = await fs.readFile(snapshotPath, 'utf-8');
      expect(rendered).toBe(expected);
    }
  });

  test('Service Menu component renders deterministically', async () => {
    const irPath = path.join(goldenIrDir, 'service-menu.ir.json');
    const irContent = await fs.readFile(irPath, 'utf-8');
    const ir: ComponentIR = JSON.parse(irContent);
    
    const rendered = renderAstroFromIR(ir);
    
    const snapshotPath = path.join(goldenAstroDir, 'service-menu.astro');
    if (!(await fs.stat(snapshotPath).catch(() => false))) {
      await fs.writeFile(snapshotPath, rendered);
      console.log('Created golden snapshot for Service Menu component');
    } else {
      const expected = await fs.readFile(snapshotPath, 'utf-8');
      expect(rendered).toBe(expected);
    }
  });
}); 