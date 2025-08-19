import { parse, HTMLElement } from 'node-html-parser';

export interface Transformation {
  type: 'replace' | 'update-content' | 'remove';
  query?: string;
  selector?: string;
  replacement?: string;
  newContent?: string;
}

/**
 * Applies a series of transformations to an HTML content string.
 * @param htmlContent The original HTML content.
 * @param transformations An array of transformation objects.
 * @returns An object containing the updated HTML and the number of transformations applied.
 */
export function applyTransformations(htmlContent: string, transformations: Transformation[]): { updatedContent: string; appliedCount: number } {
  let currentContent = htmlContent;
  let appliedCount = 0;

  const root = parse(currentContent);

  for (const transformation of transformations) {
    switch (transformation.type) {
      case 'replace':
        if (transformation.query && transformation.replacement) {
          const regex = new RegExp(escapeRegExp(transformation.query), 'g');
          if (currentContent.includes(transformation.query)) {
            currentContent = currentContent.replace(regex, transformation.replacement);
            appliedCount++;
          }
        }
        break;
      
      case 'remove':
        if (transformation.query) {
          if(currentContent.includes(transformation.query)) {
            currentContent = currentContent.replace(transformation.query, '');
            appliedCount++;
          }
        }
        break;

      case 'update-content':
        if (transformation.selector && transformation.newContent) {
          const element = root.querySelector(transformation.selector);
          if (element) {
            element.set_content(transformation.newContent);
            appliedCount++;
          }
        }
        break;
    }
  }
  
  // If we used node-html-parser, we need to get the string representation
  if (root.childNodes.length > 0 && appliedCount > 0) {
      // Check if any changes were made by node-html-parser specifically
      const wasHtmlParserUsed = transformations.some(t => t.type === 'update-content' && root.querySelector(t.selector!));
      if(wasHtmlParserUsed) {
          currentContent = root.toString();
      }
  }


  return { updatedContent: currentContent, appliedCount };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
} 