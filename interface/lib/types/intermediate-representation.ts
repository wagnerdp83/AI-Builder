// Intermediate Representation Layer (IRL) Types
// This provides a structured, human-editable format between user intent and final code generation

export interface PageStructure {
  pages: PageDefinition[];
  global_config: GlobalConfig;
  navigation: NavigationConfig;
  theme: ThemeConfig;
  metadata: PageMetadata;
}

export interface PageDefinition {
  name: string;
  path: string;
  layout: string;
  components: ComponentDefinition[];
  seo?: SEOMetadata;
  custom_styles?: string[];
}

export interface ComponentDefinition {
  id: string;
  type: string;
  name: string;
  props: Record<string, any>;
  layout_order: number;
  dependencies?: string[];
  content?: ComponentContent;
  styles?: ComponentStyles;
  responsive_breakpoints?: ResponsiveConfig;
}

export interface ComponentContent {
  text?: string[];
  images?: ImageConfig[];
  links?: LinkConfig[];
  forms?: FormConfig[];
  data?: DataConfig;
}

export interface ComponentStyles {
  classes: string[];
  custom_css?: string;
  theme_variants?: Record<string, string[]>;
  responsive_styles?: Record<string, string[]>;
}

export interface ImageConfig {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazy_loading?: boolean;
}

export interface LinkConfig {
  href: string;
  text: string;
  target?: string;
  rel?: string;
}

export interface FormConfig {
  fields: FormField[];
  action: string;
  method: string;
  validation?: ValidationRules;
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: FieldValidation;
}

export interface ValidationRules {
  required?: string[];
  email?: string[];
  min_length?: Record<string, number>;
  max_length?: Record<string, number>;
}

export interface FieldValidation {
  type: 'email' | 'phone' | 'url' | 'number' | 'text';
  min_length?: number;
  max_length?: number;
  pattern?: string;
}

export interface DataConfig {
  source: 'static' | 'api' | 'cms';
  items?: any[];
  api_endpoint?: string;
  mapping?: Record<string, string>;
}

export interface ResponsiveConfig {
  mobile?: Record<string, any>;
  tablet?: Record<string, any>;
  desktop?: Record<string, any>;
}

export interface GlobalConfig {
  site_name: string;
  site_description: string;
  base_url: string;
  language: string;
  charset: string;
  viewport: string;
  robots: string;
}

export interface NavigationConfig {
  main_menu: NavigationItem[];
  footer_links?: NavigationItem[];
  breadcrumbs?: boolean;
  mobile_menu?: boolean;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
  external?: boolean;
}

export interface ThemeConfig {
  name: string;
  colors: ColorPalette;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  breakpoints: BreakpointConfig;
  dark_mode?: boolean;
}

export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  success: string[];
  warning: string[];
  error: string[];
}

export interface TypographyConfig {
  font_family: string;
  font_sizes: Record<string, string>;
  font_weights: Record<string, number>;
  line_heights: Record<string, number>;
}

export interface SpacingConfig {
  scale: Record<string, string>;
  container_padding: string;
  section_spacing: string;
}

export interface BreakpointConfig {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  og_image?: string;
  twitter_card?: string;
  // Additional properties for learning and component-specific data
  raw_prompt?: string;
  learning_applied?: boolean;
  applied_insights?: string[];
  [key: string]: any; // Allow additional properties
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
}

// Validation schemas for IRL
export const IRL_VALIDATION_SCHEMAS = {
  PAGE_STRUCTURE: {
    required: ['pages', 'global_config', 'navigation', 'theme'],
    properties: {
      pages: { type: 'array', minItems: 1 },
      global_config: { type: 'object' },
      navigation: { type: 'object' },
      theme: { type: 'object' }
    }
  },
  COMPONENT_DEFINITION: {
    required: ['id', 'type', 'name', 'props', 'layout_order'],
    properties: {
      id: { type: 'string' },
      type: { type: 'string' },
      name: { type: 'string' },
      props: { type: 'object' },
      layout_order: { type: 'number', minimum: 0 }
    }
  }
} as const;

// IRL Transformation Functions
export interface IRLTransformer {
  fromUserIntent(intent: any): PageStructure;
  toAstroCode(structure: PageStructure, componentName?: string, originalPrompt?: string): Promise<string>;
  validateStructure(structure: PageStructure): ValidationResult;
  mergeStructures(existing: PageStructure, updates: Partial<PageStructure>): PageStructure;
  extractComponentRequirements(structure: PageStructure, componentName?: string, originalPrompt?: string): string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} 