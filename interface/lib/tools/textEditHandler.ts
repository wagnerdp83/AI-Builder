import { Project, SyntaxKind, SourceFile } from 'ts-morph';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { promises as fs } from 'fs';
import path from 'path';
import { parse, HTMLElement } from 'node-html-parser';
import { getComponentFilePath } from '@/lib/agents/file-utils';
import { applyTransformations, Transformation } from '@/lib/html-transformer';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export interface TextEditInstructions {
  elementSelector?: string;
  contentMatch?: string;
  newContent?: string;
  component?: string;
  filePath?: string;
  operation?: string;
  context?: string;
}

export interface TextEditResult {
  success: boolean;
  elementsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
  details?: string;
}

interface TransformResult {
  success: boolean;
  modifiedContent?: string;
  elementsModified: string[];
  transformationsApplied: number;
  error?: string;
}

async function renameUploadedImage(instructions: TextEditInstructions): Promise<string> {
  const oldImagePath = instructions.contentMatch!;
  const tempImagePath = instructions.newContent!;
  
  const oldImageName = path.parse(oldImagePath).name;
  const tempImageName = path.parse(tempImagePath).name;
  
  const finalImageName = `${oldImageName}-edited${path.extname(tempImagePath)}`;
  const finalImageUrl = path.join(path.dirname(tempImagePath), finalImageName);
  
  const renderingPublicPath = path.resolve(process.cwd(), '..', 'rendering', 'public');
  const tempFileOnDisk = path.join(renderingPublicPath, tempImagePath);
  const finalFileOnDisk = path.join(renderingPublicPath, finalImageUrl);

  console.log(`Renaming image: ${tempFileOnDisk} -> ${finalFileOnDisk}`);
  
  try {
    await fs.rename(tempFileOnDisk, finalFileOnDisk);
    console.log(`✅ Renamed successfully to ${finalFileOnDisk}`);
    return finalImageUrl;
  } catch (error) {
    console.error(`❌ Failed to rename image: ${error}`);
    // If rename fails, proceed with the temporary name to avoid breaking the update
    return tempImagePath;
  }
}

