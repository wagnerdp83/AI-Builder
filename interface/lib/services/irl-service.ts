import { Mistral } from '@mistralai/mistralai';
import { 
  PageStructure, 
  ComponentDefinition, 
  IRLTransformer, 
  ValidationResult,
  IRL_VALIDATION_SCHEMAS 
} from '../types/intermediate-representation';
import { UserIntent, IntentSlots } from '../types/intent-types';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

export class IRLService implements IRLTransformer {
  
  /**
   * Transform user intent into structured intermediate representation
   */
  fromUserIntent(intent: UserIntent): PageStructure {
    console.log('[IRLService] Transforming user intent to IRL structure');
    
    const slots = intent.slots;
    const sections = slots.sections || ['Hero', 'Features', 'Contact'];
    
    // Create component definitions from sections
    const components: ComponentDefinition[] = sections.map((section, index) => ({
      id: `${section.toLowerCase()}-${index}`,
      type: section,
      name: section,
      props: this.extractComponentProps(section, slots),
      layout_order: index,
      dependencies: this.getComponentDependencies(section),
      content: this.generateComponentContent(section, slots),
      styles: this.generateComponentStyles(section, slots)
    }));
    
    // Create page structure
    const pageStructure: PageStructure = {
      pages: [{
        name: 'Home',
        path: '/',
        layout: 'default',
        components: components,
        seo: this.generateSEOMetadata(slots),
        custom_styles: []
      }],
      global_config: this.generateGlobalConfig(slots),
      navigation: this.generateNavigationConfig(sections),
      theme: this.generateThemeConfig(slots),
      metadata: this.generatePageMetadata(slots)
    };
    
    console.log('[IRLService] IRL structure created with', components.length, 'components');
    return pageStructure;
  }
  
