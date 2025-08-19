import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getComponentFilePath } from '@/lib/agents/file-utils';
import { parse, HTMLElement } from 'node-html-parser';

export interface StyleUpdateInstructions {
  elementSelector?: string;
  newContent?: string;
  component?: string;
  operation?: string;
}

export interface StyleUpdateResult {
  success: boolean;
  elementsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
  details?: string;
}

export async function executeStyleUpdate(instructions: StyleUpdateInstructions): Promise<StyleUpdateResult> {
  console.log('\n=== DOM-Aware Style Update Handler ===');
  console.log('Instructions:', instructions);

  const { elementSelector, newContent, component } = instructions;

  if (!component || !elementSelector || !newContent) {
    return {
      success: false,
      error: 'Missing required instructions: component, elementSelector, and newContent are required.',
      filePath: '',
      elementsModified: [],
      transformationsApplied: 0,
    };
  }

  const filePath = getComponentFilePath(component);

  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const root = parse(fileContent);

    // Check if the selector contains Tailwind arbitrary values (square brackets)
    // which can't be used in CSS selectors
    const hasTailwindArbitraryValues = elementSelector.includes('[') && elementSelector.includes(']');
    
    let element;
    
    if (hasTailwindArbitraryValues) {
      console.log(`🔧 Detected Tailwind arbitrary values in selector: "${elementSelector}"`);
      // Convert CSS selector format to class matching
      element = findElementByTailwindClasses(root, elementSelector);
    } else {
      // Use standard CSS selector
      element = root.querySelector(elementSelector);
    }

    if (!element) {
      // Element not found, return an error with the component content for the agent to self-correct.
      const errorMsg = `Element not found with selector: "${elementSelector}".`;
      console.warn(`⚠️  ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        details: `The agent could not find the element in the following component content:\n\n---\n${fileContent}\n---`,
        filePath: filePath,
        elementsModified: [],
        transformationsApplied: 0,
      };
    }
    
    // The agent provides the full new class string, e.g., "class='w-full h-auto rounded-lg'"
    // But it might also provide CSS styles, descriptive text, or class names directly
    // We need to extract the actual class value from it.
    let newClasses: string;
    
    // Try to parse as class="..." format first
    const classMatch = newContent.match(/class=(['"])(.*?)\1/);
    if (classMatch && classMatch[2]) {
        newClasses = classMatch[2];
    } 
    // Try to parse as CSS style property
    else if (newContent.includes(':') && newContent.includes(';')) {
        // Handle CSS style like "background-color: orange;"
        // Convert to appropriate Tailwind class or keep as style attribute
        const styleProperty = newContent.trim().replace(/;$/, '');
        if (styleProperty.includes('background-color')) {
            const colorMatch = styleProperty.match(/background-color:\s*([^;]+)/);
            if (colorMatch) {
                const color = colorMatch[1].trim();
                newClasses = `bg-[${color}]`;
            } else {
                newClasses = element.getAttribute('class') || '';
            }
        } else {
            // For other CSS properties, keep existing classes and add style attribute
            newClasses = element.getAttribute('class') || '';
            element.setAttribute('style', styleProperty);
        }
    }
    // Check if it's Tailwind classes (contains valid class patterns)
    else if (isTailwindClasses(newContent)) {
        newClasses = newContent.trim();
    }
    // If it's descriptive text (contains sentences, explanations), keep existing classes unchanged
    else if (isDescriptiveText(newContent)) {
        console.warn(`⚠️ Received descriptive text instead of class/style: "${newContent}". Keeping existing classes.`);
        newClasses = element.getAttribute('class') || '';
    }
    // Otherwise treat as direct class names
    else {
        newClasses = newContent.trim();
    }

    // Smart class replacement: preserve existing classes and only update background colors
    if (isTailwindClasses(newClasses)) {
        const currentClasses = element.getAttribute('class') || '';
        const updatedClasses = smartReplaceBackgroundClasses(currentClasses, newClasses);
        console.log(`✅ Element found. Smart updating classes from: "${currentClasses}" to: "${updatedClasses}"`);
        element.setAttribute('class', updatedClasses);
    } else {
        console.log(`✅ Element found. Setting classes to: "${newClasses}"`);
        element.setAttribute('class', newClasses);
    }

    await writeFile(filePath, root.toString(), 'utf-8');

    return {
      success: true,
      elementsModified: [elementSelector],
      transformationsApplied: 1,
      filePath,
      details: `Successfully applied classes to ${elementSelector}`
    };

  } catch (error) {
    console.error('❌ Style Update Handler Error:', error);
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath: filePath,
      error: error instanceof Error ? error.message : 'Unknown error during style update'
    };
  }
}

interface PreciseStyleResult {
  success: boolean;
  modifiedContent: string;
  elementsModified: string[];
  transformationsApplied: number;
  error?: string;
  details?: string;
}

async function applyPreciseStyleTransformation(
  content: string,
  params: {
    elementSelector?: string;
    contentMatch?: string;
    newContent?: string;
    operation?: string;
    properties?: Record<string, any>;
  }
): Promise<PreciseStyleResult> {
  
  const { elementSelector, contentMatch, newContent, operation, properties } = params;
  
  console.log('🔧 Precise style transformation:', {
    hasElementSelector: !!elementSelector,
    hasContentMatch: !!contentMatch,
    hasNewContent: !!newContent,
    operation: operation
  });

  let modifiedContent = content;
  const elementsModified: string[] = [];
  let transformationsApplied = 0;

  try {
    // Strategy 1: Direct content replacement for style attributes
    if (contentMatch && newContent) {
      if (content.includes(contentMatch)) {
        modifiedContent = modifiedContent.replace(new RegExp(escapeRegExp(contentMatch), 'g'), newContent);
        elementsModified.push('direct-style-match');
        transformationsApplied = (content.match(new RegExp(escapeRegExp(contentMatch), 'g')) || []).length;
        
        return {
          success: true,
          modifiedContent,
          elementsModified,
          transformationsApplied,
          details: `Direct style replacement: "${contentMatch}" → "${newContent}"`
        };
      } else {
        return {
          success: false,
          modifiedContent: content,
          elementsModified: [],
          transformationsApplied: 0,
          error: `Style content "${contentMatch}" not found in component`
        };
      }
    }

    // Strategy 2: Element-based style updates
    if (elementSelector && properties && Object.keys(properties).length > 0) {
      const result = updateElementStyles(content, elementSelector, properties);
      if (result.success) {
        return result;
      }
    }

    return {
      success: false,
      modifiedContent: content,
      elementsModified: [],
      transformationsApplied: 0,
      error: 'No applicable style transformation strategy found'
    };

  } catch (error) {
    return {
      success: false,
      modifiedContent: content,
      elementsModified: [],
      transformationsApplied: 0,
      error: error instanceof Error ? error.message : 'Unknown error during style transformation'
    };
  }
}

// Helper function to update element styles based on selector
function updateElementStyles(
  content: string,
  selector: string,
  properties: Record<string, any>
): PreciseStyleResult {
  
  console.log(`🎨 Updating styles for selector: "${selector}"`);
  console.log('Properties to apply:', properties);
  
  // For now, return not implemented - this prevents the wild style application
  return {
    success: false,
    modifiedContent: content,
    elementsModified: [],
    transformationsApplied: 0,
    error: 'Complex element-based style updates not yet implemented to prevent component corruption'
  };
}

// Helper function to check if content looks like Tailwind classes
function isTailwindClasses(content: string): boolean {
  const trimmed = content.trim();
  
  // Check for common Tailwind class patterns
  const tailwindPatterns = [
    /^(bg|text|border|p|m|w|h|flex|grid|rounded|shadow|hover|dark|focus|ring|opacity|cursor|font|text-|leading-|tracking-|space-|gap-|items-|justify-|self-|place-|transform|transition|duration-|ease-|scale-|rotate-|translate-|skew-|origin-)/,
    /\b(sm|md|lg|xl|2xl):/,
    /\b(hover|focus|active|disabled|group-hover|dark):/,
    /\b(bg|text|border)-(red|blue|green|yellow|purple|pink|gray|indigo|cyan|teal|orange|amber|lime|emerald|sky|violet|fuchsia|rose|slate|zinc|neutral|stone)-\d+/,
    /\b(w|h|p|m|gap|space)-(0|px|\d+|auto|full|screen)/
  ];
  
  // If it contains only valid class-like tokens (no sentences)
  const words = trimmed.split(/\s+/);
  const hasValidClassTokens = words.every(word => 
    tailwindPatterns.some(pattern => pattern.test(word)) || 
    /^[a-z-]+$/.test(word) // Simple class names
  );
  
  return hasValidClassTokens && !trimmed.includes(' to ') && !trimmed.includes(' the ') && !trimmed.includes('.');
}

// Helper function to check if content is descriptive text
function isDescriptiveText(content: string): boolean {
  const trimmed = content.trim();
  
  // Check for sentence indicators
  const sentenceIndicators = [
    /\b(Add|Create|Update|Change|Remove|Set|Apply|Use|Make)\s+/i,
    /\bto\s+(ensure|make|add|create|update)/i,
    /\b(the|a|an)\s+/,
    /[.!?]/, // Sentence endings
    /\s(is|are|will|should|must|can|may)\s/i
  ];
  
  return sentenceIndicators.some(pattern => pattern.test(trimmed)) || trimmed.length > 100;
}

// Helper function to smartly replace background classes while preserving other classes
function smartReplaceBackgroundClasses(currentClasses: string, newBackgroundClasses: string): string {
  const current = currentClasses.split(/\s+/).filter(c => c.length > 0);
  const newBg = newBackgroundClasses.split(/\s+/).filter(c => c.length > 0);
  
  console.log(`🔄 Smart replacing classes:`);
  console.log(`  Current: "${currentClasses}"`);
  console.log(`  New BG: "${newBackgroundClasses}"`);
  
  // Remove existing gradient and color-related classes only, preserve all layout/structural classes
  const backgroundPatterns = [
    /^bg-gradient-/,          // bg-gradient-to-br, bg-gradient-to-r, etc.
    /^from-/,                 // from-[#383877], from-orange-500, etc.  
    /^to-/,                   // to-[#383877], to-orange-700, etc.
    /^via-/,                  // via-orange-400, etc.
    /^bg-[a-z]+-\d+$/,        // bg-orange-500, bg-blue-600, etc. (but not bg-white, bg-transparent)
    /^hover:bg-[a-z]+-\d+$/,  // hover:bg-orange-600, etc.
    /^dark:bg-[a-z]+-\d+$/,   // dark:bg-orange-500, etc.
  ];
  
  // Keep all classes that don't match background patterns  
  const preserved = current.filter(cls => 
    !backgroundPatterns.some(pattern => pattern.test(cls))
  );
  
  console.log(`  Preserved: [${preserved.join(', ')}]`);
  console.log(`  Adding: [${newBg.join(', ')}]`);
  
  // Add new background classes
  const result = [...preserved, ...newBg];
  const finalClasses = result.join(' ');
  
  console.log(`  Final: "${finalClasses}"`);
  return finalClasses;
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to find element by Tailwind classes
function findElementByTailwindClasses(root: any, selector: string): any {
  console.log(`🔍 Parsing Tailwind selector: "${selector}"`);
  
  // Convert selector format like ".bg-gradient-to-br.from-[#383877].to-[#383877]"
  // to individual class names: ["bg-gradient-to-br", "from-[#383877]", "to-[#383877]"]
  const classNames = selector
    .split('.')
    .filter((cls: string) => cls.length > 0)
    .map((cls: string) => cls.trim());
  
  console.log(`📋 Extracted classes: ${JSON.stringify(classNames)}`);
  
  if (classNames.length === 0) return null;
  
  // Find all elements and check if they contain ALL the required classes
  const allElements = root.querySelectorAll('*');
  
  for (const element of allElements) {
    const elementClasses = element.getAttribute('class') || '';
    const elementClassList = elementClasses.split(/\s+/).filter((cls: string) => cls.length > 0);
    
    // Check if this element has ALL the required classes
    const hasAllClasses = classNames.every((requiredClass: string) => {
      return elementClassList.includes(requiredClass);
    });
    
    if (hasAllClasses) {
      console.log(`✅ Found matching element with classes: "${elementClasses}"`);
      return element;
    }
  }
  
  console.warn(`⚠️ No element found with all classes: ${JSON.stringify(classNames)}`);
  return null;
} 