export async function executeTextEdit(instructions: TextEditInstructions): Promise<TextEditResult> {
  try {
    console.log('\n=== Enhanced Dynamic Text Edit Handler ===');
    console.log('Instructions:', instructions);

    let finalInstructions = { ...instructions };

    // If this is an image update, rename the file to something more descriptive
    if (instructions.operation === 'image-update' && instructions.contentMatch && instructions.newContent?.includes('uploaded')) {
      const finalImageUrl = await renameUploadedImage(instructions);
      finalInstructions.newContent = finalImageUrl;
    }

    if (!finalInstructions.component) {
      throw new Error('Component name is required for text edit');
    }
    
    const filePath = getComponentFilePath(finalInstructions.component);
    const fileContent = await fs.readFile(filePath, 'utf-8');

    console.log('🔍 ANALYZING CURRENT CONTENT:');
    console.log('Looking for:', finalInstructions.contentMatch);
    console.log('File content preview: \n');
    console.log(fileContent.substring(0, 500) + '...');

    const root = parse(fileContent);

    // --- Start of New, Combined Removal Logic ---
    if (finalInstructions.operation?.includes('remove')) {
        const { elementSelector, contentMatch } = finalInstructions;
        let success = false;

        // --- Strategy 1: Remove by specific selector (ideal for form fields, etc.) ---
        if (elementSelector) {
            console.log(`🔍 Attempting removal with selector: "${elementSelector}"`);
            const element = root.querySelector(elementSelector);
            if (element) {
                // The target is often a wrapper div. Find the closest one to remove the whole field.
                const blockToRemove = element.closest('div');
                if (blockToRemove) {
                    console.log('✅ Identified parent block for removal via selector:', blockToRemove.outerHTML.substring(0, 200) + '...');
                    blockToRemove.remove();
                    success = true;
                } else {
                    // Fallback for elements without a div wrapper
                    console.log('⚠️ No parent div found. Removing element directly:', element.outerHTML.substring(0, 200) + '...');
                    element.remove();
                    success = true;
                }
            } else {
                console.warn(`⚠️ Selector "${elementSelector}" did not find any element.`);
            }
        }
        
        // --- Strategy 2: If selector fails or is absent, remove by text content (ideal for content blocks) ---
        if (!success && contentMatch) {
            console.log(`Selector removal failed or not provided. Trying text-based search for: "${contentMatch}"`);
            const searchText = contentMatch.replace(/<!--.*-->/g, '').trim();

            if (searchText) {
                const textTags = ['h3', 'h2', 'h4', 'h5', 'h6', 'p', 'a', 'span', 'strong'];
                let targetElement: HTMLElement | null = null;
                for (const tag of textTags) {
                    const elements = root.querySelectorAll(tag);
                    for (const element of elements) {
                        if (element.textContent.trim().includes(searchText)) {
                            targetElement = element;
                            console.log(`✅ Found text in <${tag}>: "${element.textContent.trim()}"`);
                            break;
                        }
                    }
                    if (targetElement) break;
                }

                if (targetElement) {
                    let blockToRemove = targetElement;
                    let parent = blockToRemove.parentNode as HTMLElement | null;
                    while (parent && parent.tagName !== 'BODY') {
                        if (parent.classList.contains('divide-y')) {
                            break;
                        }
                        blockToRemove = parent;
                        parent = parent.parentNode as HTMLElement | null;
                    }

                    if (parent && parent.classList.contains('divide-y')) {
                         console.log('✅ Identified block for removal via text search:', blockToRemove.outerHTML.substring(0, 200) + '...');
                        blockToRemove.remove();
                        success = true;
                    } else {
                        console.warn('⚠️ Aborting text-based removal: Could not identify a safe parent block.');
                    }
                }
            }
        }

        if (success) {
            await fs.writeFile(filePath, root.toString(), 'utf-8');
            console.log('✅ File updated successfully using direct DOM removal.');
            return {
                success: true,
                elementsModified: ['component-block'],
                transformationsApplied: 1,
                filePath: filePath,
                details: `Removed block via selector or text match.`
            };
        }
    }
    // --- End of New, Combined Removal Logic ---

    // Fallback to transformation-based logic for other operations
    console.log('Operation is not a recognized removal, or removal failed. Using transformation-based logic...');
    const transformations: Transformation[] = [];

    // Prioritize direct content match if available for 'replace' operations
    if (finalInstructions.contentMatch && finalInstructions.newContent) {
      // First check for exact string match in the raw file content
      if (fileContent.includes(finalInstructions.contentMatch)) {
        console.log(`✅ Found exact string match for: "${finalInstructions.contentMatch}"`);
        
        // Use a more precise replacement strategy for HTML content
        const updatedContent = replaceTextInHtmlContext(fileContent, finalInstructions.contentMatch, finalInstructions.newContent);
        
        if (updatedContent !== fileContent) {
          await fs.writeFile(filePath, updatedContent, 'utf-8');
          console.log('✅ File updated successfully with string-based replacement');
          return {
            success: true,
            elementsModified: ['text-content-match'],
            transformationsApplied: 1,
            filePath: filePath,
            details: `String-based replacement: "${finalInstructions.contentMatch}" → "${finalInstructions.newContent}"`
          };
        }
      } else {
        console.warn(`⚠️ Exact string match for "${finalInstructions.contentMatch}" not found. This may indicate the content has changed or includes HTML formatting.`);
        
        // Try to find the text within HTML elements using DOM parsing
        const domBasedResult = findAndReplaceTextInDOM(fileContent, finalInstructions.contentMatch, finalInstructions.newContent);
        if (domBasedResult.success) {
          await fs.writeFile(filePath, domBasedResult.content, 'utf-8');
          console.log('✅ File updated successfully with DOM-based text replacement');
          return {
            success: true,
            elementsModified: ['dom-text-match'],
            transformationsApplied: 1,
            filePath: filePath,
            details: `DOM-based text replacement: "${finalInstructions.contentMatch}" → "${finalInstructions.newContent}"`
          };
        }
      }
    }

    // Only use selector-based modification as a fallback when text matching fails
    if (finalInstructions.elementSelector && finalInstructions.newContent) {
      console.log(`⚠️ Falling back to selector-based approach: "${finalInstructions.elementSelector}"`);
      
      // Add warning about potential multiple matches
      const root = parse(fileContent);
      const matchingElements = root.querySelectorAll(finalInstructions.elementSelector);
      if (matchingElements.length > 1) {
        console.warn(`⚠️ WARNING: Selector "${finalInstructions.elementSelector}" matches ${matchingElements.length} elements. This may cause unintended changes.`);
        
        // If we have contentMatch, try to find the specific element that contains it
        if (finalInstructions.contentMatch) {
          const targetElement = matchingElements.find(el => el.textContent && el.textContent.includes(finalInstructions.contentMatch!));
          if (targetElement && finalInstructions.newContent) {
            console.log(`✅ Found specific element containing "${finalInstructions.contentMatch}"`);
            targetElement.innerHTML = finalInstructions.newContent;
            await fs.writeFile(filePath, root.toString(), 'utf-8');
            return {
              success: true,
              elementsModified: ['targeted-element'],
              transformationsApplied: 1,
              filePath: filePath,
              details: `Targeted element replacement based on content match`
            };
          }
        }
      }
      
      transformations.push({
        type: 'update-content',
        selector: finalInstructions.elementSelector,
        newContent: finalInstructions.newContent,
      });
      console.log(`✅ Using selector-based update for "${finalInstructions.elementSelector}"`);
    }

    if (transformations.length === 0) {
      throw new Error(`Could not find a target for modification. Neither direct content match nor selector found.`);
    }

    const { updatedContent, appliedCount } = applyTransformations(fileContent, transformations);

    if (appliedCount > 0) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log('✅ File updated successfully with verified changes');
      return {
        success: true,
        elementsModified: ['direct-content-match'], // This might need to be smarter
        transformationsApplied: appliedCount,
        filePath: filePath,
        details: `Direct content replacement: "${finalInstructions.contentMatch}" → "${finalInstructions.newContent}"`
      };
    } else {
      throw new Error('Content replacement failed: The specified content or selector was not found in the file.');
    }
  } catch (error) {
    console.error('❌ Dynamic Text Edit Handler Error:', error);
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath: instructions.component ? getComponentFilePath(instructions.component) : '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface DynamicEditResult {
  success: boolean;
  modifiedContent: string;
  elementsModified: string[];
  transformationsApplied: number;
  error?: string;
  details?: string;
}