  /**
   * Transform IRL structure back to Astro code
   */
  async toAstroCode(structure: PageStructure, componentName?: string, originalPrompt?: string): Promise<string> {
    console.log('[IRLService] Converting IRL structure to Astro code');
    
    const systemPrompt = `You are an expert Astro developer. Convert the provided component requirements into production-ready Astro components.

IMPORTANT RULES:
1. Generate only the component code, not full pages
2. Use Tailwind CSS for styling
3. Follow Astro best practices
4. Include proper TypeScript types
5. Use only Freepik images or local avatars
6. Make components responsive and accessible
7. FOLLOW THE USER'S SPECIFIC REQUIREMENTS EXACTLY
8. If user specifies layout details (like "left side", "right side"), implement them precisely
9. If user specifies content (like "headline", "sub headline", "reviews stars"), include them
10. If user specifies counts (like "5 avatars", "1.5k Reviews"), implement them

Return ONLY the Astro component code, no explanations.`;

    // Extract the specific component requirements from the original prompt
    const componentRequirements = this.extractComponentRequirements(structure, componentName, originalPrompt);
    
    const userPrompt = `Generate an Astro component based on these specific requirements:

${componentRequirements}

Generate the Astro component code:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 2000
      });

      const generatedCode = response.choices[0]?.message?.content || '';
      console.log('[IRLService] Astro code generated successfully');
      
      return (typeof generatedCode === 'string' ? generatedCode : generatedCode.join('')).replace(/```(astro)?/g, '').trim();
      
    } catch (error) {
      console.error('[IRLService] Error generating Astro code:', error);
      throw new Error('Failed to convert IRL structure to Astro code');
    }
  }
  
  /**
   * Validate IRL structure
   */
  validateStructure(structure: PageStructure): ValidationResult {
    console.log('[IRLService] Validating IRL structure');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validate required fields
    if (!structure.pages || structure.pages.length === 0) {
      errors.push('No pages defined in structure');
    }
    
    if (!structure.global_config) {
      errors.push('Global config is missing');
    }
    
    if (!structure.theme) {
      errors.push('Theme config is missing');
    }
    
    // Validate components
    structure.pages.forEach((page, pageIndex) => {
      if (!page.components || page.components.length === 0) {
        errors.push(`Page ${pageIndex} has no components`);
      }
      
      page.components.forEach((component, compIndex) => {
        if (!component.id || !component.type || !component.name) {
          errors.push(`Component ${compIndex} in page ${pageIndex} is missing required fields`);
        }
        
        if (component.layout_order < 0) {
          warnings.push(`Component ${component.name} has negative layout order`);
        }
        
        // Check for duplicate IDs
        const duplicateIds = page.components.filter(c => c.id === component.id);
        if (duplicateIds.length > 1) {
          errors.push(`Duplicate component ID: ${component.id}`);
        }
      });
    });
    
    // Validate theme configuration
    if (structure.theme) {
      if (!structure.theme.colors || !structure.theme.colors.primary) {
        warnings.push('Theme colors are incomplete');
      }
      
      if (!structure.theme.typography) {
        warnings.push('Typography configuration is missing');
      }
    }
    
    // Generate suggestions
    if (structure.pages.length === 1 && structure.pages[0].components.length < 3) {
      suggestions.push('Consider adding more sections for a complete landing page');
    }
    
    if (!structure.navigation || !structure.navigation.main_menu) {
      suggestions.push('Add navigation menu for better user experience');
    }
    
    const isValid = errors.length === 0;
    
    console.log('[IRLService] Validation complete:', {
      isValid,
      errors: errors.length,
      warnings: warnings.length,
      suggestions: suggestions.length
    });
    
    return {
      isValid,
      errors,
      warnings,
      suggestions
    };
  }
  
  /**
   * Merge existing structure with updates
   */
  mergeStructures(existing: PageStructure, updates: Partial<PageStructure>): PageStructure {
    console.log('[IRLService] Merging IRL structures');
    
    const merged: PageStructure = {
      ...existing,
      ...updates,
      pages: updates.pages || existing.pages,
      global_config: { ...existing.global_config, ...updates.global_config },
      navigation: { ...existing.navigation, ...updates.navigation },
      theme: { ...existing.theme, ...updates.theme },
      metadata: { ...existing.metadata, ...updates.metadata }
    };
    
    // Merge components within pages
    if (updates.pages) {
      merged.pages = merged.pages.map((page, index) => {
        const updatePage = updates.pages?.[index];
        if (updatePage) {
          return {
            ...page,
            ...updatePage,
            components: updatePage.components || page.components
          };
        }
        return page;
      });
    }
    
    console.log('[IRLService] Structures merged successfully');
    return merged;
  }
  
  /**
   * Extract component-specific props from intent slots
   */
  private extractComponentProps(section: string, slots: IntentSlots): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Add business type if available
    if (slots.business_type) {
      props.businessType = slots.business_type;
    }
    
    // Add theme if available
    if (slots.theme) {
      props.theme = slots.theme;
    }
    
    // Add colors if available
    if (slots.colors && slots.colors.length > 0) {
      props.colors = slots.colors;
    }
    
    // Add section-specific props
    switch (section.toLowerCase()) {
      case 'hero':
        props.hasCallToAction = true;
        props.heroType = 'standard';
        break;
      case 'features':
        props.featureCount = 3;
        props.layout = 'grid';
        break;
      case 'testimonials':
        props.testimonialCount = 3;
        props.layout = 'carousel';
        break;
      case 'contact':
        props.hasForm = true;
        props.hasMap = false;
        break;
    }
    
    return props;
  }
  
  /**
   * Get component dependencies
   */
  private getComponentDependencies(section: string): string[] {
    const dependencies: string[] = [];
    
    switch (section.toLowerCase()) {
      case 'hero':
        dependencies.push('image-service');
        break;
      case 'testimonials':
        dependencies.push('avatar-service');
        break;
      case 'contact':
        dependencies.push('form-validation');
        break;
    }
    
    return dependencies;
  }
  
  /**
   * Generate component content
   */
  private generateComponentContent(section: string, slots: IntentSlots): any {
    const content: any = {};
    
    switch (section.toLowerCase()) {
      case 'hero':
        content.text = [
          'Welcome to our amazing platform',
          'Discover the best solutions for your needs'
        ];
        content.images = [{
          src: '__MOCKUP_IMAGE_PATH__',
          alt: 'Hero image',
          width: 600,
          height: 400
        }];
        break;
      case 'features':
        content.text = [
          'Feature 1: Amazing functionality',
          'Feature 2: Incredible performance',
          'Feature 3: Outstanding quality'
        ];
        break;
      case 'testimonials':
        content.text = [
          'Great experience with this service!',
          'Highly recommended for everyone',
          'Exceeded all my expectations'
        ];
        content.images = [{
          src: '__AVATAR_IMAGE_PATH__',
          alt: 'Customer avatar',
          width: 60,
          height: 60
        }];
        break;
    }
    
    return content;
  }
  
  /**
   * Generate component styles
   */
  private generateComponentStyles(section: string, slots: IntentSlots): any {
    const styles: any = {
      classes: []
    };
    
    // Add theme-based classes
    if (slots.theme) {
      styles.classes.push(`theme-${slots.theme}`);
    }
    
    // Add color-based classes
    if (slots.colors && slots.colors.length > 0) {
      styles.classes.push(`colors-${slots.colors.join('-')}`);
    }
    
    // Add section-specific classes
    switch (section.toLowerCase()) {
      case 'hero':
        styles.classes.push('hero-section', 'bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
        break;
      case 'features':
        styles.classes.push('features-section', 'py-16', 'bg-gray-50');
        break;
      case 'testimonials':
        styles.classes.push('testimonials-section', 'py-16', 'bg-white');
        break;
      case 'contact':
        styles.classes.push('contact-section', 'py-16', 'bg-gray-100');
        break;
    }
    
    return styles;
  }
  
  /**
   * Generate SEO metadata
   */
  private generateSEOMetadata(slots: IntentSlots): any {
    return {
      title: slots.business_type ? `${slots.business_type} - Home` : 'Welcome to our site',
      description: 'Discover amazing features and services',
      keywords: slots.business_type ? [slots.business_type, 'services', 'quality'] : ['services', 'quality'],
      canonical_url: '/',
      og_title: slots.business_type ? `${slots.business_type} - Home` : 'Welcome to our site',
      og_description: 'Discover amazing features and services',
      og_image: '__MOCKUP_IMAGE_PATH__'
    };
  }
  
  /**
   * Generate global configuration
   */
  private generateGlobalConfig(slots: IntentSlots): any {
    return {
      site_name: slots.business_type ? `${slots.business_type} Site` : 'My Website',
      site_description: 'Amazing website with great features',
      base_url: 'https://example.com',
      language: 'en',
      charset: 'UTF-8',
      viewport: 'width=device-width, initial-scale=1',
      robots: 'index, follow'
    };
  }
  
  /**
   * Generate navigation configuration
   */
  private generateNavigationConfig(sections: string[]): any {
    const menuItems = sections.map(section => ({
      label: section,
      href: `#${section.toLowerCase()}`,
      external: false
    }));
    
    return {
      main_menu: menuItems,
      footer_links: [
        { label: 'Home', href: '/', external: false },
        { label: 'About', href: '/about', external: false },
        { label: 'Contact', href: '/contact', external: false }
      ],
      breadcrumbs: true,
      mobile_menu: true
    };
  }
  
  /**
   * Generate theme configuration
   */
  private generateThemeConfig(slots: IntentSlots): any {
    const colors = slots.colors && slots.colors.length > 0 ? slots.colors : ['blue', 'gray'];
    
    return {
      name: slots.theme || 'modern',
      colors: {
        primary: colors,
        secondary: ['gray', 'white'],
        accent: ['yellow', 'orange'],
        neutral: ['gray', 'black', 'white'],
        success: ['green'],
        warning: ['yellow'],
        error: ['red']
      },
      typography: {
        font_family: 'Inter',
        font_sizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        },
        font_weights: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        },
        line_heights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        }
      },
      spacing: {
        scale: {
          0: '0',
          1: '0.25rem',
          2: '0.5rem',
          4: '1rem',
          8: '2rem',
          16: '4rem'
        },
        container_padding: '1rem',
        section_spacing: '4rem'
      },
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },
      dark_mode: false
    };
  }
  
  /**
   * Extract specific component requirements from the original user prompt
   * Now uses LLM-based intelligent parsing instead of rigid switch-case
   */
  async extractComponentRequirements(structure: PageStructure, componentName?: string, originalPrompt?: string): Promise<string> {
    // Get the original prompt from metadata if available
    const originalPromptFromStructure = structure.metadata?.raw_prompt || 'Create a component';
    
    // Use the original prompt from the structure if available, otherwise use the provided one
    const promptToParse = originalPrompt || originalPromptFromStructure;

    // Use the new LLM-based requirements parser
    const { RequirementsAgent } = await import('../agents/requirements-agent');
    const requirementsAgent = new RequirementsAgent();
    
    const result = await requirementsAgent.parseWithMultipleStrategies(promptToParse, componentName);
    
    // Convert the structured requirements back to the expected string format
    const requirements = this.formatRequirementsForBackwardCompatibility(result.requirements, componentName);
    
    console.log('[IRLService] LLM-based requirements extracted:', {
      componentName,
      confidence: result.confidence,
      usedRAG: result.usedRAG
    });
    
    return requirements;
  }

  /**
   * Format requirements for backward compatibility with existing pipeline
   */
  private formatRequirementsForBackwardCompatibility(requirements: any, componentName?: string): string {
    const formattedRequirements: string[] = [];
    
    if (componentName) {
      formattedRequirements.push(`${componentName} Component Requirements:`);
    }
    
    // Format layout requirements
    if (requirements.layout) {
      const layout = requirements.layout;
      if (layout.contentPosition && layout.imagePosition) {
        formattedRequirements.push(`- Layout: Content on ${layout.contentPosition.toUpperCase()} side, image on ${layout.imagePosition.toUpperCase()} side`);
      } else if (layout.contentPosition) {
        formattedRequirements.push(`- Layout: Content on ${layout.contentPosition.toUpperCase()} side`);
      }
    }
    
    // Format content requirements
    if (requirements.content) {
      const content = requirements.content;
      
      if (content.elements) {
        content.elements.forEach((element: string) => {
          formattedRequirements.push(`- Content: Include ${element}`);
        });
      }
      
      if (content.counts) {
        Object.entries(content.counts).forEach(([key, value]) => {
          formattedRequirements.push(`- Content: Include ${value} ${key}`);
        });
      }
      
      if (content.text) {
        Object.entries(content.text).forEach(([key, value]) => {
          formattedRequirements.push(`- Content: Include "${value}" for ${key}`);
        });
      }
    }
    
    // Format styling requirements
    if (requirements.styling) {
      const styling = requirements.styling;
      if (styling.theme) {
        formattedRequirements.push(`- Styling: Use ${styling.theme} theme`);
      }
      if (styling.colors) {
        formattedRequirements.push(`- Styling: Use colors: ${styling.colors.join(', ')}`);
      }
    }
    
    return formattedRequirements.join('\n');
  }
  
  /**
   * Parse component requirements from user prompt
   * NOW FULLY LLM-BASED - No more rigid switch-case logic
   */
  private parseComponentRequirements(prompt: string, componentName?: string): string {
    // This method is now deprecated in favor of LLM-based parsing
    // The actual parsing is handled by RequirementsAgent in extractComponentRequirements
    
    console.log('[IRLService] Using LLM-based parsing for all components');
    
    // For backward compatibility, return a basic structure
    // The real parsing happens in the RequirementsAgent
    if (componentName) {
      return `${componentName} Component Requirements:\n- Create a ${componentName} component based on user specifications`;
    } else {
      return `General Requirements:\n- ${prompt}`;
    }
  }
  
  /**
   * Extract detailed requirements for a specific component
   * DEPRECATED: Now handled by LLM-based RequirementsAgent
   * This method is kept for backward compatibility but no longer used
   */
  private extractComponentDetails(componentName: string, prompt: string): string {
    console.log('[IRLService] extractComponentDetails deprecated - using LLM-based parsing');
    
    // This method is no longer used - all parsing is now handled by RequirementsAgent
    // which can handle ANY component type, not just predefined ones
    
    return `- Create ${componentName} component based on user specifications`;
  }
  
  /**
   * Generate page metadata
   */
  private generatePageMetadata(slots: IntentSlots): any {
    return {
      title: slots.business_type ? `${slots.business_type} - Home` : 'Welcome to our site',
      description: 'Discover amazing features and services',
      keywords: slots.business_type ? [slots.business_type, 'services', 'quality'] : ['services', 'quality'],
      og_image: '__MOCKUP_IMAGE_PATH__',
      twitter_card: 'summary_large_image'
    };
  }
} 