import { 
  TestCaseType, 
  ComponentName,
  StyleCategory,
  StyleProperty,
  ContentProperty,
  LayoutProperty,
  TailwindColor,
  TailwindSpacing,
  StyleUpdateConfig,
  TestGenerationConfig
} from './types';

// Style categories configuration
export const STYLE_CATEGORIES: Record<StyleCategory, number> = {
  color: 0.3,      // 30% chance for color updates
  typography: 0.2, // 20% chance for typography updates
  spacing: 0.2,   // 20% chance for spacing updates
  layout: 0.15,   // 15% chance for layout updates
  animation: 0.1, // 10% chance for animation updates
  interaction: 0.05 // 5% chance for interaction updates
};

// Tailwind-specific configurations
export const TAILWIND_CONFIG = {
  colors: {
    primary: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    secondary: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    accent: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    neutral: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    success: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    warning: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const,
    error: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const
  } as const,
  spacing: {
    sizes: ['0', '0.5', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'],
    units: ['px', 'rem', 'em', '%']
  },
  typography: {
    sizes: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
    weights: ['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold'],
    families: ['sans', 'serif', 'mono']
  },
  breakpoints: ['sm', 'md', 'lg', 'xl', '2xl']
};

type ColorShade = keyof typeof TAILWIND_CONFIG.colors;

// Component-specific style configurations
export const COMPONENT_STYLES: Record<ComponentName, StyleUpdateConfig[]> = {
  Hero: [
    { property: 'background', value: { shade: 'primary', scale: 100 }, scope: 'component' },
    { property: 'title-color', value: { shade: 'primary', scale: 900 }, selector: 'h1' },
    { property: 'spacing', value: { size: 8, responsive: true }, scope: 'component' }
  ],
  Features: [
    { property: 'grid-cols', value: '3', breakpoint: 'lg', scope: 'component' },
    { property: 'card-bg', value: { shade: 'neutral', scale: 50 }, selector: '.feature-card' },
    { property: 'gap', value: { size: 6 }, scope: 'component' }
  ],
  Pricing: [
    { property: 'card-shadow', value: 'xl', selector: '.pricing-card', state: 'hover' },
    { property: 'button-bg', value: { shade: 'primary', scale: 600 }, selector: '.cta-button' },
    { property: 'spacing', value: { size: 4, axis: 'y' }, scope: 'component' }
  ],
  Testimonials: [
    { property: 'quote-color', value: { shade: 'accent', scale: 700 }, selector: '.quote' },
    { property: 'avatar-size', value: { size: 12 }, selector: '.avatar' },
    { property: 'grid-flow', value: 'dense', breakpoint: 'md', scope: 'component' }
  ],
  Contact: [
    { property: 'input-border', value: { shade: 'neutral', scale: 200 }, selector: 'input' },
    { property: 'button-hover', value: { shade: 'primary', scale: 700 }, selector: 'button', state: 'hover' },
    { property: 'gap', value: { size: 4 }, scope: 'component' }
  ]
};

// Style property generators
export function generateStyleValue(category: StyleCategory, property: string): string {
  switch (category) {
    case 'color':
      return generateColorValue(property);
    case 'typography':
      return generateTypographyValue(property);
    case 'spacing':
      return generateSpacingValue(property);
    case 'layout':
      return generateLayoutValue(property);
    case 'animation':
      return generateAnimationValue(property);
    case 'interaction':
      return generateInteractionValue(property);
    default:
      return '';
  }
}

function generateColorValue(property: string): string {
  const shades = Object.keys(TAILWIND_CONFIG.colors) as ColorShade[];
  const shade = getRandomItem(shades);
  const scale = getRandomItem(TAILWIND_CONFIG.colors[shade]);
  return `${shade}-${scale}`;
}

function generateTypographyValue(property: string): string {
  if (property.includes('size')) {
    return `text-${getRandomItem(TAILWIND_CONFIG.typography.sizes)}`;
  }
  if (property.includes('weight')) {
    return `font-${getRandomItem(TAILWIND_CONFIG.typography.weights)}`;
  }
  return `font-${getRandomItem(TAILWIND_CONFIG.typography.families)}`;
}

function generateSpacingValue(property: string): string {
  const size = getRandomItem(TAILWIND_CONFIG.spacing.sizes);
  const axis = Math.random() < 0.5 ? 'x' : 'y';
  return property.includes('margin') ? `m${axis}-${size}` : `p${axis}-${size}`;
}

function generateLayoutValue(property: string): string {
  if (property.includes('grid')) {
    const cols = Math.floor(Math.random() * 6) + 1;
    return `grid-cols-${cols}`;
  }
  if (property.includes('flex')) {
    return getRandomItem(['flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap']);
  }
  return '';
}

function generateAnimationValue(property: string): string {
  return getRandomItem([
    'transition-all',
    'duration-200',
    'ease-in-out',
    'transform',
    'hover:scale-105'
  ]);
}

function generateInteractionValue(property: string): string {
  return getRandomItem([
    'hover:bg-opacity-90',
    'focus:ring-2',
    'active:scale-95',
    'disabled:opacity-50'
  ]);
}

// Helper function to get random item from array
function getRandomItem<T>(array: T[] | readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate a complete style update
export function generateStyleUpdate(
  component: ComponentName,
  config?: TestGenerationConfig
): StyleProperty {
  // Get random category based on weights or config focus
  const category = config?.focus?.length 
    ? getRandomItem(config.focus)
    : getWeightedRandomCategory();

  // Get component-specific styles
  const componentStyles = COMPONENT_STYLES[component];
  const styleConfig = getRandomItem(componentStyles);

  // Generate the style value
  const value = generateStyleValue(category, styleConfig.property);

  return {
    category,
    property: styleConfig.property,
    value,
    selector: styleConfig.selector,
    mediaQuery: styleConfig.breakpoint ? `@media (min-width: ${styleConfig.breakpoint})` : undefined,
    state: styleConfig.state
  };
}

function getWeightedRandomCategory(): StyleCategory {
  const random = Math.random();
  let sum = 0;
  
  for (const [category, weight] of Object.entries(STYLE_CATEGORIES)) {
    sum += weight;
    if (random <= sum) {
      return category as StyleCategory;
    }
  }
  
  return 'color'; // Fallback
} 