async function performDynamicTextEdit(
  content: string,
  params: {
    elementSelector?: string;
    contentMatch?: string;
    newContent?: string;
    context?: string;
  }
): Promise<DynamicEditResult> {
  
  const { elementSelector, contentMatch, newContent, context } = params;
  
  console.log('🔍 Dynamic content analysis:', {
    hasElementSelector: !!elementSelector,
    hasContentMatch: !!contentMatch,
    hasNewContent: !!newContent,
    context: context
  });

  let modifiedContent = content;
  const elementsModified: string[] = [];
  let transformationsApplied = 0;

  try {
    // Strategy 1: Direct content matching (most reliable)
    if (contentMatch && newContent) {
      const directMatches = findDirectContentMatches(content, contentMatch);
      if (directMatches.length > 0) {
        console.log(`✅ Found ${directMatches.length} direct content matches for: "${contentMatch}"`);
        
        // Replace all occurrences
        modifiedContent = modifiedContent.replace(new RegExp(escapeRegExp(contentMatch), 'g'), newContent);
        elementsModified.push('direct-content-match');
        transformationsApplied = directMatches.length;
        
        return {
          success: true,
          modifiedContent,
          elementsModified,
          transformationsApplied,
          details: `Direct content replacement: "${contentMatch}" → "${newContent}"`
        };
      }
    }

    // Strategy 2: Element-based targeting with content search
    if (elementSelector) {
      const elementResult = findAndUpdateElementContent(content, elementSelector, contentMatch, newContent);
      if (elementResult.success) {
        return elementResult;
      }
    }

    // Strategy 3: Intelligent content search with fuzzy matching
    if (contentMatch && newContent) {
      const fuzzyResult = performFuzzyContentSearch(content, contentMatch, newContent);
      if (fuzzyResult.success) {
        return fuzzyResult;
      }
    }

    // Strategy 4: Semantic content targeting
    if (newContent) {
      const semanticResult = performSemanticContentUpdate(content, params);
      if (semanticResult.success) {
        return semanticResult;
      }
    }

    return {
      success: false,
      modifiedContent: content,
      elementsModified: [],
      transformationsApplied: 0,
      error: `No matching content found. Searched for: "${contentMatch}" in element: "${elementSelector}"`
    };

  } catch (error) {
    return {
      success: false,
      modifiedContent: content,
      elementsModified: [],
      transformationsApplied: 0,
      error: error instanceof Error ? error.message : 'Unknown error during content modification'
    };
  }
}

