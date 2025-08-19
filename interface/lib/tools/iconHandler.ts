import { promises as fs } from 'fs';
import { getComponentFilePath } from '@/lib/agents/file-utils';
import { parse } from 'node-html-parser';
import { icons, LucideProps } from 'lucide-react';
import { createElement } from 'react';

export interface IconHandlerInstructions {
  elementSelector?: string; // e.g., "#tabs-with-card-item-3 svg"
  newContent?: string;      // e.g., "<path d='...'></path>"
  component?: string;
  details?: string;
}

export interface IconHandlerResult {
  success: boolean;
  elementsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
  details?: string;
}

const iconNameMap: { [key: string]: keyof typeof icons } = {
  'desktop': 'Monitor',
  'computer': 'Monitor',
  'laptop': 'Laptop',
  'success': 'BadgeCheck',
  'checkmark': 'Check',
  'error': 'CircleX',
  'warning': 'CircleAlert',
  'support': 'LifeBuoy',
  'user': 'User',
  'privacy': 'Shield',
  'investment': 'TrendingUp',
  'cost': 'DollarSign',
  'crm': 'Users',
};

function findIconName(text: string): keyof typeof icons | null {
    const lowerText = text.toLowerCase();
    for (const keyword in iconNameMap) {
        if (lowerText.includes(keyword)) {
            return iconNameMap[keyword];
        }
    }
    
    // As a fallback, try to find a direct match in the icons object
    const words = lowerText.split(/[\s\-]+/);
    for (const word of words) {
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
        if (capitalizedWord in icons) {
            return capitalizedWord as keyof typeof icons;
        }
    }

    return 'Monitor'; // Default to a desktop icon if no specific match
}

function toKebabCase(str: string) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

export async function executeIconHandler(instructions: IconHandlerInstructions): Promise<IconHandlerResult> {
  console.log('\n=== Intelligent Icon Handler ===');
  console.log('Instructions:', instructions);

  const { component, elementSelector, newContent } = instructions;

  if (!component || !elementSelector || !newContent) {
    return { success: false, error: 'Component, elementSelector, and newContent are required.', filePath: '', elementsModified: [], transformationsApplied: 0 };
  }
  
  const filePath = getComponentFilePath(component);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const root = parse(fileContent);

    const svgElement = root.querySelector(elementSelector);

    if (!svgElement) {
      throw new Error(`Could not find the SVG element with selector: "${elementSelector}"`);
    }

    let finalSvgPathData: string;

    // 1. Check if agent provided valid SVG path data
    if (newContent.includes('<path')) {
      console.log('✅ Agent provided valid SVG data.');
      finalSvgPathData = newContent;
    } else {
      // 2. If not, use the agent's description to find a real Lucide icon.
      console.warn(`⚠️ Agent provided descriptive text. Finding a real icon for "${newContent}"...`);
      const iconName = findIconName(newContent);
      if (iconName && icons[iconName]) {
        const IconComponent = icons[iconName];
        const iconNode = createElement(IconComponent);
        
        const children = iconNode.props.children ? Array.from(Array.isArray(iconNode.props.children) ? iconNode.props.children : [iconNode.props.children]) : [];
        const paths = children.map((child: any) => {
            if(child.type === 'path') {
                return `<path d="${child.props.d}" />`;
            }
             if(child.type === 'circle') {
                return `<circle cx="${child.props.cx}" cy="${child.props.cy}" r="${child.props.r}" />`;
            }
             if(child.type === 'rect') {
                return `<rect x="${child.props.x}" y="${child.props.y}" width="${child.props.width}" height="${child.props.height}" rx="${child.props.rx}" />`;
            }
             if(child.type === 'line') {
                return `<line x1="${child.props.x1}" y1="${child.props.y1}" x2="${child.props.x2}" y2="${child.props.y2}" />`;
            }
            return '';
        }).join('');

        finalSvgPathData = paths;
        console.log(`✅ Found Lucide icon: "${iconName}".`);
      } else {
        throw new Error(`Could not find a matching icon for "${newContent}".`);
      }
    }

    // Remove old paths and insert the new one
    const existingPaths = svgElement.querySelectorAll('path, circle, rect, line');
    existingPaths.forEach(path => path.remove());
    svgElement.set_content(finalSvgPathData);

    await fs.writeFile(filePath, root.toString(), 'utf-8');

    return {
      success: true,
      elementsModified: [elementSelector],
      transformationsApplied: 1,
      filePath,
      details: 'Replaced SVG with a high-quality Lucide icon.'
    };

  } catch (error) {
    console.error('❌ Icon Handler Error:', error);
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error during icon handling'
    };
  }
} 