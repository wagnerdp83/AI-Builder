import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

interface StyleSource {
  type: 'tailwind' | 'inline-style';
  value: string;
  file: string;
  reference: string;
}

interface ColorReference {
  value: string;
  context: string;
  source: StyleSource;
}

// Get the theme colors from tailwind config
async function getThemeColors(projectRoot: string): Promise<Record<string, string>> {
  try {
    const configPath = join(projectRoot, 'rendering', 'tailwind.config.mjs');
    const configContent = await readFile(configPath, 'utf-8');
    
    // Extract colors using regex
    const firstColorMatch = configContent.match(/first:\s*['"]([^'"]+)['"]/);
    const secondColorMatch = configContent.match(/second:\s*['"]([^'"]+)['"]/);
    const thirdColorMatch = configContent.match(/third:\s*['"]([^'"]+)['"]/);

    return {
      'first': firstColorMatch?.[1] || '',
      'second': secondColorMatch?.[1] || '',
      'third': thirdColorMatch?.[1] || '',
    };
  } catch (error) {
    console.error('Error reading theme colors:', error);
    return {};
  }
}

export async function findColorReferences(elementType: string, projectRoot: string): Promise<ColorReference[]> {
  const references: ColorReference[] = [];
  const componentsDir = join(projectRoot, 'rendering', 'src', 'components');

  try {
    const files = await readdir(componentsDir);
    
    for (const file of files) {
      if (!file.endsWith('.astro')) continue;
      
      const filePath = join(componentsDir, file);
      const content = await readFile(filePath, 'utf-8');
      
      // For global updates targeting headlines and sub-headlines
      if (elementType === '*') {
        // Find h1-h6 elements with text color classes
        const headlineRegex = /<h[1-6][^>]*class="[^"]*text-(?:gray|first|second|third)-[^"]*"[^>]*>/g;
        let match: RegExpExecArray | null;
        
        while ((match = headlineRegex.exec(content)) !== null) {
          const classString = match[0];
          references.push({
            value: classString,
            context: 'tailwind-class',
            source: {
              type: 'tailwind',
              value: classString,
              file: filePath,
              reference: 'headline'
            }
          });
        }

        // Find paragraph elements that are likely sub-headlines
        const subHeadlineRegex = /<p[^>]*class="[^"]*(?:mt-[1-3]|mb-[1-3])[^"]*text-(?:gray|first|second|third)-[^"]*"[^>]*>/g;
        while ((match = subHeadlineRegex.exec(content)) !== null) {
          const classString = match[0];
          references.push({
            value: classString,
            context: 'tailwind-class',
            source: {
              type: 'tailwind',
              value: classString,
              file: filePath,
              reference: 'sub-headline'
            }
          });
        }
      } else {
        // Original specific component color search
        const hexColorRegex = /class="[^"]*bg-\[#[0-9a-fA-F]{6}\][^"]*"/g;
        let hexMatch: RegExpExecArray | null;
        
        while ((hexMatch = hexColorRegex.exec(content)) !== null) {
          const classString = hexMatch[0];
          const hexColors = classString.match(/bg-\[#[0-9a-fA-F]{6}\]/g) || [];
          hexColors.forEach((color: string) => {
            references.push({
              value: color,
              context: 'inline-hex',
              source: {
                type: 'inline-style',
                value: color,
                file: filePath,
                reference: 'hex-color'
              }
            });
          });
        }

        const darkHexColorRegex = /class="[^"]*dark:bg-\[#[0-9a-fA-F]{6}\][^"]*"/g;
        let darkMatch: RegExpExecArray | null;
        
        while ((darkMatch = darkHexColorRegex.exec(content)) !== null) {
          const classString = darkMatch[0];
          const hexColors = classString.match(/dark:bg-\[#[0-9a-fA-F]{6}\]/g) || [];
          hexColors.forEach((color: string) => {
            references.push({
              value: color,
              context: 'inline-hex',
              source: {
                type: 'inline-style',
                value: color,
                file: filePath,
                reference: 'hex-color'
              }
            });
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error finding color references:`, error);
  }

  return references;
}

export async function analyzeStyleDependencies(color: string, projectRoot: string) {
  const dependencies = new Set<string>();
  const componentsDir = join(projectRoot, 'rendering', 'src', 'components');
  
  // Read all component files
  try {
    const files = await readdir(componentsDir);
    for (const file of files) {
      if (!file.endsWith('.astro')) continue;
      
      const content = await readFile(join(componentsDir, file), 'utf-8');
      
      // Find Tailwind classes that use this color
      const classMatches = content.match(new RegExp(`(?:bg|text|border)-(?:${color})-[0-9]+`, 'g'));
      if (classMatches) {
        classMatches.forEach(match => dependencies.add(match));
      }
      
      // Find hex colors
      const hexMatches = content.match(new RegExp(`(?:bg-\\[|text-\\[|border-\\[)${color}\\]`, 'g'));
      if (hexMatches) {
        hexMatches.forEach(match => dependencies.add(match));
      }
    }
  } catch (error) {
    console.error('Error analyzing style dependencies:', error);
  }
  
  return Array.from(dependencies);
}

export function generateStyleUpdate(
  from: string,
  to: string,
  context: 'inline-hex' | 'tailwind-class',
  projectRoot: string
) {
  if (context === 'inline-hex') {
    return {
      update: (content: string) => {
        // Replace background colors
        content = content.replace(
          new RegExp(`bg-\\[${from}\\]`, 'g'),
          `bg-[${to}]`
        );
        
        // Replace dark mode background colors
        content = content.replace(
          new RegExp(`dark:bg-\\[${from}\\]`, 'g'),
          `dark:bg-[${to}]`
        );
        
        return content;
      }
    };
  }

  if (context === 'tailwind-class') {
    return {
      update: (content: string) => {
        // Replace text colors for headlines and sub-headlines
        content = content.replace(
          /(class="[^"]*text-)(gray|first|second|third)(-\d+[^"]*")/g,
          `$1${to}$3`
        );
        
        // Replace dark mode text colors
        content = content.replace(
          /(class="[^"]*dark:text-)(gray|first|second|third)(-\d+[^"]*")/g,
          `$1${to}$3`
        );
        
        return content;
      }
    };
  }

  return null;
} 