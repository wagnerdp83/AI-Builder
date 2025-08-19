// Structured Intent Detection Types
// This replaces the simple intent classification with a comprehensive system

export interface UserIntent {
  intent: 'create_website' | 'edit_component' | 'delete_component' | 'chat';
  slots: IntentSlots;
  confidence: number;
  raw_prompt: string;
  extracted_sections?: string[];
  execution_plan?: ExecutionStep[];
}

export interface IntentSlots {
  // Site/Page Information
  site_type?: string;           // 'landing_page', 'portfolio', 'ecommerce', 'blog'
  page_name?: string;           // 'home', 'about', 'contact'
  
  // Content Sections
  sections?: string[];          // ['hero', 'features', 'testimonials', 'faq']
  section_descriptions?: Record<string, string>; // {'hero': 'description', 'features': 'description'}
  components?: string[];        // Specific component names
  
  // Design & Styling
  theme?: string;               // 'modern', 'minimal', 'corporate', 'creative'
  colors?: string[];            // ['pink', 'wine', 'blue', 'green']
  style?: string;               // 'dark', 'light', 'gradient'
  
  // Business Context
  business_type?: string;       // 'fashion_boutique', 'tech_startup', 'restaurant'
  target_audience?: string;     // 'young_professionals', 'students', 'seniors'
  
  // Features & Functionality
  features?: string[];          // ['blog', 'newsletter', 'contact_form', 'gallery']
  functionality?: string[];     // ['signup', 'payment', 'booking', 'chat']
  
  // Content Requirements
  content_type?: string[];      // ['text', 'images', 'videos', 'forms']
  image_requirements?: string[]; // ['hero_image', 'product_photos', 'team_photos']
  
  // Layout & Structure
  layout_type?: string;         // 'single_page', 'multi_page', 'dashboard'
  navigation?: string[];        // ['header', 'footer', 'sidebar']
  
  // Technical Requirements
  responsive?: boolean;         // Mobile-friendly requirements
  accessibility?: boolean;      // Accessibility requirements
  seo?: boolean;               // SEO optimization
  
  // Custom Requirements
  custom_requirements?: string[]; // Any other specific requirements
}

export interface ExecutionStep {
  step_id: string;
  step_type: 'create_component' | 'edit_component' | 'delete_component' | 'apply_theme' | 'add_content';
  component_name?: string;
  component_type?: string;
  dependencies?: string[];
  order: number;
  parameters: Record<string, any>;
  estimated_duration: number; // in seconds
}

export interface IntentDetectionResult {
  success: boolean;
  intent: UserIntent | null;
  error?: string;
  confidence: number;
  fallback_used: boolean;
  processing_time: number; // in milliseconds
}

export interface SlotExtractionResult {
  success: boolean;
  slots: Partial<IntentSlots>;
  confidence: number;
  extracted_text: string[];
  validation_errors?: string[];
}

// Validation schemas for different intent types
export const CREATE_WEBSITE_SLOTS = [
  'site_type', 'sections', 'theme', 'colors', 'business_type', 
  'target_audience', 'features', 'layout_type'
] as const;

export const EDIT_COMPONENT_SLOTS = [
  'component_name', 'content_type', 'style', 'colors'
] as const;

export const DELETE_COMPONENT_SLOTS = [
  'component_name'
] as const;

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
  MINIMUM: 0.3
} as const;

// Section mapping for better extraction
export const SECTION_MAPPINGS = {
  // Navigation
  'menu': 'Menu',
  'navigation': 'Menu',
  'header': 'Menu',
  'nav': 'Menu',
  'navbar': 'Menu',
  'top navigation bar': 'Menu',
  'navigation bar': 'Menu',
  
  // Hero/Banner
  'hero': 'Hero',
  'banner': 'Hero',
  'main': 'Hero',
  'jumbotron': 'Hero',
  'intro': 'Hero',
  'welcome': 'Hero',
  'hero section': 'Hero',
  
  // Content Sections
  'features': 'Features',
  'benefits': 'Features',
  'services': 'Features',
  'offerings': 'Features',
  'service menu': 'Features',
  'service offerings': 'Features',
  
  'testimonials': 'Testimonials',
  'reviews': 'Testimonials',
  'feedback': 'Testimonials',
  'customer_stories': 'Testimonials',
  'video testimonial': 'Testimonials',
  'testimonial carousel': 'Testimonials',
  
  'faq': 'Faq',
  'questions': 'Faq',
  'help': 'Faq',
  'frequently_asked': 'Faq',
  
  'newsletter': 'Newsletter',
  'subscribe': 'Newsletter',
  'email_signup': 'Newsletter',
  'newsletter with title image': 'Newsletter',
  'newsletter with image': 'Newsletter',
  'newsletter signup': 'Newsletter',
  'newsletter sign up': 'Newsletter',
  
  'signup': 'Signup',
  'sign up': 'Signup',
  'register': 'Signup',
  'sign up button': 'Signup',
  'signup button': 'Signup',
  
  'footer': 'Footer',
  'bottom': 'Footer',
  'site footer': 'Footer',
  'footer with the same section items': 'Footer',
  
  // Additional sections
  'contact': 'Contact',
  'about': 'About',
  'about us': 'About',
  'about us block': 'About',
  'pricing': 'Pricing',
  'team': 'Team',
  'stylist showcase': 'Team',
  'stylists': 'Team',
  'gallery': 'Gallery',
  'client gallery': 'Gallery',
  'instagram feed': 'Gallery',
  'instagram feed grid': 'Gallery',
  'blog': 'Blog',
  'shop': 'Shop',
  'booking': 'Contact',
  'booking widget': 'Contact',
  'interactive booking': 'Contact',
  'booking form': 'Contact'
} as const;

// Business type mappings
export const BUSINESS_TYPE_MAPPINGS = {
  'fashion boutique': 'fashion_boutique',
  'fashion store': 'fashion_boutique',
  'clothing store': 'fashion_boutique',
  'apparel store': 'fashion_boutique',
  'boutique': 'fashion_boutique',
  'fashion salon': 'fashion_salon',
  'salon': 'fashion_salon',
  'beauty salon': 'fashion_salon',
  'hair salon': 'fashion_salon',
  
  'car dealership': 'car_dealership',
  'dealership': 'car_dealership',
  'auto dealership': 'car_dealership',
  'car dealer': 'car_dealership',
  'automotive': 'car_dealership',
  
  'tech startup': 'tech_startup',
  'software company': 'tech_startup',
  'saas': 'tech_startup',
  'technology': 'tech_startup',
  
  'restaurant': 'restaurant',
  'cafe': 'restaurant',
  'food': 'restaurant',
  'dining': 'restaurant',
  
  'portfolio': 'portfolio',
  'personal': 'portfolio',
  'freelancer': 'portfolio',
  'creative': 'portfolio'
} as const;

// Theme mappings
export const THEME_MAPPINGS = {
  'modern': 'modern',
  'minimal': 'minimal',
  'corporate': 'corporate',
  'creative': 'creative',
  'elegant': 'elegant',
  'professional': 'corporate',
  'clean': 'minimal',
  'simple': 'minimal'
} as const; 