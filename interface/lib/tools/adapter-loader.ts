import { promises as fs } from 'fs';
import path from 'path';

export interface StyleAdapter {
  styleSystem: string;
  layout: { container: Record<string, string> };
  theme: {
    fontFamilyMap: Record<string, string>;
    backgroundDefault: string;
    heading: string;
    body: string;
    button: string;
  };
}

export async function loadStyleAdapter(styleSystem: string = 'tailwind'): Promise<StyleAdapter> {
  const baseDir = path.join(process.cwd(), 'lib', 'config', 'adapters');
  const file = path.join(baseDir, `${styleSystem}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) as StyleAdapter;
  } catch {
    // Fallback to tailwind
    const raw = await fs.readFile(path.join(baseDir, 'tailwind.json'), 'utf-8');
    return JSON.parse(raw) as StyleAdapter;
  }
}

