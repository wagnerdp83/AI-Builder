// Backup note: This is a new file; no existing code removed elsewhere.

export interface IRConstant {
  name: string;
  value: string;
}

export interface IRLayout {
  container?: 'default' | 'wide' | 'full';
  columns?: number;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  stack?: 'vertical' | 'horizontalScroll' | 'grid';
}

export interface IRTheme {
  fontFamily?: 'serif' | 'sans' | 'mono';
  colors?: string[]; // Tailwind color tokens
  background?: string; // Tailwind background tokens
  button?: string; // Tailwind button classes
}

export interface IRContentItem {
  title?: string;
  subtitle?: string;
  description?: string;
  beforeImage?: string; // should be placeholders
  afterImage?: string;  // should be placeholders
  image?: string;       // should be placeholders
  avatar?: string;      // should be placeholders
  rating?: number;
  price?: string;
  duration?: string;
}

export interface IRContent {
  paragraphs?: string[];
  bullets?: string[];
  items?: IRContentItem[];
}

export interface IRA11y {
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  ariaNotes?: string[];
}

export interface ComponentIR {
  version: string; // e.g. "1.0"
  componentName: string;
  semanticTag: 'header' | 'nav' | 'section' | 'main' | 'footer' | 'aside';
  styleSystem?: string; // e.g., 'tailwind', 'vanilla', 'unocss'
  constants?: IRConstant[];
  layout?: IRLayout;
  theme?: IRTheme;
  interactions?: string[]; // e.g. ["beforeAfterHover", "scroll", ...]
  placeholders?: string[]; // e.g. ["MOCKUP_IMAGE", "AVATAR_IMAGE", "VIDEO_URL"]
  lucideIcons?: string[];  // e.g. ["User", "Scissors"]
  content?: IRContent;
  a11y?: IRA11y;
}

export function validateIR(ir: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!ir || typeof ir !== 'object') {
    return { valid: false, errors: ['IR is not an object'] };
  }
  if (typeof ir.version !== 'string') errors.push('version must be string');
  if (typeof ir.componentName !== 'string' || !ir.componentName) errors.push('componentName must be non-empty string');
  const semanticAllowed = ['header', 'nav', 'section', 'main', 'footer', 'aside'];
  if (!semanticAllowed.includes(ir.semanticTag)) errors.push('semanticTag invalid');
  if (ir.constants && !Array.isArray(ir.constants)) errors.push('constants must be array');
  if (ir.lucideIcons && !Array.isArray(ir.lucideIcons)) errors.push('lucideIcons must be array');
  if (ir.placeholders && !Array.isArray(ir.placeholders)) errors.push('placeholders must be array');
  if (errors.length) return { valid: false, errors };
  return { valid: true };
}

