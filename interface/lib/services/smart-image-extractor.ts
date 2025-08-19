import { unsplashService } from './unsplash-api';
import * as path from 'path';
import { promises as fs } from 'fs';

interface ImageDescription {
  type: 'hero' | 'feature' | 'avatar' | 'background' | 'illustration' | 'product';
  description: string;
  altText?: string;
  context?: string;
}

interface ExtractedImage {
  placeholder: string;
  description: ImageDescription;
  searchQuery: string;
  isImageField: boolean; // New field to track if this is actually an image field
}

export class SmartImageExtractor {
  
  /**
   * Extract image descriptions from generated Astro code
   * Only targets actual image-related fields, never text content
   */
  static extractImageDescriptions(code: string, componentName: string): ExtractedImage[] {
    const extractedImages: ExtractedImage[] = [];
    
    // Extract alt text descriptions (only for actual image tags)
    const altTextMatches = code.match(/alt\s*=\s*["']([^"']+)["']/g);
    if (altTextMatches) {
      altTextMatches.forEach((match, index) => {
        const altText = match.match(/alt\s*=\s*["']([^"']+)["']/)?.[1];
        if (altText && !altText.includes('{{') && !altText.includes('placeholder') && altText.length > 5) {
          const description = this.parseAltTextToDescription(altText, componentName);
          if (description) {
            extractedImages.push({
              placeholder: `{{ALT_IMAGE_${index + 1}}}`,
              description,
              searchQuery: this.generateSearchQuery(description, componentName),
              isImageField: true
            });
          }
        }
      });
    }
    
    // Extract image variable assignments (only for actual image variables)
    const imageVariablePatterns = [
      /(heroImage|featureImage|productImage|imageSrc|imageUrl|avatarImage|backgroundImage)\s*=\s*["']([^"']+)["']/g,
      /(src|image|avatar)\s*=\s*["']([^"']+)["']/g,
      // Special pattern for avatar fields in testimonials
      /(avatar)\s*:\s*["']([^"']+)["']/g
    ];
    
    imageVariablePatterns.forEach(pattern => {
      const variableMatches = code.match(pattern);
      if (variableMatches) {
        variableMatches.forEach((match, index) => {
          const varMatch = match.match(pattern);
          if (varMatch) {
            const varName = varMatch[1];
            const varValue = varMatch[2];
            if (varValue && !varValue.includes('{{') && !varValue.includes('path/to') && varValue.length > 5) {
              const description = this.parseVariableToDescription(varName, varValue, componentName);
              if (description) {
                extractedImages.push({
                  placeholder: `{{${varName.toUpperCase()}}}`,
                  description,
                  searchQuery: this.generateSearchQuery(description, componentName),
                  isImageField: true
                });
              }
            }
          }
        });
      }
    });
    
    // Extract image placeholders (explicit image placeholders only)
    const placeholderMatches = code.match(/{{(MOCKUP_IMAGE|AVATAR_IMAGE|HERO_IMAGE|FEATURE_IMAGE|PRODUCT_IMAGE)}}/g);
    if (placeholderMatches) {
      placeholderMatches.forEach((match, index) => {
        const placeholderType = match.match(/{{([^}]+)}}/)?.[1];
        if (placeholderType) {
          const description = this.parsePlaceholderToDescription(placeholderType, componentName);
          if (description) {
            extractedImages.push({
              placeholder: match,
              description,
              searchQuery: this.generateSearchQuery(description, componentName),
              isImageField: true
            });
          }
        }
      });
    }
    
