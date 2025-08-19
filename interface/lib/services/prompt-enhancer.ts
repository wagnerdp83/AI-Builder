import { uiDatasetService, UIDatasetEntry } from './ui-dataset-service';

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  examplesUsed: number;
}

export class PromptEnhancer {
  /**
   * Enhances a component generation prompt with relevant UI examples from the dataset
   */
  static async enhanceComponentPrompt(
    componentName: string, 
    originalPrompt: string
  ): Promise<EnhancedPrompt> {
    try {
      // Find similar examples from the dataset
      let similarExamples = await uiDatasetService.findSimilarExamples(originalPrompt, componentName);
      
      // Fallback to random examples if no similar ones found and fallback is enabled
      if (similarExamples.length === 0) {
        console.log(`[PromptEnhancer] No similar examples found for ${componentName}, trying fallback...`);
        similarExamples = await uiDatasetService.getRandomExamples(2);
        
        if (similarExamples.length === 0) {
          console.log(`[PromptEnhancer] No examples available in dataset for ${componentName}`);
          return {
            originalPrompt,
            enhancedPrompt: originalPrompt,
            examplesUsed: 0
          };
        }
      }

      // Build enhanced prompt with examples
      const enhancedPrompt = this.buildEnhancedPrompt(componentName, originalPrompt, similarExamples);
      
      console.log(`[PromptEnhancer] Enhanced prompt for ${componentName} with ${similarExamples.length} examples`);
      
      return {
        originalPrompt,
        enhancedPrompt,
        examplesUsed: similarExamples.length
      };
    } catch (error) {
      console.warn(`[PromptEnhancer] Error enhancing prompt: ${error}`);
      return {
        originalPrompt,
        enhancedPrompt: originalPrompt,
        examplesUsed: 0
      };
    }
  }

  private static buildEnhancedPrompt(
    componentName: string, 
    originalPrompt: string, 
    examples: UIDatasetEntry[]
  ): string {
    const examplesSection = examples.map((example, index) => {
      const userPrompt = example.messages[0].content;
      const htmlResponse = example.messages[1].content;
      
      // Convert HTML to Astro guidance
      const astroGuidance = this.convertHtmlToAstroGuidance(htmlResponse);
      
      return `EXAMPLE ${index + 1}:
User Request: ${userPrompt}
Astro Implementation Guidance: ${astroGuidance}
---`;
    }).join('\n\n');

    return `${originalPrompt}

IMPORTANT: Use the following UI examples as reference for design patterns and structure. 
Convert any HTML patterns to proper Astro syntax with Tailwind CSS and Preline UI components.

${examplesSection}

Remember to:
1. Use Astro syntax (not plain HTML)
2. Apply Tailwind CSS classes for styling
3. Use Preline UI components where appropriate
4. Keep the component atomic (single section only)
5. Follow the original user requirements above`;
  }

  private static convertHtmlToAstroGuidance(htmlContent: string): string {
    // Extract key design patterns and convert to Astro guidance
    let guidance = htmlContent;
    
    // Convert common HTML patterns to Astro guidance
    guidance = guidance
      // Convert class attributes to Tailwind guidance
      .replace(/class="([^"]*)"/g, 'Use Tailwind classes: $1')
      // Convert div patterns to semantic HTML guidance
      .replace(/<div([^>]*)>/g, 'Consider using semantic HTML tags like <section>, <header>, <nav> instead of <div>')
      // Convert button patterns
      .replace(/<button([^>]*)>/g, 'Use Preline UI button components or semantic <button> with Tailwind classes')
      // Convert form patterns
      .replace(/<form([^>]*)>/g, 'Use Astro form handling with proper action and method attributes')
      // Convert image patterns
      .replace(/<img([^>]*)>/g, 'Use Astro Image component or <img> with proper alt attributes')
      // Remove HTML tags and keep content
      .replace(/<[^>]*>/g, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return guidance;
  }

  /**
   * Gets random examples for general UI inspiration
   */
  static async getRandomExamples(count: number = 2): Promise<string> {
    try {
      const examples = await uiDatasetService.getRandomExamples(count);
      
      if (examples.length === 0) {
        return '';
      }

      return examples.map((example, index) => {
        const userPrompt = example.messages[0].content;
        const astroGuidance = this.convertHtmlToAstroGuidance(example.messages[1].content);
        
        return `GENERAL EXAMPLE ${index + 1}:
Request: ${userPrompt}
Guidance: ${astroGuidance}`;
      }).join('\n\n');
    } catch (error) {
      console.warn(`[PromptEnhancer] Error getting random examples: ${error}`);
      return '';
    }
  }
} 