import {
  VersionedTestCase,
  EnhancedTestResult,
  Version,
  ComponentSchema,
  StyleCategory,
  StyleConfig,
  TailwindBreakpoint,
  ContentConfig,
  LayoutConfig
} from './types';
import { ComponentRegistry } from './component-registry';
import { ChangeManager } from './change-manager';
import { promises as fs } from 'fs';
import { join } from 'path';

export class VersionedTestRunner {
  private registry: ComponentRegistry;
  private changeManager: ChangeManager;
  private currentVersion: Version = 'v1.0.0';

  constructor() {
    this.registry = new ComponentRegistry();
    this.changeManager = new ChangeManager();
  }

  // Initialize component schemas
  async initializeComponents(): Promise<void> {
    // Load component schemas from configuration
    const componentsDir = join(process.cwd(), '..', '..', 'rendering', 'src', 'components');
    const files = await fs.readdir(componentsDir);
    
    for (const file of files) {
      if (file.endsWith('.astro')) {
        const componentName = file.replace('.astro', '');
        const schema = await this.generateComponentSchema(componentName);
        this.registry.registerComponent(componentName, this.currentVersion, schema);
      }
    }
  }

  // Run a versioned test case
  async runTest(testCase: VersionedTestCase): Promise<EnhancedTestResult> {
    try {
      // Validate component version compatibility
      if (!this.registry.hasVersion(testCase.expectedResult.section, testCase.componentVersion)) {
        throw new Error(`Component version ${testCase.componentVersion} not found`);
      }

      // Validate change against component schema
      const isValid = await this.changeManager.validateChange(testCase);
      if (!isValid) {
        throw new Error('Invalid change for component schema');
      }

      // Apply changes with rollback capability
      const result = await this.changeManager.applyChange(testCase);

      return result;
    } catch (error) {
      throw new Error(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Run multiple test cases
  async runTestSuite(testCases: VersionedTestCase[]): Promise<EnhancedTestResult[]> {
    const results: EnhancedTestResult[] = [];
    
    for (const testCase of testCases) {
      try {
        const result = await this.runTest(testCase);
        results.push(result);
      } catch (error) {
        console.error(`Failed to run test case ${testCase.id}:`, error);
        // Continue with next test case even if one fails
      }
    }
    
    return results;
  }

  // Generate component schema from existing component
  private async generateComponentSchema(componentName: string): Promise<ComponentSchema> {
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', 
      `${componentName}.astro`
    );
    const content = await fs.readFile(componentPath, 'utf-8');
    
    // Parse component content to generate schema
    const schema: ComponentSchema = {
      styles: this.extractStyleProperties(content),
      content: this.extractContentProperties(content),
      layout: this.extractLayoutProperties(content)
    };
    
    return schema;
  }

  // Extract style properties from component
  private extractStyleProperties(content: string): Record<StyleCategory, StyleConfig> {
    const styleProperties: Record<StyleCategory, StyleConfig> = {
      color: {
        properties: [],
        constraints: {
          allowedValues: ['primary', 'secondary', 'accent', 'neutral']
        }
      },
      typography: {
        properties: [],
        constraints: {
          allowedValues: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl']
        }
      },
      spacing: {
        properties: [],
        constraints: {
          allowedValues: ['0', '1', '2', '4', '8', '16']
        }
      },
      layout: {
        properties: [],
        constraints: {
          allowedValues: ['flex', 'grid', 'block', 'inline']
        }
      },
      animation: {
        properties: [],
        constraints: {
          allowedValues: ['fade', 'slide', 'scale']
        }
      },
      interaction: {
        properties: [],
        constraints: {
          allowedValues: ['hover', 'focus', 'active']
        }
      }
    };

    // Extract class names from content
    const classMatches = content.match(/class="([^"]+)"/g) || [];
    for (const match of classMatches) {
      const classes = match.slice(7, -1).split(' ');
      for (const cls of classes) {
        // Categorize classes into style properties
        if (cls.startsWith('text-')) {
          styleProperties.typography.properties.push(cls);
        } else if (cls.startsWith('bg-')) {
          styleProperties.color.properties.push(cls);
        } else if (cls.match(/^[mp][xy]?-/)) {
          styleProperties.spacing.properties.push(cls);
        } else if (cls.match(/^(flex|grid|block|inline)/)) {
          styleProperties.layout.properties.push(cls);
        }
      }
    }

    return styleProperties;
  }

  // Extract content properties from component
  private extractContentProperties(content: string): Record<string, ContentConfig> {
    const contentProperties: Record<string, ContentConfig> = {};
    
    // Extract props interface
    const propsMatch = content.match(/interface Props {([^}]+)}/);
    if (propsMatch) {
      const props = propsMatch[1].trim().split('\n');
      for (const prop of props) {
        const match = prop.match(/(\w+)(\?)?:\s*(string)/);
        if (match) {
          contentProperties[match[1]] = {
            type: 'text',
            multiline: false
          };
        }
      }
    }

    return contentProperties;
  }

  // Extract layout properties from component
  private extractLayoutProperties(content: string): Record<string, LayoutConfig> {
    const layoutProperties: Record<string, LayoutConfig> = {};
    
    // Extract responsive classes
    const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
    const responsiveMatches = content.match(/[^"]*?(sm|md|lg|xl|2xl):[^"]+/g) || [];
    
    if (responsiveMatches.length > 0) {
      layoutProperties.responsive = {
        breakpoints: breakpoints as TailwindBreakpoint[],
        constraints: {
          allowedValues: ['hidden', 'block', 'flex', 'grid']
        }
      };
    }

    // Extract grid/flex layouts
    if (content.includes('grid-cols-')) {
      layoutProperties.grid = {
        breakpoints: breakpoints as TailwindBreakpoint[],
        constraints: {
          minValue: 1,
          maxValue: 12
        }
      };
    }

    if (content.includes('flex')) {
      layoutProperties.flex = {
        breakpoints: breakpoints as TailwindBreakpoint[],
        constraints: {
          allowedValues: ['row', 'col', 'wrap', 'nowrap']
        }
      };
    }

    return layoutProperties;
  }
} 