    return extractedImages;
  }
  
  /**
   * Parse placeholder to extract image descriptions
   */
  private static parsePlaceholderToDescription(placeholderType: string, componentName: string): ImageDescription | null {
    let type: ImageDescription['type'] = 'product';
    
    if (placeholderType.includes('HERO')) {
      type = 'hero';
    } else if (placeholderType.includes('FEATURE')) {
      type = 'feature';
    } else if (placeholderType.includes('AVATAR')) {
      type = 'avatar';
    } else if (placeholderType.includes('MOCKUP')) {
      type = 'product';
    }
    
    return {
      type,
      description: `${placeholderType.toLowerCase()} for ${componentName}`,
      context: componentName
    };
  }
  
  /**
   * Parse alt text to extract meaningful image descriptions
   */
  private static parseAltTextToDescription(altText: string, componentName: string): ImageDescription | null {
    const lowerAlt = altText.toLowerCase();
    
    // Determine image type based on component and alt text
    let type: ImageDescription['type'] = 'product';
    
    if (componentName.toLowerCase() === 'hero') {
      type = 'hero';
    } else if (componentName.toLowerCase() === 'features') {
      type = 'feature';
    } else if (lowerAlt.includes('avatar') || lowerAlt.includes('person') || lowerAlt.includes('profile')) {
      type = 'avatar';
    } else if (lowerAlt.includes('background')) {
      type = 'background';
    } else if (lowerAlt.includes('illustration') || lowerAlt.includes('icon')) {
      type = 'illustration';
    }
    
    return {
      type,
      description: altText,
      altText,
      context: componentName
    };
  }
  
  /**
   * Parse variable names and values to extract image descriptions
   */
  private static parseVariableToDescription(varName: string, varValue: string, componentName: string): ImageDescription | null {
    const lowerVarName = varName.toLowerCase();
    const lowerValue = varValue.toLowerCase();
    
    let type: ImageDescription['type'] = 'product';
    
    if (lowerVarName.includes('hero')) {
      type = 'hero';
    } else if (lowerVarName.includes('feature')) {
      type = 'feature';
    } else if (lowerVarName.includes('avatar')) {
      type = 'avatar';
    } else if (lowerVarName.includes('background')) {
      type = 'background';
    }
    
    return {
      type,
      description: varValue,
      context: componentName
    };
  }
  
  /**
   * Generate optimized search query for Unsplash
   */
  private static generateSearchQuery(description: ImageDescription, componentName: string): string {
    const { type, description: desc, context } = description;
    
    // Start with the component context
    let searchTerms: string[] = [];
    
    // Add component-specific terms
    switch (componentName.toLowerCase()) {
      case 'hero':
        searchTerms.push('real estate', 'luxury home', 'modern house');
        break;
      case 'features':
        searchTerms.push('real estate', 'property feature', 'home amenity');
        break;
      case 'testimonials':
        searchTerms.push('real estate agent', 'professional portrait', 'business person');
        break;
      case 'newsletter':
        searchTerms.push('real estate office', 'modern building', 'professional office');
        break;
      case 'faq':
        searchTerms.push('real estate consultation', 'professional meeting', 'business consultation');
        break;
      case 'menu':
        searchTerms.push('real estate', 'professional', 'modern');
        break;
      case 'footer':
        searchTerms.push('real estate', 'professional', 'modern');
        break;
      default:
        searchTerms.push('real estate', 'property');
    }
    
    // Add type-specific terms
    switch (type) {
      case 'hero':
        searchTerms.push('luxury home', 'modern house', 'beautiful property', 'exterior');
        break;
      case 'feature':
        searchTerms.push('real estate feature', 'property amenity', 'home feature');
        break;
      case 'avatar':
        searchTerms.push('real estate agent', 'professional portrait', 'business person', 'headshot');
        break;
      case 'background':
        searchTerms.push('real estate background', 'property background', 'modern background');
        break;
      case 'illustration':
        searchTerms.push('real estate illustration', 'property icon', 'modern illustration');
        break;
      case 'product':
        searchTerms.push('real estate product', 'property showcase', 'modern property');
        break;
    }
    
    // Extract key terms from description (more sophisticated)
    const descWords = desc.toLowerCase()
      .split(/\s+/)
      .filter(term => {
        // Filter out common words and short terms
        const stopWords = ['the', 'and', 'for', 'with', 'from', 'real', 'estate', 'image', 'photo', 'picture', 'of', 'a', 'an', 'in', 'on', 'at', 'to', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'];
        return term.length > 3 && !stopWords.includes(term) && !term.match(/^\d+$/);
      })
      .slice(0, 4); // Take top 4 meaningful terms
    
    searchTerms.push(...descWords);
    
    // Remove duplicates and join
    const uniqueTerms = Array.from(new Set(searchTerms));
    const finalQuery = uniqueTerms.slice(0, 5).join(' '); // Limit to 5 terms for better results
    
    console.log(`[SmartImageExtractor] Generated search query: "${finalQuery}" from description: "${desc}"`);
    return finalQuery;
  }
  
  /**
   * Validate code for common errors before saving
   */
  static validateCode(code: string, componentName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for unterminated strings
    const stringMatches = code.match(/["']/g);
    if (stringMatches && stringMatches.length % 2 !== 0) {
      errors.push('Unterminated string literal detected');
    }
    
    // Check for image URLs in text content (should not happen)
    const imageUrlInText = code.match(/https:\/\/images\.unsplash\.com[^"'\s]+/g);
    if (imageUrlInText) {
      // Only flag if it's not in an image-related context
      const imageContexts = code.match(/(src|image|avatar|heroImage|featureImage)\s*=\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g);
      if (!imageContexts || imageContexts.length < imageUrlInText.length) {
        errors.push('Image URLs found in text content - this should not happen');
      }
    }
    
    // Check for invalid JSX/Astro syntax
    const invalidSyntax = code.match(/[<>][^<>]*[<>]/g);
    if (invalidSyntax) {
      errors.push('Potential invalid JSX/Astro syntax detected');
    }
    
    // Check for missing closing tags
    const openTags = code.match(/<[^/][^>]*>/g);
    const closeTags = code.match(/<\/[^>]*>/g);
    if (openTags && closeTags && openTags.length !== closeTags.length) {
      errors.push('Mismatched HTML tags detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Replace placeholders with smart image URLs (only for image fields)
   */
  static async replaceWithSmartImages(code: string, componentName: string): Promise<{ code: string; imageMap: Map<string, string>; isValid: boolean }> {
    const extractedImages = this.extractImageDescriptions(code, componentName);
    const imageMap = new Map<string, string>();
    let processedCode = code;
    
    console.log(`[SmartImageExtractor] Found ${extractedImages.length} image descriptions in ${componentName}`);
    
    for (const extractedImage of extractedImages) {
      // Only process if it's actually an image field
      if (!extractedImage.isImageField) {
        console.log(`[SmartImageExtractor] Skipping non-image field: ${extractedImage.description.description}`);
        continue;
      }
      
      try {
        console.log(`[SmartImageExtractor] Processing: "${extractedImage.description.description}"`);
        
        // Special handling for avatars - always use local avatar images
        if (extractedImage.description.type === 'avatar' || 
            extractedImage.description.description.toLowerCase().includes('avatar') ||
            extractedImage.placeholder.includes('AVATAR')) {
          
          const avatarUrl = this.getRandomAvatarImage();
          console.log(`[SmartImageExtractor] Using local avatar: ${avatarUrl}`);
          
          imageMap.set(extractedImage.placeholder, avatarUrl);
          
          // Replace avatar fields with local avatar images
          const descriptionText = extractedImage.description.description;
          const escapedDescription = descriptionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Replace in avatar variable assignments
          processedCode = processedCode.replace(
            new RegExp(`(avatar|avatarImage|avatarSrc)\\s*=\\s*["']${escapedDescription}["']`, 'g'),
            `$1 = "${avatarUrl}"`
          );
          
          // Replace in src attributes for avatar images
          processedCode = processedCode.replace(
            new RegExp(`src\\s*=\\s*["']${escapedDescription}["']`, 'g'),
            `src = "${avatarUrl}"`
          );
          
          // Replace explicit avatar placeholders
          processedCode = processedCode.replace(
            new RegExp(extractedImage.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            avatarUrl
          );
          
          // Replace any Unsplash URLs in avatar contexts
          processedCode = processedCode.replace(
            /(avatar|avatarImage|avatarSrc)\s*=\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g,
            `$1 = "${avatarUrl}"`
          );
          
          console.log(`[SmartImageExtractor] ✅ Replaced avatar with local image: ${avatarUrl}`);
          continue;
        }
        
        // For non-avatar images, use Unsplash
        console.log(`[SmartImageExtractor] Searching for: "${extractedImage.searchQuery}"`);
        
        let imageUrl: string | null;
        const options = {
          orientation: 'landscape' as const,
          content_filter: 'low' as const
        };
        
        imageUrl = await unsplashService.getRandomImage(extractedImage.searchQuery, options);
        
        if (imageUrl) {
          imageMap.set(extractedImage.placeholder, imageUrl);
          
          // Replace only in image-related contexts
          const descriptionText = extractedImage.description.description;
          const escapedDescription = descriptionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          
          // Replace in alt text (only for actual image tags)
          processedCode = processedCode.replace(
            new RegExp(`alt\\s*=\\s*["']${escapedDescription}["']`, 'g'),
            `alt = "${descriptionText}"`
          );
          
          // Replace in image variable assignments
          processedCode = processedCode.replace(
            new RegExp(`(heroImage|featureImage|productImage|imageSrc|imageUrl|backgroundImage|src|image)\\s*=\\s*["']${escapedDescription}["']`, 'g'),
            `$1 = "${imageUrl}"`
          );
          
          // Replace explicit placeholders
          processedCode = processedCode.replace(
            new RegExp(extractedImage.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            imageUrl
          );
          
          console.log(`[SmartImageExtractor] ✅ Replaced "${descriptionText}" with Unsplash image`);
        }
      } catch (error) {
        console.warn(`[SmartImageExtractor] ⚠️ Failed to get image for "${extractedImage.searchQuery}":`, error);
      }
    }
    
    // Post-processing: Replace any remaining Unsplash URLs in avatar contexts
    if (componentName.toLowerCase().includes('testimonial') || componentName.toLowerCase().includes('avatar')) {
      console.log(`[SmartImageExtractor] Post-processing avatars for ${componentName}`);
      
      // Replace Unsplash URLs in avatar fields
      processedCode = processedCode.replace(
        /(avatar)\s*:\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g,
        (match, fieldName) => {
          const avatarUrl = this.getRandomAvatarImage();
          console.log(`[SmartImageExtractor] Replacing Unsplash avatar with local: ${avatarUrl}`);
          return `${fieldName}: "${avatarUrl}"`;
        }
      );
      
      // Replace Unsplash URLs in avatar src attributes
      processedCode = processedCode.replace(
        /src\s*=\s*["']https:\/\/images\.unsplash\.com[^"']+["']/g,
        (match) => {
          const avatarUrl = this.getRandomAvatarImage();
          console.log(`[SmartImageExtractor] Replacing Unsplash src with local avatar: ${avatarUrl}`);
          return `src = "${avatarUrl}"`;
        }
      );
    }
    
    // Validate the processed code
    const validation = this.validateCode(processedCode, componentName);
    if (!validation.isValid) {
      console.warn(`[SmartImageExtractor] ⚠️ Validation failed for ${componentName}:`, validation.errors);
    }
    
    return { 
      code: processedCode, 
      imageMap, 
      isValid: validation.isValid 
    };
  }
  
  /**
   * Extract and replace all image placeholders with smart images
   */
  static async processComponentImages(code: string, componentName: string): Promise<string> {
    const { code: processedCode, isValid } = await this.replaceWithSmartImages(code, componentName);
    
    if (!isValid) {
      console.warn(`[SmartImageExtractor] ⚠️ Invalid code detected for ${componentName}, using fallback`);
      return this.getFallbackImage(code, componentName);
    }
    
    return processedCode;
  }
  
  /**
   * Get random avatar image from local avatars folder
   */
  private static getRandomAvatarImage(): string {
    const avatarFiles = [
      'Avatar_man.avif',
      'Avatar_man2.avif',
      'Avatar_man3.avif',
      'Avatar_man4.avif',
      'Avatar_man6.avif',
      'Avatar_man7.avif',
      'Avatar_woman.avif',
      'Avatar_woman2.avif',
      'Avatar_woman3.avif',
      'Avatar_woman4.avif',
      'Avatar_woman5.avif'
    ];
    
    const randomAvatar = avatarFiles[Math.floor(Math.random() * avatarFiles.length)];
    const avatarPath = `/images/avatars/${randomAvatar}`;
    
    console.log(`[SmartImageExtractor] Selected avatar: ${avatarPath}`);
    return avatarPath;
  }
  
  /**
   * Get fallback image from local mockups
   */
  private static getFallbackImage(code: string, componentName: string): string {
    const mockupDir = path.join(process.cwd(), '..', 'rendering', 'public', 'images', 'mockups');
    const mockupFiles = [
      'product.jpg',
      'product_01.jpg', 
      'product_02.jpg',
      'web-app.jpg',
      'macbook.jpg'
    ];
    
    const randomMockup = mockupFiles[Math.floor(Math.random() * mockupFiles.length)];
    const fallbackPath = `/images/mockups/${randomMockup}`;
    
    console.log(`[SmartImageExtractor] Using fallback image: ${fallbackPath}`);
    
    // Replace only image placeholders with fallback
    let processedCode = code;
    processedCode = processedCode.replace(/{{MOCKUP_IMAGE}}/g, fallbackPath);
    processedCode = processedCode.replace(/{{AVATAR_IMAGE}}/g, fallbackPath);
    
    return processedCode;
  }
} 