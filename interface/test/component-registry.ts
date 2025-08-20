import {
  VersionedComponent,
  ComponentSchema,
  Version,
  StyleCategory,
  ContentProperty,
  LayoutProperty,
  TailwindBreakpoint
} from './types';

export class ComponentRegistry {
  private components: Map<string, VersionedComponent>;
  private schemaValidators: Map<string, (value: any) => boolean>;

  constructor() {
    this.components = new Map();
    this.schemaValidators = this.initializeValidators();
  }

  // Register a new component version
  registerComponent(
    name: string,
    version: Version,
    schema: ComponentSchema
  ): void {
    const component: VersionedComponent = {
      name,
      version,
      schema
    };
    
    // Validate schema before registration
    if (!this.validateSchema(schema)) {
      throw new Error(`Invalid schema for component ${name} version ${version}`);
    }
    
    this.components.set(`${name}@${version}`, component);
  }

  // Get component by version
  getComponent(name: string, version: Version): VersionedComponent | undefined {
    return this.components.get(`${name}@${version}`);
  }

  // Get latest version of a component
  getLatestVersion(name: string): VersionedComponent | undefined {
    const componentVersions = Array.from(this.components.entries())
      .filter(([key]) => key.startsWith(name))
      .sort((a, b) => this.compareVersions(
        a[1].version,
        b[1].version
      ));
    
    return componentVersions[componentVersions.length - 1]?.[1];
  }

  // Check if a component version exists
  hasVersion(name: string, version: Version): boolean {
    return this.components.has(`${name}@${version}`);
  }

  // Get all versions of a component
  getVersionHistory(name: string): VersionedComponent[] {
    return Array.from(this.components.values())
      .filter(component => component.name === name)
      .sort((a, b) => this.compareVersions(a.version, b.version));
  }

  // Initialize schema validators
  private initializeValidators(): Map<string, (value: any) => boolean> {
    const validators = new Map<string, (value: any) => boolean>();

    // Style validators
    validators.set('color', (value: string) => 
      /^(primary|secondary|accent|neutral|success|warning|error)-[0-9]{2,3}$/.test(value)
    );
    
    validators.set('typography', (value: string) =>
      /^(text|font)-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/.test(value)
    );
    
    validators.set('spacing', (value: string) =>
      /^(m|p)[xy]?-(0|0\.5|1|2|3|4|5|6|8|10|12|16)$/.test(value)
    );
    
    validators.set('layout', (value: string) =>
      /^(grid-cols-[1-6]|flex-(row|col|wrap|nowrap))$/.test(value)
    );

    // Content validators
    validators.set('text', (value: string) => value.length > 0);
    validators.set('html', (value: string) => 
      /<[a-z][\s\S]*>/i.test(value) && value.length > 0
    );
    validators.set('markdown', (value: string) =>
      /[#*_`]/.test(value) && value.length > 0
    );

    return validators;
  }

  // Validate component schema
  private validateSchema(schema: ComponentSchema): boolean {
    // Validate style properties
    for (const [category, config] of Object.entries(schema.styles)) {
      if (!this.isValidStyleCategory(category as StyleCategory)) {
        return false;
      }
      
      if (config.constraints?.validation && 
          typeof config.constraints.validation !== 'function') {
        return false;
      }
    }

    // Validate content properties
    for (const [property, config] of Object.entries(schema.content)) {
      if (!this.isValidContentProperty(property as ContentProperty)) {
        return false;
      }
      
      if (!['text', 'html', 'markdown'].includes(config.type)) {
        return false;
      }
    }

    // Validate layout properties
    for (const [property, config] of Object.entries(schema.layout)) {
      if (!this.isValidLayoutProperty(property as LayoutProperty)) {
        return false;
      }
      
      if (!this.areValidBreakpoints(config.breakpoints)) {
        return false;
      }
    }

    return true;
  }

  // Helper methods for schema validation
  private isValidStyleCategory(category: string): category is StyleCategory {
    return ['color', 'typography', 'spacing', 'layout', 'animation', 'interaction']
      .includes(category);
  }

  private isValidContentProperty(property: string): property is ContentProperty {
    return ['title', 'subtitle', 'description', 'buttonText', 'text', 'label',
      'placeholder', 'altText', 'metaTitle', 'metaDescription'].includes(property);
  }

  private isValidLayoutProperty(property: string): property is LayoutProperty {
    return ['grid', 'flex', 'position', 'display', 'container', 'responsive']
      .includes(property);
  }

  private areValidBreakpoints(breakpoints: TailwindBreakpoint[]): boolean {
    const validBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
    return breakpoints.every(bp => validBreakpoints.includes(bp));
  }

  // Compare semantic versions
  private compareVersions(v1: Version, v2: Version): number {
    const [major1, minor1, patch1] = v1.slice(1).split('.').map(Number);
    const [major2, minor2, patch2] = v2.slice(1).split('.').map(Number);
    
    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
  }
} 