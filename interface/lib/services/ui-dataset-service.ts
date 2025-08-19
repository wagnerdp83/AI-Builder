import fs from 'fs';
import path from 'path';
import { datasetConfig, COMPONENT_KEYWORDS } from '../config/dataset-config';

export interface UIDatasetEntry {
  messages: [
    { role: 'user'; content: string },
    { role: 'assistant'; content: string }
  ];
}

export interface UIDatasetService {
  loadDataset(): Promise<UIDatasetEntry[]>;
  findSimilarExamples(prompt: string, componentType: string): Promise<UIDatasetEntry[]>;
  getRandomExamples(count: number): Promise<UIDatasetEntry[]>;
}

export class UIDatasetServiceImpl implements UIDatasetService {
  private dataset: UIDatasetEntry[] = [];
  private isLoaded = false;

  async loadDataset(): Promise<UIDatasetEntry[]> {
    if (this.isLoaded) {
      return this.dataset;
    }

    try {
      const datasetPath = path.join(process.cwd(), '..', 'dataset', 'uigen-t1.5-mistral.jsonl');
      const fileContent = await fs.promises.readFile(datasetPath, 'utf-8');
      
      this.dataset = fileContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as UIDatasetEntry);

      this.isLoaded = true;
      console.log(`[UIDatasetService] Loaded ${this.dataset.length} UI examples`);
      return this.dataset;
    } catch (error) {
      console.warn(`[UIDatasetService] Failed to load dataset: ${error}`);
      return [];
    }
  }

  async findSimilarExamples(prompt: string, componentType: string): Promise<UIDatasetEntry[]> {
    await this.loadDataset();
    
    if (this.dataset.length === 0) {
      return [];
    }

    // Enhanced keyword-based similarity search
    const promptLower = prompt.toLowerCase();
    const componentTypeLower = componentType.toLowerCase();
    
    // Get component-specific keywords
    const componentKeywords = this.getComponentKeywords(componentType);
    
    const relevantExamples = this.dataset.filter(entry => {
      const userContent = entry.messages[0].content.toLowerCase();
      const assistantContent = entry.messages[1].content.toLowerCase();
      
      // Check if component type is mentioned in the example
      const hasComponentType = userContent.includes(componentTypeLower) || 
                              assistantContent.includes(componentTypeLower);
      
      // Check for component-specific keywords
      const hasComponentKeywords = componentKeywords.some(keyword => 
        userContent.includes(keyword) || assistantContent.includes(keyword)
      );
      
      // Check for common UI-related keywords
      const hasUIKeywords = userContent.includes('design') || 
                           userContent.includes('create') || 
                           userContent.includes('build') ||
                           userContent.includes('component') ||
                           userContent.includes('section');
      
      return hasComponentType || hasComponentKeywords || hasUIKeywords;
    });

    // Return top examples based on configuration
    return relevantExamples.slice(0, datasetConfig.maxExamplesPerComponent);
  }

  private getComponentKeywords(componentType: string): string[] {
    const normalizedType = componentType.toLowerCase();
    
    // Find matching component keywords
    for (const [key, keywords] of Object.entries(COMPONENT_KEYWORDS)) {
      if (normalizedType.includes(key) || keywords.some(k => normalizedType.includes(k))) {
        return [...keywords]; // Convert readonly array to mutable string[]
      }
    }
    
    // Default keywords for unknown component types
    return ['component', 'section', 'element'];
  }

  async getRandomExamples(count: number): Promise<UIDatasetEntry[]> {
    await this.loadDataset();
    
    if (this.dataset.length === 0) {
      return [];
    }

    const shuffled = [...this.dataset].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.dataset.length));
  }
}

// Singleton instance
export const uiDatasetService = new UIDatasetServiceImpl(); 