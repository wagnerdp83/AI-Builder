import { TestResult, TestRequest, ComponentName, ToolDecision } from './types';
import { TEST_CONFIG } from './config';
import { logTestActivity } from './logging';
import { readComponentContent } from './component-reader';
import { ComponentPropManager } from './component-props';

interface RefinementStrategy {
  name: string;
  description: string;
  priority: number;
  canHandle: (error: string) => boolean;
  generateRefinedRequest: (
    originalRequest: TestRequest,
    error: string,
    componentContent: string,
    propManager: ComponentPropManager
  ) => Promise<TestRequest>;
}

interface AmbiguityContext {
  type: 'name' | 'link' | 'section' | 'text' | 'element';
  found: string[];
  request: string;
  component: ComponentName;
}

interface ClarificationPrompt {
  question: string;
  options: string[];
  context: string;
}

export class RefinementLoop {
  private propManager: ComponentPropManager;
  private ambiguityPatterns = {
    name: /(?:name|author|person)/i,
    link: /(?:link|url|href)/i,
    text: /(?:text|content|message)/i,
    section: /(?:section|block|area)/i
  };

  constructor() {
    this.propManager = new ComponentPropManager();
  }

  private strategies: RefinementStrategy[] = [
    {
      name: 'ambiguity-resolution',
      description: 'Detect and resolve ambiguous requests',
      priority: 0, // Highest priority - check this first
      canHandle: (error) => error.includes('ambiguous') || error.includes('multiple matches') || error.includes('not specific'),
      generateRefinedRequest: async (request, error, content, propManager) => {
        const ambiguity = await this.detectAmbiguity(request, content);
        if (ambiguity) {
          const clarification = this.generateClarificationPrompt(ambiguity);
          return {
            ...request,
            needsClarification: true,
            clarificationPrompt: clarification
          };
        }
        return request;
      }
    },
    {
      name: 'prop-based-update',
      description: 'Attempt to update component using props instead of direct content modification',
      priority: 1,
      canHandle: (error) => error.includes('selector') || error.includes('not found'),
      generateRefinedRequest: async (request, error, content, propManager) => {
        // Convert direct content updates to prop-based updates
        const refinedRequest = { ...request };
        if (request.instructions.elementSelector) {
          const propName = await propManager.inferPropName(
            request.instructions.elementSelector,
            request.component,
            content
          );

          if (propName) {
            refinedRequest.instructions = {
              ...request.instructions,
              usePropUpdate: true,
              propName,
              operation: 'prop-update'
            };
            logTestActivity(
              request.id,
              'info',
              `Found matching prop '${propName}' for selector '${request.instructions.elementSelector}'`
            );
          } else {
            // If no prop found, get suggestions
            const suggestions = propManager.generatePropSuggestions(
              request.component,
              request.instructions.elementSelector
            );
            logTestActivity(
              request.id,
              'info',
              'No exact prop match found, generated suggestions',
              suggestions
            );
          }
        }
        return refinedRequest;
      }
    },
    {
      name: 'alternative-selector',
      description: 'Try alternative selectors to find the target element',
      priority: 2,
      canHandle: (error) => error.includes('selector') || error.includes('not found'),
      generateRefinedRequest: async (request, error, content, propManager) => {
        const refinedRequest = { ...request };
        if (request.instructions.elementSelector) {
          // Get component props to help generate alternative selectors
          const props = propManager.getComponentProps(request.component);
          const alternatives = props
            .filter(p => p.description.toLowerCase().includes(request.description.toLowerCase()))
            .map(p => p.selector);

          if (alternatives.length > 0) {
            refinedRequest.instructions = {
              ...request.instructions,
              elementSelector: alternatives[0], // Use first alternative
              alternativeSelectors: alternatives.slice(1) // Store others as backups
            };
            logTestActivity(
              request.id,
              'info',
              `Found alternative selectors`,
              alternatives
            );
          }
        }
        return refinedRequest;
      }
    },
    {
      name: 'component-state',
      description: 'Update component state instead of direct DOM manipulation',
      priority: 3,
      canHandle: (error) => error.includes('state') || error.includes('reactive'),
      generateRefinedRequest: async (request, error, content, propManager) => {
        const refinedRequest = { ...request };
        const props = propManager.getComponentProps(request.component);
        
        // Find state-related props
        const stateProp = props.find(p => 
          p.description.toLowerCase().includes('state') ||
          p.description.toLowerCase().includes('data')
        );

        if (stateProp) {
          refinedRequest.instructions = {
            ...request.instructions,
            useStateUpdate: true,
            stateName: stateProp.propName
          };
          logTestActivity(
            request.id,
            'info',
            `Found state prop '${stateProp.propName}'`
          );
        }
        return refinedRequest;
      }
    },
    {
      name: 'partial-match',
      description: 'Try to find closest matching element when exact match fails',
      priority: 4,
      canHandle: (error) => error.includes('exact match'),
      generateRefinedRequest: async (request, error, content, propManager) => {
        const refinedRequest = { ...request };
        refinedRequest.instructions = {
          ...request.instructions,
          usePartialMatch: true,
          similarityThreshold: 0.8
        };
        return refinedRequest;
      }
    }
  ];