// Strategy 1: Direct content matching
function findDirectContentMatches(content: string, searchText: string): string[] {
  const matches: string[] = [];
  const regex = new RegExp(escapeRegExp(searchText), 'gi');
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[0]);
  }
  
  return matches;
}

// Strategy 2: Element-based targeting
function findAndUpdateElementContent(
  content: string,
  elementSelector: string,
  contentMatch?: string,
  newContent?: string
): DynamicEditResult {
  
  console.log(`🎯 Searching for elements matching: "${elementSelector}"`);
  
  // Parse element selector to extract tag and classes
  const selectorParts = parseElementSelector(elementSelector);
  
  for (const part of selectorParts) {
    const elementMatches = findElementsByPattern(content, part);
    
    if (elementMatches.length > 0) {
      console.log(`✅ Found ${elementMatches.length} elements matching: ${part.pattern}`);
      
      let modifiedContent = content;
      let transformationsApplied = 0;
      const elementsModified: string[] = [];
      
      for (const match of elementMatches) {
        if (contentMatch) {
          // Check if this element contains the content we're looking for
          if (match.innerText.includes(contentMatch)) {
            const updatedElement = match.fullMatch.replace(contentMatch, newContent || '');
            modifiedContent = modifiedContent.replace(match.fullMatch, updatedElement);
            transformationsApplied++;
            elementsModified.push(`${part.tag}-content-match`);
          }
        } else {
          // Replace entire inner content
          const updatedElement = match.fullMatch.replace(match.innerText, newContent || '');
          modifiedContent = modifiedContent.replace(match.fullMatch, updatedElement);
          transformationsApplied++;
          elementsModified.push(`${part.tag}-full-replace`);
        }
      }
      
      if (transformationsApplied > 0) {
        return {
          success: true,
          modifiedContent,
          elementsModified,
          transformationsApplied,
          details: `Element-based update on ${part.tag} elements`
        };
      }
    }
  }
  
  return {
    success: false,
    modifiedContent: content,
    elementsModified: [],
    transformationsApplied: 0,
    error: `No elements found matching selector: ${elementSelector}`
  };
}

// Strategy 3: Fuzzy content search
function performFuzzyContentSearch(
  content: string,
  searchText: string,
  newContent: string
): DynamicEditResult {
  
  console.log(`🔍 Performing fuzzy search for: "${searchText}"`);
  
  // Try partial matches
  const words = searchText.split(' ');
  
  for (let i = words.length; i >= Math.max(1, words.length - 2); i--) {
    const partialSearch = words.slice(0, i).join(' ');
    
    if (content.includes(partialSearch)) {
      console.log(`✅ Found partial match: "${partialSearch}"`);
      
      const modifiedContent = content.replace(partialSearch, newContent);
      
      return {
        success: true,
        modifiedContent,
        elementsModified: ['fuzzy-content-match'],
        transformationsApplied: 1,
        details: `Fuzzy match: "${partialSearch}" → "${newContent}"`
      };
    }
  }
  
  return {
    success: false,
    modifiedContent: content,
    elementsModified: [],
    transformationsApplied: 0,
    error: `No fuzzy matches found for: "${searchText}"`
  };
}

