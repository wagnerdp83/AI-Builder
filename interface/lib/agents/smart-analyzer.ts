export interface ComponentAnalysis {
  component: string;
  elements: ElementInfo[];
  structure: StructureInfo;
  editableContent: EditableContent[];
  suggestions: string[];
}

export interface ElementInfo {
  type: 'heading' | 'paragraph' | 'button' | 'link' | 'image' | 'rating' | 'other';
  selector: string;
  content: string;
  position: number;
  context: string;
}

export interface StructureInfo {
  totalElements: number;
  headings: number;
  buttons: number;
  paragraphs: number;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface EditableContent {
  id: string;
  description: string;
  currentValue: string;
  suggestedSelectors: string[];
  contentType: string;
}

export async function analyzeComponent(componentPath: string): Promise<ComponentAnalysis> {
  const { readFile } = await import('fs/promises');
  
  try {
    const content = await readFile(componentPath, 'utf-8');
    const component = extractComponentName(componentPath);
    
    // Extract all editable elements
    const elements = extractElements(content);
    const structure = analyzeStructure(elements);
    const editableContent = identifyEditableContent(elements);
    const suggestions = generateSuggestions(elements, structure);
    
    return {
      component,
      elements,
      structure,
      editableContent,
      suggestions
    };
    
  } catch (error) {
    console.error('Component analysis failed:', error);
    return {
      component: 'unknown',
      elements: [],
      structure: { totalElements: 0, headings: 0, buttons: 0, paragraphs: 0, complexity: 'simple' },
      editableContent: [],
      suggestions: ['Component analysis failed - check file path']
    };
  }
}

function extractComponentName(filePath: string): string {
  const match = filePath.match(/\/([^/]+)\.astro$/);
  return match ? match[1].toLowerCase() : 'unknown';
}

function extractElements(content: string): ElementInfo[] {
  const elements: ElementInfo[] = [];
  let position = 0;
  
  // Extract headings
  const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    elements.push({
      type: 'heading',
      selector: `h${match[1]}`,
      content: match[2].trim(),
      position: position++,
      context: `H${match[1]} heading`
    });
  }
  
  // Extract paragraphs
  const paragraphRegex = /<p[^>]*>([^<]+)<\/p>/gi;
  while ((match = paragraphRegex.exec(content)) !== null) {
    if (match[1].trim().length > 5) { // Ignore very short paragraphs
      elements.push({
        type: 'paragraph',
        selector: 'p',
        content: match[1].trim(),
        position: position++,
        context: 'Paragraph text'
      });
    }
  }
  
  // Extract buttons and links
  const linkRegex = /<a[^>]*>([^<]+)<\/a>/gi;
  while ((match = linkRegex.exec(content)) !== null) {
    if (match[1].trim().length > 0) {
      elements.push({
        type: 'button',
        selector: 'a',
        content: match[1].trim(),
        position: position++,
        context: 'Button/Link text'
      });
    }
  }
  
  // Extract bold/emphasized text (often ratings, prices, etc.)
  const boldRegex = /<(?:span|strong|b)[^>]*class="[^"]*font-bold[^"]*"[^>]*>([^<]+)<\/(?:span|strong|b)>/gi;
  while ((match = boldRegex.exec(content)) !== null) {
    if (match[1].trim().length > 0) {
      elements.push({
        type: 'rating',
        selector: 'span.font-bold',
        content: match[1].trim(),
        position: position++,
        context: 'Bold text (rating/emphasis)'
      });
    }
  }
  
  return elements;
}

function analyzeStructure(elements: ElementInfo[]): StructureInfo {
  const headings = elements.filter(e => e.type === 'heading').length;
  const buttons = elements.filter(e => e.type === 'button').length;
  const paragraphs = elements.filter(e => e.type === 'paragraph').length;
  const totalElements = elements.length;
  
  let complexity: 'simple' | 'medium' | 'complex';
  if (totalElements <= 5) complexity = 'simple';
  else if (totalElements <= 15) complexity = 'medium';
  else complexity = 'complex';
  
  return {
    totalElements,
    headings,
    buttons,
    paragraphs,
    complexity
  };
}

function identifyEditableContent(elements: ElementInfo[]): EditableContent[] {
  return elements.map((element, index) => ({
    id: `edit-${index}`,
    description: `${element.context}: "${element.content.substring(0, 30)}${element.content.length > 30 ? '...' : ''}"`,
    currentValue: element.content,
    suggestedSelectors: generateSelectors(element),
    contentType: element.type
  }));
}

function generateSelectors(element: ElementInfo): string[] {
  const selectors = [element.selector];
  
  // Add more specific selectors based on element type
  switch (element.type) {
    case 'heading':
      selectors.push(`${element.selector}:first-of-type`, `${element.selector}:last-of-type`);
      break;
    case 'button':
      selectors.push('a:first-of-type', 'a:last-of-type', 'a:nth-of-type(2)');
      break;
    case 'rating':
      selectors.push('span.font-bold:first-of-type', '.font-bold');
      break;
  }
  
  return selectors;
}

function generateSuggestions(elements: ElementInfo[], structure: StructureInfo): string[] {
  const suggestions: string[] = [];
  
  // Content-based suggestions
  if (structure.headings > 0) {
    suggestions.push('💡 Try: "update headline to [new text]"');
  }
  
  if (structure.buttons > 1) {
    suggestions.push('💡 Try: "update first button to [text]" or "update second button to [text]"');
  } else if (structure.buttons === 1) {
    suggestions.push('💡 Try: "update button text to [new text]"');
  }
  
  const ratingElements = elements.filter(e => e.type === 'rating');
  if (ratingElements.length > 0) {
    suggestions.push('💡 Try: "update rating to [number]"');
  }
  
  if (structure.paragraphs > 0) {
    suggestions.push('💡 Try: "update description to [new text]"');
  }
  
  // Complexity-based suggestions
  if (structure.complexity === 'complex') {
    suggestions.push('💡 For complex components, be specific: "update hero section headline" instead of just "update headline"');
  }
  
  return suggestions;
}

export async function getComponentSuggestions(componentName: string): Promise<string[]> {
  const { join } = await import('path');
  const PROJECT_ROOT = process.cwd().replace('/interface', '');
  const componentPath = join(PROJECT_ROOT, 'rendering', 'src', 'components', `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}.astro`);
  
  const analysis = await analyzeComponent(componentPath);
  return analysis.suggestions;
} 