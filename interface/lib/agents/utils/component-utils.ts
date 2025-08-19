import { promises as fs } from 'fs';
import { getComponentsDir, getPagesDir } from '../../utils/directory';
import path from 'path';

export async function getAvailableComponents(): Promise<string[]> {
  try {
    const files = await fs.readdir(getComponentsDir());
    return files
      .filter(file => file.endsWith('.astro'))
      .map(file => path.parse(file).name);
  } catch (error) {
    console.warn('Could not read components directory to get available components.', error);
    // Fallback to a hardcoded list in case of an error
    return [
      'Hero',
      'Benefits',
      'Features',
      'Testimonials',
      'Reinforcement',
      'FAQ',
      'Contact',
      'Footer',
      'Header',
      'Pricing',
      'VisualDesign'
    ];
  }
}

export async function getAvailableSectionIds(): Promise<string[]> {
  try {
    // Fix the path to point to the correct rendering directory
    const indexPath = path.join(process.cwd(), '..', 'rendering', 'src', 'pages', 'index.astro');
    const content = await fs.readFile(indexPath, 'utf-8');
    
    // Extract section IDs from the content
    const sectionMatches = content.match(/<(\w+)\s+id="([^"]+)"/g);
    if (sectionMatches) {
      return sectionMatches.map(match => {
        const idMatch = match.match(/id="([^"]+)"/);
        return idMatch ? idMatch[1] : '';
      }).filter(id => id.length > 0);
    }
    
    return [];
  } catch (error) {
    console.warn('Could not read index.astro to get available section IDs. Error:', error);
    return [];
  }
} 