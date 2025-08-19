import { promises as fs } from 'fs';
import path from 'path';

export interface DomainSecurityContext {
  forbiddenDomains: string[];
  allowedImageSources: string[];
  allowedAvatarSources: string[];
  securityRules: string[];
  validationRegex: string[];
}

export class DomainSecurityService {
  private static contextCache: string | null = null;
  private static contextPath = path.join(process.cwd(), 'lib', 'context', 'domain-security.context');

  /**
   * Load the domain security context from file
   */
  static async loadDomainSecurityContext(): Promise<string> {
    if (this.contextCache) {
      console.log('[DomainSecurity] Using cached domain security context');
      return this.contextCache;
    }

    try {
      const context = await fs.readFile(this.contextPath, 'utf-8');
      this.contextCache = context;
      console.log('[DomainSecurity] Loaded domain security context from file');
      console.log('[DomainSecurity] Context length:', context.length, 'characters');
      return context;
    } catch (error) {
      console.error('[DomainSecurity] Failed to load domain security context:', error);
      // Return a minimal context if file is not found
      const minimalContext = this.getMinimalContext();
      console.log('[DomainSecurity] Using minimal fallback context');
      return minimalContext;
    }
  }

  /**
   * Get a minimal domain security context as fallback
   */
  private static getMinimalContext(): string {
    return `# DOMAIN SECURITY CONTEXT - CRITICAL

🚫 FORBIDDEN - ALL EXTERNAL DOMAINS:
- **ALL external domains** are forbidden except Unsplash (for images) and local avatars
- **ANY external domain** not explicitly allowed below

✅ ALLOWED DOMAINS:
- Unsplash: https://images.unsplash.com/, https://source.unsplash.com/
- Local avatars: /images/avatars/*.avif (ONLY for testimonials)

CRITICAL: NEVER use ANY external domains. ONLY use Unsplash for images and local avatars for testimonials.`;
  }

  /**
   * Inject domain security context into system prompt
   */
  static async injectIntoSystemPrompt(basePrompt: string): Promise<string> {
    console.log('[DomainSecurity] Injecting domain security context into system prompt');
    const securityContext = await this.loadDomainSecurityContext();
    
    const enhancedPrompt = `${basePrompt}

${securityContext}

CRITICAL: The above domain security rules are MANDATORY and must be followed exactly.`;
    
    console.log('[DomainSecurity] Enhanced prompt length:', enhancedPrompt.length, 'characters');
    console.log('[DomainSecurity] Security context length:', securityContext.length, 'characters');
    console.log('[DomainSecurity] Domain security context successfully injected');
    
    return enhancedPrompt;
  }

  /**
   * Validate generated code against domain security rules
   */
  static validateGeneratedCode(code: string): {
    isValid: boolean;
    violations: string[];
    suggestions: string[];
  } {
    console.log('[DomainSecurity] Validating generated code for domain violations');
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for ANY external domains except Unsplash and local avatars
    const externalImageRegex = /https:\/\/[^"]*\.(jpg|jpeg|png|webp|gif|svg)/gi;
    const matches = code.match(externalImageRegex) || [];
    
    console.log('[DomainSecurity] Found', matches.length, 'external image URLs to check');
    
    for (const match of matches) {
      // Only allow Unsplash domains and local avatars
      if (!match.includes('images.unsplash.com') && !match.includes('source.unsplash.com') && !match.includes('/images/avatars/')) {
        console.log('[DomainSecurity] VIOLATION DETECTED:', match);
        violations.push(`External domain detected: ${match}`);
        suggestions.push(`Replace ${match} with Unsplash image`);
      } else {
        console.log('[DomainSecurity] Allowed domain:', match);
      }
    }

    // Check for avatar usage outside of testimonials
    const avatarRegex = /\/images\/avatars\/[^"'\s]+\.avif/gi;
    const avatarMatches = code.match(avatarRegex) || [];
    
    console.log('[DomainSecurity] Found', avatarMatches.length, 'avatar references');
    
    if (avatarMatches.length > 0) {
      // Check if this is a testimonials component
      const isTestimonials = code.toLowerCase().includes('testimonial') || 
                           code.toLowerCase().includes('review') ||
                           code.toLowerCase().includes('customer');
      
      if (!isTestimonials) {
        console.log('[DomainSecurity] AVATAR VIOLATION: Used outside testimonials');
        violations.push('Avatar used outside of testimonials component');
        suggestions.push('Use Unsplash for images in non-testimonial components');
      } else {
        console.log('[DomainSecurity] Avatar usage is valid (in testimonials)');
      }
    }

    const isValid = violations.length === 0;
    console.log('[DomainSecurity] Validation result:', isValid ? 'PASSED' : 'FAILED');
    console.log('[DomainSecurity] Violations found:', violations.length);
    console.log('[DomainSecurity] Suggestions:', suggestions.length);

    return {
      isValid,
      violations,
      suggestions
    };
  }

  /**
   * Get forbidden domain patterns for regex replacement
   */
  static getForbiddenDomainPatterns(): string[] {
    return [
      'https://[^"]*\\.(jpg|jpeg|png|webp|gif|svg)'
    ];
  }

  /**
   * Get allowed domain patterns for validation
   */
  static getAllowedDomainPatterns(): string[] {
    return [
      'https://images\\.unsplash\\.com/.*',
      'https://source\\.unsplash\\.com/.*',
      '/images/avatars/.*\\.avif'
    ];
  }

  /**
   * Create a domain security warning for system prompts
   */
  static getDomainSecurityWarning(): string {
    return `🚫 DOMAIN SECURITY WARNING:
NEVER use ANY external domains except Unsplash for images and local avatars.

✅ ONLY use:
- Unsplash for images
- Local avatars (/images/avatars/*.avif) for testimonials ONLY

VIOLATION = AUTOMATIC REGENERATION`;
  }

  /**
   * Check if a URL is from an allowed domain
   */
  static isAllowedDomain(url: string): boolean {
    const allowedPatterns = this.getAllowedDomainPatterns();
    return allowedPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(url);
    });
  }

  /**
   * Check if a URL is from a forbidden domain
   */
  static isForbiddenDomain(url: string): boolean {
    const forbiddenPatterns = this.getForbiddenDomainPatterns();
    return forbiddenPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(url);
    });
  }

  /**
   * Get replacement suggestions for forbidden domains
   */
  static getReplacementSuggestions(forbiddenUrl: string): string {
    if (forbiddenUrl.includes('avatar') || forbiddenUrl.includes('profile')) {
      return 'Use local avatar: /images/avatars/Avatar_man.avif';
    } else {
      return 'Use Unsplash: path/to/image (will be replaced automatically)';
    }
  }
} 