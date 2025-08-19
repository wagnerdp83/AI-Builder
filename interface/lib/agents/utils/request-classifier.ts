export interface RequestType {
  type: 'standard' | 'visual';
  hasImage: boolean;
  hasLayout: boolean;
}

export class RequestClassifier {
  private static readonly IMAGE_KEYWORDS = [
    'image',
    'picture',
    'photo',
    'logo',
    'icon',
    'upload',
    'uploaded',
    'attached'
  ];

  private static readonly LAYOUT_KEYWORDS = [
    'layout',
    'design',
    'visual',
    'background',
    'style',
    'appearance',
    'look',
    'theme'
  ];

  static classifyRequest(prompt: string, hasAttachedImage: boolean = false, hasAttachedLayout: boolean = false): RequestType {
    const promptLower = prompt.toLowerCase();
    
    // If there are actual attachments, it's definitely a visual request
    if (hasAttachedImage || hasAttachedLayout) {
      return {
        type: 'visual',
        hasImage: hasAttachedImage,
        hasLayout: hasAttachedLayout
      };
    }

    // Check for image-related keywords
    const hasImageKeywords = this.IMAGE_KEYWORDS.some(keyword => 
      promptLower.includes(keyword)
    );

    // Check for layout-related keywords
    const hasLayoutKeywords = this.LAYOUT_KEYWORDS.some(keyword => 
      promptLower.includes(keyword)
    );

    // If it mentions either images or layout, it's a visual request
    if (hasImageKeywords || hasLayoutKeywords) {
      return {
        type: 'visual',
        hasImage: hasImageKeywords,
        hasLayout: hasLayoutKeywords
      };
    }

    // Check if it's a create request
    if (promptLower.includes('create')) {
      return {
        type: 'visual',
        hasImage: false,
        hasLayout: false
      };
    }

    // Default to standard request
    return {
      type: 'standard',
      hasImage: false,
      hasLayout: false
    };
  }

  static validateVisualRequest(prompt: string, image?: string, layout?: string): void {
    const classification = this.classifyRequest(prompt, !!image, !!layout);
    
    if (classification.type === 'visual') {
      // For create requests, we don't require image/layout keywords
      if (prompt.toLowerCase().includes('create')) {
        return;
      }

      // If the request mentions an image but none is provided
      if (classification.hasImage && !image) {
        throw new Error('Request mentions an image but no image was provided');
      }

      // If the request mentions a layout but none is provided
      if (classification.hasLayout && !layout) {
        throw new Error('Request mentions a layout but no layout was provided');
      }
    }
  }
} 