  private alternativeSuggestions: Map<ComponentName, string[]> = new Map([
    ['Hero', ['Update the main message', 'Modify the call-to-action', 'Change the background']],
    ['Features', ['Add a new feature', 'Reorder features', 'Update feature descriptions']],
    ['Pricing', ['Modify plan details', 'Update pricing tiers', 'Change feature lists']],
    // Add more component-specific alternatives
  ]);

  private async detectAmbiguity(request: TestRequest, content: string): Promise<AmbiguityContext | null> {
    const { description, component } = request;

    // Check for name ambiguity
    if (this.ambiguityPatterns.name.test(description)) {
      const names = await this.findAllNames(content, component);
      if (names.length > 1) {
        return {
          type: 'name',
          found: names,
          request: description,
          component
        };
      }
    }

    // Check for link ambiguity
    if (this.ambiguityPatterns.link.test(description)) {
      const links = await this.findAllLinks(content, component);
      if (links.length > 1) {
        return {
          type: 'link',
          found: links,
          request: description,
          component
        };
      }
    }

    // Check for section ambiguity
    if (this.ambiguityPatterns.section.test(description)) {
      const sections = await this.findAllSections(content, component);
      if (sections.length > 1) {
        return {
          type: 'section',
          found: sections,
          request: description,
          component
        };
      }
    }

    return null;
  }

  private generateClarificationPrompt(context: AmbiguityContext): ClarificationPrompt {
    switch (context.type) {
      case 'name':
        return {
          question: 'I found multiple names in this component. Which one would you like to update?',
          options: context.found,
          context: `In the ${context.component} component, I found these names: ${context.found.join(', ')}. 
                   Please specify which one you'd like to change.`
        };
      case 'link':
        return {
          question: 'There are multiple links in this component. Which one should be updated?',
          options: context.found,
          context: `The ${context.component} component contains these links: ${context.found.join(', ')}. 
                   Please specify which link you want to modify.`
        };
      case 'section':
        return {
          question: 'I found multiple sections. Which section should be modified?',
          options: context.found,
          context: `The ${context.component} has these sections: ${context.found.join(', ')}. 
                   Please indicate which section you're referring to.`
        };
      default:
        return {
          question: 'Could you please be more specific about what you want to change?',
          options: context.found,
          context: `I found multiple possible matches in the ${context.component} component: ${context.found.join(', ')}`
        };
    }
  }

