import { clientProjects } from './project-settings.json';

// Define the structure of a parsed prompt
interface ParsedPrompt {
  component: string;
  method: 'edit' | 'modify' | 'change' | 'update';
  target: string;
  action: string;
}

// List of supported components
const supportedComponents = clientProjects[0].elements.map(element => element.toLowerCase());


// List of keywords that trigger the edit method
const editKeywords = ['edit', 'modify', 'change', 'update'];

/**
 * Parses a user prompt to extract the component, method, target, and action.
 * @param prompt - The user's input string.
 * @returns A ParsedPrompt object or null if the prompt is invalid.
 */
export function parsePrompt(prompt: string): ParsedPrompt | null {
  const words = prompt.toLowerCase().split(' ');
  const keyword = words.find(word => editKeywords.includes(word));

  if (!keyword) {
    return null; // Not an edit command
  }

  const component = words.find(word => supportedComponents.includes(word));
  if (!component) {
    return null; // No supported component found
  }

  // Extract the target and action from the prompt
  // This is a simplified implementation. A more robust solution would use NLP.
  const keywordIndex = words.indexOf(keyword);
  const componentIndex = words.indexOf(component);
  const targetAndActionIndex = Math.max(keywordIndex, componentIndex) + 1;

  if (targetAndActionIndex >= words.length) {
    return null; // Incomplete prompt
  }
  
  // Example: "edit hero headline to new text"
  // target: "headline"
  // action: "to new text"
  const remainingWords = words.slice(targetAndActionIndex);
  const toIndex = remainingWords.indexOf('to');
  
  let target: string;
  let action: string;

  if (toIndex !== -1) {
    target = remainingWords.slice(0, toIndex).join(' ');
    action = remainingWords.slice(toIndex + 1).join(' '); // "new text"
  } else {
    // Handle cases without "to", e.g., "change hero button link /contact"
    target = remainingWords[0];
    action = remainingWords.slice(1).join(' ');
  }


  if (!target || !action) {
    return null; // Not enough information
  }

  return {
    component,
    method: keyword as ParsedPrompt['method'],
    target,
    action,
  };
} 