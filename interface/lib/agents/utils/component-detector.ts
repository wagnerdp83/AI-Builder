import { getComponentsDir } from '../../utils/directory';
import { promises as fs } from 'fs';

export class ComponentDetector {
  static async detectFromPrompt(prompt: string, availableComponents: string[]): Promise<string | null> {
    // Try to find an exact match first (e.g., "Hero.astro")
    const componentFileMatch = prompt.match(/\b([A-Z][a-zA-Z0-9]+)\.astro\b/);
    if (componentFileMatch && availableComponents.includes(componentFileMatch[1])) {
      return componentFileMatch[1];
    }
    
    // Try to find a component name mentioned with context words (e.g., "the Hero component")
    const nameMatch = prompt.match(/\b(component|section)\s+([A-Z][a-zA-Z0-9]+)\b/i);
    if (nameMatch) {
      const componentName = nameMatch[2];
      const matchedComp = availableComponents.find(c => c.toLowerCase() === componentName.toLowerCase());
      if (matchedComp) return matchedComp;
    }

    // Look for any available component names mentioned in the prompt
    const mentionedComponents = availableComponents.filter(comp => 
      new RegExp(`\\b${comp}\\b`, 'i').test(prompt)
    );

    if (mentionedComponents.length === 1) {
      return mentionedComponents[0];
    }
    
    if (mentionedComponents.length > 1) {
      console.log(`Multiple components mentioned: ${mentionedComponents.join(', ')}. The agent will decide which one to use.`);
      return null; // It's ambiguous, so we let the agent decide.
    }

    // If no component is clearly detected, return null and let the agent decide.
    return null;
  }

  static async readComponentContent(component: string): Promise<string> {
    try {
      const componentPath = getComponentsDir(`${component}.astro`);
      const content = await fs.readFile(componentPath, 'utf-8');
      return content;
    } catch (error) {
      console.warn(`⚠️ Could not read component ${component}. It may not exist yet.`);
      return '';
    }
  }
} 