// Strategy 4: Semantic content targeting
function performSemanticContentUpdate(
  content: string,
  params: { elementSelector?: string; contentMatch?: string; newContent?: string; context?: string }
): DynamicEditResult {
  
  console.log('🧠 Performing semantic content analysis');
  
  const { newContent, context } = params;
  
  // Identify content types based on context and structure
  const semanticTargets = [
    { pattern: /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi, type: 'heading' },
    { pattern: /<p[^>]*>([^<]+)<\/p>/gi, type: 'paragraph' },
    { pattern: /<span[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+)<\/span>/gi, type: 'bold-text' },
    { pattern: /<a[^>]*>([^<]+)<\/a>/gi, type: 'link-text' },
    { pattern: /<button[^>]*>([^<]+)<\/button>/gi, type: 'button-text' }
  ];
  
  // Determine likely target based on context
  let targetPattern;
  if (context?.includes('button') || context?.includes('CTA')) {
    targetPattern = semanticTargets.find(t => t.type === 'link-text' || t.type === 'button-text');
  } else if (context?.includes('rating') || context?.includes('bold')) {
    targetPattern = semanticTargets.find(t => t.type === 'bold-text');
  } else if (context?.includes('headline') || context?.includes('title')) {
    targetPattern = semanticTargets.find(t => t.type === 'heading');
  } else {
    targetPattern = semanticTargets.find(t => t.type === 'paragraph');
  }
  
  if (targetPattern) {
    const matches = [...content.matchAll(targetPattern.pattern)];
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} semantic targets of type: ${targetPattern.type}`);
      
      // Use the last match (often the most relevant for buttons/CTAs)
      const targetMatch = matches[matches.length - 1];
      const modifiedContent = content.replace(targetMatch[0], targetMatch[0].replace(targetMatch[1], newContent || ''));
      
      return {
        success: true,
        modifiedContent,
        elementsModified: [`semantic-${targetPattern.type}`],
        transformationsApplied: 1,
        details: `Semantic update on ${targetPattern.type}: "${targetMatch[1]}" → "${newContent}"`
      };
    }
  }
  
  return {
    success: false,
    modifiedContent: content,
    elementsModified: [],
    transformationsApplied: 0,
    error: 'No semantic targets found for update'
  };
}

// Helper functions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseElementSelector(selector: string): Array<{tag: string, classes: string[], pattern: string}> {
  const selectors: Array<{tag: string, classes: string[], pattern: string}> = [];
  
  // Handle common selector patterns
  const patterns = [
    selector,
    selector.split('.')[0], // Just the tag
    selector.split(':')[0], // Remove pseudo-selectors
    selector.replace(/\[.*?\]/g, ''), // Remove attribute selectors
  ];
  
  for (const pattern of patterns) {
    if (pattern.includes('.')) {
      const [tag, ...classNames] = pattern.split('.');
      selectors.push({
        tag: tag || 'div',
        classes: classNames,
        pattern: pattern
      });
    } else if (pattern.trim()) {
      selectors.push({
        tag: pattern.trim(),
        classes: [],
        pattern: pattern
      });
    }
  }
  
  return selectors;
}

function findElementsByPattern(content: string, selector: {tag: string, classes: string[], pattern: string}): Array<{fullMatch: string, innerText: string}> {
  const elements: Array<{fullMatch: string, innerText: string}> = [];
  
  // Build regex pattern for the element
  let regexPattern;
  
  if (selector.classes.length > 0) {
    // Match tag with specific classes
    const classPattern = selector.classes.map(cls => `(?=.*\\b${cls}\\b)`).join('');
    regexPattern = new RegExp(`<${selector.tag}[^>]*class="[^"]*${classPattern}[^"]*"[^>]*>([^<]*)<\\/${selector.tag}>`, 'gi');
  } else {
    // Match any element of this tag
    regexPattern = new RegExp(`<${selector.tag}[^>]*>([^<]*)<\\/${selector.tag}>`, 'gi');
  }
  
  let match;
  while ((match = regexPattern.exec(content)) !== null) {
    elements.push({
      fullMatch: match[0],
      innerText: match[1].trim()
    });
  }
  
  return elements;
}

// Alternative approach using ts-morph for TypeScript/JSX content within Astro files
async function transformWithAST(
  content: string,
  filePath: string,
  target: string,
  newContent: string
): Promise<TransformResult> {
  try {
    // Extract any TypeScript/JSX sections from the Astro file
    const scriptMatches = content.match(/---\n([\s\S]*?)\n---/);
    
    if (!scriptMatches) {
      return {
        success: false,
        elementsModified: [],
        transformationsApplied: 0,
        error: 'No script section found in Astro file'
      };
    }

    const scriptContent = scriptMatches[1];
    
    // Create a temporary TypeScript project
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    // Add the script content as a TypeScript file
    const sourceFile = project.createSourceFile('temp.ts', scriptContent);

    let transformationsApplied = 0;
    const elementsModified: string[] = [];

    // Transform string literals that might be text content
    sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach(stringLiteral => {
      const value = stringLiteral.getLiteralValue();
      
      // Simple heuristic: if it looks like display text, replace it
      if (isDisplayText(value, target)) {
        stringLiteral.setLiteralValue(newContent);
        transformationsApplied++;
        elementsModified.push('string-literal');
      }
    });

    if (transformationsApplied > 0) {
      const modifiedScript = sourceFile.getFullText();
      const modifiedContent = content.replace(
        /---\n([\s\S]*?)\n---/,
        `---\n${modifiedScript}\n---`
      );

      return {
        success: true,
        modifiedContent,
        elementsModified,
        transformationsApplied
      };
    }

    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      error: 'No matching content found to transform'
    };

  } catch (error) {
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      error: error instanceof Error ? error.message : 'AST transformation failed'
    };
  }
}

function isDisplayText(value: string, target: string): boolean {
  // Heuristics to determine if a string literal is display text
  const targetLower = target.toLowerCase();
  const valueLower = value.toLowerCase();
  
  // Skip very short strings or code-like strings
  if (value.length < 3 || value.includes('class') || value.includes('id')) {
    return false;
  }
  
  // Check if it matches the target type
  if (targetLower.includes('title') || targetLower.includes('headline')) {
    return value.length > 5 && value.length < 100 && !value.includes(' ');
  }
  
  if (targetLower.includes('description') || targetLower.includes('text')) {
    return value.length > 10 && value.includes(' ');
  }
  
  // Default: consider it display text if it's a reasonable length and has spaces
  return value.length > 3 && value.length < 200;
}

// Helper function to extract actual content for debugging
function extractActualContent(content: string, elementSelector?: string): string[] {
  const foundContent: string[] = [];
  
  try {
    // Extract content based on element selector or common patterns
    if (elementSelector) {
      if (elementSelector.includes('font-bold')) {
        const boldMatches = content.match(/<(?:span|strong|b)[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+)<\/(?:span|strong|b)>/gi);
        if (boldMatches) {
          boldMatches.forEach(match => {
            const textMatch = match.match(/>([^<]+)</);
            if (textMatch) foundContent.push(textMatch[1].trim());
          });
        }
      }
      
      if (elementSelector.includes('h1')) {
        const headingMatches = content.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
        if (headingMatches) {
          headingMatches.forEach(match => {
            const textMatch = match.match(/>([^<]+)</);
            if (textMatch) foundContent.push(textMatch[1].trim());
          });
        }
      }
      
      if (elementSelector.includes('a')) {
        const linkMatches = content.match(/<a[^>]*>([^<]+)<\/a>/gi);
        if (linkMatches) {
          linkMatches.forEach(match => {
            const textMatch = match.match(/>([^<]+)</);
            if (textMatch) foundContent.push(textMatch[1].trim());
          });
        }
      }
    }
    
    // Fallback: extract common content patterns
    if (foundContent.length === 0) {
      // Extract all text content from common elements
      const patterns = [
        /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,
        /<p[^>]*>([^<]+)<\/p>/gi,
        /<span[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+)<\/span>/gi,
        /<a[^>]*>([^<]+)<\/a>/gi
      ];
      
      patterns.forEach(pattern => {
        const matches = [...content.matchAll(pattern)];
        matches.forEach(match => {
          if (match[1] && match[1].trim().length > 0) {
            foundContent.push(match[1].trim());
          }
        });
      });
    }
    
  } catch (error) {
    console.warn('Error extracting content for debugging:', error);
  }
  
  return foundContent.length > 0 ? foundContent : ['No content found'];
}

async function performDirectFileEdit(
  componentName: string,
  instructions: TextEditInstructions
): Promise<TextEditResult> {
  try {
    // Construct file path using direct join import (matches other handler patterns)
    const filePath = join(
      PROJECT_ROOT,
      'rendering',
      'src', 
      'components',
      `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}.astro`
    );

    // Read file using direct readFile import (matches other handler patterns)
    const originalContent = await readFile(filePath, 'utf-8');
    
    console.log(`📖 Direct file edit for ${componentName}`);
    console.log(`📁 File path: ${filePath}`);

    let modifiedContent = originalContent;
    let transformationsApplied = 0;

    // Apply direct content replacement if specified
    if (instructions.contentMatch && instructions.newContent) {
      if (originalContent.includes(instructions.contentMatch)) {
        modifiedContent = modifiedContent.replace(
          new RegExp(escapeRegExp(instructions.contentMatch), 'g'), 
          instructions.newContent
        );
        transformationsApplied++;
        console.log(`✅ Applied direct content replacement`);
      }
    }

    // Write file using direct writeFile import (matches other handler patterns)
    if (transformationsApplied > 0) {
      await writeFile(filePath, modifiedContent, 'utf-8');
      
      return {
        success: true,
        elementsModified: ['direct-file-edit'],
        transformationsApplied,
        filePath,
        details: `Direct file edit completed successfully`
      };
    }

    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath,
      error: 'No modifications applied'
    };

  } catch (error) {
    console.error('❌ Direct file edit error:', error);
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function for precise text replacement in HTML context
function replaceTextInHtmlContext(content: string, searchText: string, newText: string): string {
  // For simple text replacement, ensure we're not breaking HTML structure
  // This is a safe approach for direct text content replacement
  const escapedSearch = escapeRegExp(searchText);
  const regex = new RegExp(escapedSearch, 'g');
  return content.replace(regex, newText);
}

// Helper function to find and replace text within DOM elements
function findAndReplaceTextInDOM(content: string, searchText: string, newText: string): { success: boolean; content: string } {
  try {
    const root = parse(content);
    let found = false;
    
    // Find all text nodes that contain the search text
    function findAndReplaceInNode(node: any): void {
      if (node.nodeType === 3) { // Text node
        if (node.textContent && node.textContent.includes(searchText)) {
          node.textContent = node.textContent.replace(searchText, newText);
          found = true;
        }
      } else if (node.childNodes) {
        node.childNodes.forEach(findAndReplaceInNode);
      }
    }
    
    // Alternative approach: find elements with specific text content
    const textElements = root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, strong, em');
    for (const element of textElements) {
      if (element.textContent && element.textContent.trim() === searchText.trim()) {
        element.innerHTML = newText;
        found = true;
        break; // Stop after first match to avoid multiple replacements
      }
    }
    
    return {
      success: found,
      content: found ? root.toString() : content
    };
  } catch (error) {
    console.error('Error in DOM-based text replacement:', error);
    return { success: false, content };
  }
} 