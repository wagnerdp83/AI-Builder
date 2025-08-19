import { ComponentName } from './types';
import { readComponentContent } from './component-reader';

interface PropMapping {
  selector: string;
  propName: string;
  description: string;
}

// Define common prop mappings for each component
const componentPropMappings: Record<ComponentName, PropMapping[]> = {
  Hero: [
    { selector: 'h1', propName: 'title', description: 'Main headline text' },
    { selector: '.hero-subtitle', propName: 'subtitle', description: 'Subtitle text' },
    { selector: '.cta-button', propName: 'ctaText', description: 'Call to action button text' },
    { selector: '.hero-image', propName: 'imageSrc', description: 'Hero image source' }
  ],
  Features: [
    { selector: '.features-title', propName: 'sectionTitle', description: 'Features section title' },
    { selector: '.feature-card', propName: 'features', description: 'Array of feature items' },
    { selector: '.feature-icon', propName: 'iconName', description: 'Feature icon name' }
  ],
  Pricing: [
    { selector: '.pricing-title', propName: 'sectionTitle', description: 'Pricing section title' },
    { selector: '.price-card', propName: 'plans', description: 'Array of pricing plans' },
    { selector: '.plan-name', propName: 'planName', description: 'Plan name' },
    { selector: '.plan-price', propName: 'price', description: 'Plan price' }
  ],
  Testimonials: [
    { selector: '.testimonials-title', propName: 'sectionTitle', description: 'Testimonials section title' },
    { selector: '.testimonial-card', propName: 'testimonials', description: 'Array of testimonials' },
    { selector: '.quote-text', propName: 'quote', description: 'Testimonial quote text' },
    { selector: '.author-name', propName: 'author', description: 'Testimonial author name' }
  ],
  Contact: [
    { selector: '.contact-title', propName: 'sectionTitle', description: 'Contact section title' },
    { selector: '.contact-form', propName: 'formFields', description: 'Array of form fields' },
    { selector: '.submit-button', propName: 'submitText', description: 'Submit button text' }
  ],
  Benefits: [
    { selector: '.benefits-title', propName: 'sectionTitle', description: 'Benefits section title' },
    { selector: '.benefit-card', propName: 'benefits', description: 'Array of benefits' },
    { selector: '.benefit-title', propName: 'title', description: 'Benefit title' }
  ],
  FAQ: [
    { selector: '.faq-title', propName: 'sectionTitle', description: 'FAQ section title' },
    { selector: '.faq-item', propName: 'questions', description: 'Array of FAQ items' },
    { selector: '.question-text', propName: 'question', description: 'Question text' },
    { selector: '.answer-text', propName: 'answer', description: 'Answer text' }
  ]
} as const;

export class ComponentPropManager {
  // Infer the prop name from a selector and component content
  async inferPropName(
    selector: string,
    component: ComponentName,
    content?: string
  ): Promise<string | null> {
    // Get component mappings
    const mappings = componentPropMappings[component] || [];
    
    // Try to find exact match
    const exactMatch = mappings.find(m => m.selector === selector);
    if (exactMatch) {
      return exactMatch.propName;
    }

    // If no exact match, try to find similar selectors
    const similarMatch = mappings.find(m => 
      selector.includes(m.selector) || m.selector.includes(selector)
    );
    if (similarMatch) {
      return similarMatch.propName;
    }

    // If still no match and we have content, try to analyze the component
    if (content) {
      return this.analyzeComponentContent(content, selector, component);
    }

    return null;
  }

  // Get all available props for a component
  getComponentProps(component: ComponentName): PropMapping[] {
    return componentPropMappings[component] || [];
  }

  // Analyze component content to infer prop name
  private async analyzeComponentContent(
    content: string,
    selector: string,
    component: ComponentName
  ): Promise<string | null> {
    // Look for prop definitions in the component
    const propMatch = content.match(new RegExp(`(?:interface|type)\\s+${component}Props\\s*{([^}]+)}`));
    if (propMatch) {
      const propsContent = propMatch[1];
      // Extract prop names and try to match with selector
      const propNames = propsContent
        .split(';')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.split(':')[0].trim());

      // Try to find a matching prop name
      return this.findBestPropMatch(propNames, selector) || null;
    }

    return null;
  }

  // Find the best matching prop name for a selector
  private findBestPropMatch(propNames: string[], selector: string): string | null {
    // Remove common CSS prefixes and convert to camelCase
    const normalizedSelector = selector
      .replace(/^[.#]/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    // Try to find exact match
    const exactMatch = propNames.find(prop => 
      prop.toLowerCase() === normalizedSelector.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Try to find partial match
    const partialMatch = propNames.find(prop =>
      prop.toLowerCase().includes(normalizedSelector.toLowerCase()) ||
      normalizedSelector.toLowerCase().includes(prop.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  }

  // Generate alternative prop suggestions
  generatePropSuggestions(
    component: ComponentName,
    targetProp: string
  ): string[] {
    const suggestions: string[] = [];
    const mappings = componentPropMappings[component] || [];

    // Find similar props based on the target
    const similarProps = mappings.filter(m => 
      m.propName.toLowerCase().includes(targetProp.toLowerCase()) ||
      m.description.toLowerCase().includes(targetProp.toLowerCase())
    );

    // Add suggestions based on similar props
    similarProps.forEach(prop => {
      suggestions.push(
        `Use '${prop.propName}' prop (${prop.description})`
      );
    });

    return suggestions;
  }
}