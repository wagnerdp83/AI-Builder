import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseHTML } from 'node-html-parser';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

// Tailwind color patterns commonly used in Preline.co templates
const TAILWIND_PATTERNS = {
  gradient: {
    pattern: /bg-gradient-to-(?:br|tr|bl|tl)\s+from-(?:\[#[0-9a-fA-F]{6}\]|\w+-\d+)\s+to-(?:\[#[0-9a-fA-F]{6}\]|\w+-\d+)/,
    replace: (color: string) => `bg-${color}-600`
  },
  solid: {
    pattern: /bg-(?:\[#[0-9a-fA-F]{6}\]|\w+-\d+)/,
    replace: (color: string) => `bg-${color}-600`
  },
  text: {
    pattern: /text-(?:\[#[0-9a-fA-F]{6}\]|\w+-\d+)/,
    replace: (color: string) => `text-${color}-600`
  }
};

// Common Preline.co component patterns
const PRELINE_PATTERNS = {
  icon: 'flex justify-center items-center size-12',
  card: 'flex flex-col justify-center border border-gray-200 rounded-xl',
  button: 'py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg'
};

function getElementClasses(element: any): string[] {
  const classAttr = element.getAttribute('class');
  return classAttr ? classAttr.split(' ') : [];
}

function setElementClasses(element: any, classes: string[]) {
  element.setAttribute('class', classes.join(' '));
}

function identifyElementType(classes: string[]): string | null {
  for (const [type, pattern] of Object.entries(PRELINE_PATTERNS)) {
    if (pattern.split(' ').every(cls => classes.includes(cls))) {
      return type;
    }
  }
  return null;
}

function getReplacementClasses(currentClasses: string[], colorName: string, elementType: string | null): { add: string[], remove: string[] } {
  const remove: string[] = [];
  let add: string[] = [];

  // Find existing color classes to remove
  const classString = currentClasses.join(' ');
  for (const [type, pattern] of Object.entries(TAILWIND_PATTERNS)) {
    const match = classString.match(pattern.pattern);
    if (match) {
      remove.push(...match[0].split(' '));
    }
  }

  // Add appropriate new color classes based on element type
  switch (elementType) {
    case 'icon':
      // Icons in Preline typically use solid colors or gradients
      add = [TAILWIND_PATTERNS.solid.replace(colorName)];
      break;
    case 'button':
      // Buttons typically use solid colors with hover states
      add = [
        TAILWIND_PATTERNS.solid.replace(colorName),
        `hover:bg-${colorName}-700`
      ];
      break;
    default:
      // Default to solid color if pattern not recognized
      add = [TAILWIND_PATTERNS.solid.replace(colorName)];
  }

  return { add, remove };
}

async function getComponentPath(file: string): Promise<string> {
  const normalizedPath = file.startsWith('src/components/') ? file : 
                        `src/components/${file.replace(/^components\//, '')}`;
  return join(PROJECT_ROOT, 'rendering', normalizedPath);
}

async function modifyComponent(file: string, modifier: (doc: any) => any) {
  const fullPath = await getComponentPath(file);
  const content = await readFile(fullPath, 'utf-8');
  const doc = parseHTML(content);
  
  const result = await modifier(doc);
  
  await writeFile(fullPath, doc.toString(), 'utf-8');
  return { success: true, ...result };
}

export const handlers = {
  updateText: async ({ file, selector, newText }: { 
    file: string; 
    selector: string; 
    newText: string; 
  }) => {
    return modifyComponent(file, (doc) => {
      const element = doc.querySelector(selector);
      if (!element) throw new Error(`Element not found: ${selector}`);
      element.set_content(newText);
    });
  },

  updateTailwindClass: async ({ 
    file, 
    selector, 
    addClass = [], 
    removeClass = [] 
  }: { 
    file: string; 
    selector: string; 
    addClass?: string[]; 
    removeClass?: string[]; 
  }) => {
    return modifyComponent(file, (doc) => {
      // Find all elements
      const elements = doc.querySelectorAll('div, button, a');
      let targetElement = null;
      let elementType = null;

      // First try to find by component type and existing classes
      for (const el of elements) {
        const classes = getElementClasses(el);
        const type = identifyElementType(classes);
        
        // For color updates, check if element has any of the classes to remove
        // or matches gradient/color patterns
        if (removeClass.length > 0) {
          const hasTargetClass = removeClass.some(cls => classes.includes(cls));
          const hasColorPattern = Object.values(TAILWIND_PATTERNS).some(
            pattern => pattern.pattern.test(classes.join(' '))
          );
          
          if ((type && (hasTargetClass || hasColorPattern))) {
            targetElement = el;
            elementType = type;
            break;
          }
        }
      }

      if (!targetElement) {
        throw new Error(`Could not find element with matching pattern`);
      }

      // Get current classes
      const currentClasses = getElementClasses(targetElement);

      // If addClass contains a color name, use it to generate appropriate classes
      const colorMatch = addClass.find(cls => /^(blue|orange|gray|primary)-?\d*$/.test(cls));
      if (colorMatch) {
        const colorName = colorMatch.split('-')[0];
        const { add, remove } = getReplacementClasses(currentClasses, colorName, elementType);
        addClass = add;
        removeClass = remove;
      }

      // Update classes
      const newClasses = currentClasses
        .filter(cls => !removeClass.some(r => cls.includes(r)))
        .concat(addClass);

      setElementClasses(targetElement, newClasses);
      
      return {
        elementType,
        oldClasses: currentClasses,
        newClasses
      };
    });
  },

  deleteElement: async ({ file, selector }: { 
    file: string; 
    selector: string; 
  }) => {
    return modifyComponent(file, (doc) => {
      const element = doc.querySelector(selector);
      if (!element) throw new Error(`Element not found: ${selector}`);
      element.remove();
    });
  },

  addElement: async ({ 
    file, 
    parentSelector, 
    position, 
    html 
  }: { 
    file: string; 
    parentSelector: string; 
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'; 
    html: string; 
  }) => {
    return modifyComponent(file, (doc) => {
      const parent = doc.querySelector(parentSelector);
      if (!parent) throw new Error(`Parent element not found: ${parentSelector}`);
      parent.insertAdjacentHTML(position, html);
    });
  },

  updateAttribute: async ({ 
    file, 
    selector, 
    attribute, 
    value 
  }: { 
    file: string; 
    selector: string; 
    attribute: string; 
    value: string; 
  }) => {
    return modifyComponent(file, (doc) => {
      const element = doc.querySelector(selector);
      if (!element) throw new Error(`Element not found: ${selector}`);
      element.setAttribute(attribute, value);
    });
  }
}; 