export interface DatasetConfig {
  enabled: boolean;
  maxExamplesPerComponent: number;
  similarityThreshold: number;
  fallbackToRandomExamples: boolean;
  enableHtmlToAstroConversion: boolean;
}

export const datasetConfig: DatasetConfig = {
  enabled: true,
  maxExamplesPerComponent: 3,
  similarityThreshold: 0.3,
  fallbackToRandomExamples: true,
  enableHtmlToAstroConversion: true,
};

export const DATASET_PATHS = {
  jsonl: '../dataset/uigen-t1.5-mistral.jsonl',
  backup: '../dataset/backup/',
} as const;

export const COMPONENT_KEYWORDS = {
  hero: ['hero', 'banner', 'main', 'headline', 'title'],
  menu: ['menu', 'navigation', 'nav', 'header', 'navbar'],
  footer: ['footer', 'bottom', 'links', 'social'],
  testimonials: ['testimonial', 'review', 'feedback', 'quote'],
  features: ['feature', 'benefit', 'advantage', 'highlight'],
  contact: ['contact', 'form', 'reach', 'get in touch'],
  pricing: ['pricing', 'price', 'plan', 'cost'],
  about: ['about', 'story', 'mission', 'company'],
} as const; 