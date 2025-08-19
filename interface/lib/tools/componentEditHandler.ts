import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export interface ComponentEditInstructions {
  target?: string;
  newContent?: string;
  component?: string;
  filePath?: string;
  operation?: string;
  properties?: Record<string, any>;
}

export interface ComponentEditResult {
  success: boolean;
  elementsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
  details?: string;
}

export async function executeComponentEdit(instructions: ComponentEditInstructions): Promise<ComponentEditResult> {
  console.log('\n=== Component Edit Handler ===');
  console.log('Instructions:', instructions);

  try {
    const { target, newContent, component, operation, properties } = instructions;
    
    if (!component) {
      throw new Error('Component is required for component edit');
    }

    if (!operation) {
      throw new Error('Operation is required for component edit');
    }

    // Construct component file path
    const componentName = component.charAt(0).toUpperCase() + component.slice(1);
    const filePath = join(
      PROJECT_ROOT,
      'rendering',
      'src',
      'components',
      `${componentName}.astro`
    );

    console.log('Target file:', filePath);

    // Read current content
    const originalContent = await readFile(filePath, 'utf-8');
    
    // Apply component transformation
    const result = await transformComponentContent(
      originalContent,
      filePath,
      instructions
    );

    if (!result.success) {
      // Pass the component content back to the agent for self-correction.
      const errorMsg = result.error || 'Component transformation failed';
      console.warn(`️⚠️  ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        details: `The agent could not perform the operation. Component content:\n\n---\n${originalContent}\n---`,
        filePath,
        elementsModified: [],
        transformationsApplied: 0,
      };
    }

    // Write updated content if changes were made
    if (result.modifiedContent && result.modifiedContent !== originalContent) {
      await writeFile(filePath, result.modifiedContent, 'utf-8');
      
      console.log('Component edit successful');
      console.log('Transformations applied:', result.transformationsApplied);
      console.log('Elements modified:', result.elementsModified);
      console.log('=== End Component Edit ===\n');

      return {
        success: true,
        elementsModified: result.elementsModified,
        transformationsApplied: result.transformationsApplied,
        filePath
      };
    } else {
      throw new Error(`No elements found to modify in ${component} component`);
    }

  } catch (error) {
    console.error('Component edit error:', error);
    
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

interface ComponentTransformResult {
  success: boolean;
  modifiedContent?: string;
  elementsModified: string[];
  transformationsApplied: number;
  error?: string;
  details?: string;
}

async function transformComponentContent(
  content: string,
  filePath: string,
  instructions: ComponentEditInstructions,
): Promise<ComponentTransformResult> {
  
  const { target, newContent, operation, properties } = instructions;
  let modifiedContent = content;
  let transformationsApplied = 0;
  const elementsModified: string[] = [];

  const op = operation?.toLowerCase();
  const targetElement = target || 'element';

  console.log(`Applying component transformation: ${op} on ${targetElement}`);

  switch (op) {
    case 'add':
    case 'insert':
      const addResult = await addElement(content, targetElement, newContent || '', properties || {});
      if (addResult.success) {
        modifiedContent = addResult.modifiedContent!;
        transformationsApplied++;
        elementsModified.push('added-element');
      }
      break;

    case 'remove':
    case 'delete':
      // Important: This case is now only for sub-component removal.
      // For deleting an entire component, the `component-delete` tool should be used.
      const removeResult = await removeElement(content, targetElement, properties || {});
      if (removeResult.success) {
        modifiedContent = removeResult.modifiedContent!;
        transformationsApplied++;
        elementsModified.push('removed-element');
      }
      break;

    case 'move':
    case 'relocate':
      const moveResult = await moveElement(content, targetElement, newContent || '', properties || {});
      if (moveResult.success) {
        modifiedContent = moveResult.modifiedContent!;
        transformationsApplied++;
        elementsModified.push('moved-element');
      }
      break;

    case 'modify':
    case 'update':
      const modifyResult = await modifyElement(content, targetElement, newContent || '', properties || {});
      if (modifyResult.success) {
        modifiedContent = modifyResult.modifiedContent!;
        transformationsApplied++;
        elementsModified.push('modified-element');
      }
      break;

    case 'structure-update':
      const structureUpdateResult = await modifyElement(content, targetElement, newContent || '', properties || {});
      if (structureUpdateResult.success) {
        modifiedContent = structureUpdateResult.modifiedContent!;
        transformationsApplied++;
        elementsModified.push('structure-updated-element');
      }
      break;

    default:
      return {
        success: false,
        elementsModified: [],
        transformationsApplied: 0,
        error: `Unknown operation: ${op}`
      };
  }

  if (transformationsApplied === 0) {
    return {
        success: false,
        modifiedContent: content,
        elementsModified,
        transformationsApplied,
        error: `Failed to ${op} ${targetElement}`,
    };
  }

  return {
    success: true,
    modifiedContent: modifiedContent,
    elementsModified,
    transformationsApplied,
  };
}

async function addElement(
  content: string,
  target: string,
  newElement: string,
  properties: Record<string, any>
): Promise<{ success: boolean; modifiedContent?: string }> {
  
  console.log(`Adding element after ${target}:`, newElement);

  // Generate appropriate HTML element based on the new content
  const elementHtml = generateElementHtml(newElement, properties);
  
  // Find insertion points based on target
  const insertionPatterns = getInsertionPatterns(target);
  
  for (const pattern of insertionPatterns) {
    const match = content.match(pattern);
    if (match) {
      console.log('Found insertion point:', match[0]);
      
      // Insert the new element after the target
      const modifiedContent = content.replace(pattern, `$&\n${elementHtml}`);
      
      return {
        success: true,
        modifiedContent
      };
    }
  }

  return { success: false };
}

async function removeElement(
  content: string,
  target: string,
  properties: Record<string, any>
): Promise<{ success: boolean; modifiedContent?: string }> {
  
  console.log(`Removing element: ${target}`);

  // Get removal patterns based on target
  const removalPatterns = getRemovalPatterns(target, properties);
  
  for (const pattern of removalPatterns) {
    const match = content.match(pattern);
    if (match) {
      console.log('Found element to remove:', match[0]);
      
      // Remove the element
      const modifiedContent = content.replace(pattern, '');
      
      return {
        success: true,
        modifiedContent
      };
    }
  }

  return { success: false };
}

async function moveElement(
  content: string,
  target: string,
  destination: string,
  properties: Record<string, any>
): Promise<{ success: boolean; modifiedContent?: string }> {
  
  console.log(`Moving element ${target} to ${destination}`);

  // Extract the element to move
  const extractionPatterns = getRemovalPatterns(target, properties);
  let elementToMove = '';
  let modifiedContent = content;
  
  for (const pattern of extractionPatterns) {
    const match = content.match(pattern);
    if (match) {
      elementToMove = match[0];
      modifiedContent = content.replace(pattern, '');
      break;
    }
  }

  if (!elementToMove) {
    return { success: false };
  }

  // Insert at new location
  const insertionPatterns = getInsertionPatterns(destination);
  
  for (const pattern of insertionPatterns) {
    const match = modifiedContent.match(pattern);
    if (match) {
      modifiedContent = modifiedContent.replace(pattern, `$&\n${elementToMove}`);
      
      return {
        success: true,
        modifiedContent
      };
    }
  }

  return { success: false };
}

async function modifyElement(
  content: string,
  target: string,
  newContent: string,
  properties: Record<string, any>
): Promise<{ success: boolean; modifiedContent?: string }> {
  
  console.log(`Modifying element ${target} with:`, newContent);

  // Get modification patterns
  const modificationPatterns = getModificationPatterns(target);
  
  for (const pattern of modificationPatterns) {
    const match = content.match(pattern.regex);
    if (match) {
      console.log('Found element to modify:', match[0]);
      
      const modifiedContent = content.replace(pattern.regex, pattern.replacer(newContent, ...match.slice(1)));
      
      return {
        success: true,
        modifiedContent
      };
    }
  }

  return { success: false };
}

function generateElementHtml(content: string, properties: Record<string, any>): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('button')) {
    return `    <button type="button" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
      ${content.replace(/button/gi, '').trim() || 'New Button'}
    </button>`;
  }
  
  if (lowerContent.includes('section')) {
    return `  <section class="py-12 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-extrabold text-gray-900">${content.replace(/section/gi, '').trim() || 'New Section'}</h2>
      <p class="mt-4 text-lg text-gray-600">Section content goes here.</p>
    </div>
  </section>`;
  }
  
  if (lowerContent.includes('card')) {
    return `    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900">${content.replace(/card/gi, '').trim() || 'New Card'}</h3>
        <p class="mt-2 text-sm text-gray-600">Card description.</p>
      </div>
    </div>`;
  }
  
  // Default: paragraph
  return `    <p class="text-gray-600">${content}</p>`;
}

function getInsertionPatterns(target: string): RegExp[] {
  const patterns: RegExp[] = [];
  
  switch (target.toLowerCase()) {
    case 'headline':
    case 'title':
    case 'heading':
      patterns.push(
        /<\/h1>/gi,
        /<\/h2>/gi
      );
      break;
      
    case 'button':
    case 'cta':
      patterns.push(
        /<\/button>/gi,
        /<\/a>/gi
      );
      break;
      
    case 'section':
      patterns.push(
        /<\/section>/gi,
        /<\/div>/gi
      );
      break;
      
    default:
      patterns.push(
        /<\/div>/gi,
        /<\/p>/gi
      );
  }
  
  return patterns;
}

function getRemovalPatterns(target: string, properties: Record<string, any>): RegExp[] {
  const patterns: RegExp[] = [];
  
  // Check for specific element removal (e.g., "third card", "second button")
  if (properties.ordinal) {
    // This is a simplified approach - in practice, you'd need more sophisticated counting
    patterns.push(
      new RegExp(`<(?:div|section|article)[^>]*>[\\s\\S]*?</(?:div|section|article)>`, 'gi')
    );
  }
  
  switch (target.toLowerCase()) {
    case 'button':
    case 'cta':
      patterns.push(
        /<button[^>]*>[\s\S]*?<\/button>/gi,
        /<a[^>]*class="[^"]*(?:btn|button)[^"]*"[^>]*>[\s\S]*?<\/a>/gi
      );
      break;
      
    case 'card':
      patterns.push(
        /<div[^>]*class="[^"]*(?:card|bg-white)[^"]*"[^>]*>[\s\S]*?<\/div>/gi
      );
      break;
      
    case 'section':
      patterns.push(
        /<section[^>]*>[\s\S]*?<\/section>/gi
      );
      break;
      
    default:
      patterns.push(
        /<div[^>]*>[\s\S]*?<\/div>/gi
      );
  }
  
  return patterns;
}

interface ModificationPattern {
  regex: RegExp;
  replacer: (newContent: string, ...groups: string[]) => string;
}

function getModificationPatterns(target: string): ModificationPattern[] {
  const patterns: ModificationPattern[] = [];
  
  switch (target.toLowerCase()) {
    case 'props':
    case 'attributes':
      patterns.push({
        regex: /(<[^>]+)(>)/gi,
        replacer: (newContent, openTag, closeTag) => `${openTag} ${newContent}${closeTag}`
      });
      break;
      
    case 'class':
    case 'classes':
      patterns.push({
        regex: /(class=")([^"]*?)(")/gi,
        replacer: (newContent, prefix, oldClasses, suffix) => `${prefix}${newContent}${suffix}`
      });
      break;
      
    default:
      patterns.push({
        regex: /(<[^>]*>)([^<]+)(<\/[^>]+>)/gi,
        replacer: (newContent, openTag, oldContent, closeTag) => `${openTag}${newContent}${closeTag}`
      });
  }
  
  return patterns;
} 