  private async findAllNames(content: string, component: ComponentName): Promise<string[]> {
    // Example implementation - customize based on your component structure
    const names: string[] = [];
    
    // Look for author names in testimonials
    if (component === 'Testimonials') {
      const authorMatches = content.match(/author["\s:]+([^"'\n,]+)/gi);
      if (authorMatches) {
        names.push(...authorMatches.map(m => m.replace(/author["\s:]+/i, '').trim()));
      }
    }

    // Look for person names in team/about sections
    if (component === 'Team' || component === 'About') {
      const nameMatches = content.match(/name["\s:]+([^"'\n,]+)/gi);
      if (nameMatches) {
        names.push(...nameMatches.map(m => m.replace(/name["\s:]+/i, '').trim()));
      }
    }

    return names;
  }

  private async findAllLinks(content: string, component: ComponentName): Promise<string[]> {
    const links: string[] = [];
    
    // Find href attributes
    const hrefMatches = content.match(/href=["']([^"']+)["']/g);
    if (hrefMatches) {
      links.push(...hrefMatches.map(m => m.replace(/href=["']/i, '').replace(/["']$/, '')));
    }

    // Find link text content
    const linkTextMatches = content.match(/<a[^>]*>([^<]+)<\/a>/g);
    if (linkTextMatches) {
      links.push(...linkTextMatches.map(m => m.replace(/<a[^>]*>/, '').replace(/<\/a>/, '')));
    }

    return links;
  }

  private async findAllSections(content: string, component: ComponentName): Promise<string[]> {
    const sections: string[] = [];
    
    // Find section headings
    const headingMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/g);
    if (headingMatches) {
      sections.push(...headingMatches.map(m => m.replace(/<\/?h[1-6][^>]*>/g, '')));
    }

    // Find section classes
    const sectionMatches = content.match(/class=["'][^"']*section[^"']*["']/g);
    if (sectionMatches) {
      sections.push(...sectionMatches.map(m => m.replace(/class=["']/, '').replace(/["']$/, '')));
    }

    return sections;
  }

  async refineAndRetry(
    originalRequest: TestRequest,
    previousResult: TestResult,
    maxRetries: number = TEST_CONFIG.test.maxRetries
  ): Promise<TestResult> {
    const componentContent = await readComponentContent(
      originalRequest.component,
      originalRequest.id,
      false
    );

    // Try each strategy in priority order
    for (const strategy of this.strategies.sort((a, b) => a.priority - b.priority)) {
      if (strategy.canHandle(previousResult.error || '')) {
        try {
          const refinedRequest = await strategy.generateRefinedRequest(
            originalRequest,
            previousResult.error || '',
            componentContent,
            this.propManager
          );

          // Check if we need clarification
          if (refinedRequest.needsClarification) {
            return {
              ...previousResult,
              success: false,
              needsClarification: true,
              clarificationPrompt: refinedRequest.clarificationPrompt,
              error: 'Need more specific information'
            };
          }

          logTestActivity(
            originalRequest.id,
            'info',
            `Trying refinement strategy: ${strategy.name}`,
            refinedRequest
          );

          // Execute refined request
          const result = await this.executeRefinedRequest(refinedRequest);
          
          if (result.success) {
            return result;
          }
        } catch (error) {
          logTestActivity(
            originalRequest.id,
            'warn',
            `Strategy ${strategy.name} failed`,
            error
          );
        }
      }
    }

    // If all strategies fail, generate alternative suggestions
    return this.generateAlternativeResponse(originalRequest, previousResult);
  }

  private async executeRefinedRequest(request: TestRequest): Promise<TestResult> {
    // Implementation of request execution
    // This would integrate with your existing test execution system
    return {} as TestResult; // Placeholder
  }

  private async generateAlternativeResponse(
    request: TestRequest,
    previousResult: TestResult
  ): Promise<TestResult> {
    // Get component-specific suggestions
    const props = this.propManager.getComponentProps(request.component);
    const suggestions = props.map(p => 
      `Update ${p.description} using '${p.propName}' prop`
    );
    
    return {
      ...previousResult,
      success: true, // We're converting failure into a "successful" response with alternatives
      error: undefined,
      executionResult: {
        type: 'alternatives',
        message: 'Could not complete the exact request, but here are some alternatives:',
        suggestions,
        originalRequest: request
      }
    };
  }
}