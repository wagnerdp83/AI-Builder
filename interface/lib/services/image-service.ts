// === SHARED IMAGE SERVICE ===
// Enhanced image service that integrates Unsplash API for better image results
// Used by all Create modes (Generic, Single, Abstract, Vision)

// import { freepikService } from './freepik-api'; // COMMENTED OUT FOR UNSPLASH MIGRATION
import { unsplashService } from './unsplash-api';
import path from 'path';
import { promises as fs } from 'fs';

// === LOCAL IMAGE COLLECTIONS (for fallback) ===
const LOCAL_AVATARS = [
  'Avatar_woman.avif',
  'Avatar_woman2.avif', 
  'Avatar_woman3.avif',
  'Avatar_woman4.avif',
  'Avatar_woman5.avif',
  'Avatar_man.avif',
  'Avatar_man2.avif',
  'Avatar_man3.avif',
  'Avatar_man4.avif',
  'Avatar_man6.avif',
  'Avatar_man7.avif'
];

const LOCAL_MOCKUPS = [
  'web-app.jpg',
  'shoes.jpg',
  'product_02.jpg',
  'product_01.jpg',
  'product.jpg',
  'orange.jpg',
  'macbook.jpg',
  'girl.jpg',
  'dashboard-light.jpg',
  'dashboard-dark.jpg'
];

// === ENHANCED IMAGE SERVICE ===
class EnhancedImageService {
  private useUnsplash: boolean;
  private fallbackToLocal: boolean;
  private imageCache: Map<string, string> = new Map(); // Simple cache for API responses
  private globalCache: Map<string, string> = new Map(); // Global cache shared across all instances
  private pendingRequests: Map<string, Promise<string>> = new Map(); // Prevent duplicate concurrent requests
  private preloadedImages: Map<string, string> = new Map(); // Pre-loaded common images

  constructor() {
    // Check if Unsplash API key is available
    const hasUnsplashKey = !!process.env.UNSPLASH_ACCESS_KEY;
    this.useUnsplash = hasUnsplashKey && process.env.USE_UNSPLASH !== 'false';
    this.fallbackToLocal = process.env.FALLBACK_TO_LOCAL !== 'false';

    console.log('[ImageService] Initializing with settings:');
    console.log('[ImageService] - UNSPLASH_ACCESS_KEY available:', hasUnsplashKey);
    console.log('[ImageService] - Use Unsplash:', this.useUnsplash);
    console.log('[ImageService] - Fallback to local:', this.fallbackToLocal);

    if (this.useUnsplash) {
      unsplashService.testConnection().then(isConnected => {
        if (!isConnected) {
          console.warn('[ImageService] ⚠️ Unsplash API not available, will use local images');
          this.useUnsplash = false; // Disable Unsplash if connection fails
        }
      });
    }
    
    // Pre-load common images to avoid API calls during generation
    this.preloadCommonImages();
  }

  private async preloadCommonImages(): Promise<void> {
    if (!this.useUnsplash) return;
    
    console.log('[ImageService] Pre-loading common images...');
    const commonSearches = [
      { term: 'portrait', orientation: 'portrait' },
      { term: 'headshot', orientation: 'portrait' },
      { term: 'person', orientation: 'portrait' },
      { term: 'profile picture', orientation: 'portrait' }
    
    ];

    // Pre-load images in parallel
    const preloadPromises = commonSearches.map(async (search) => {
      try {
        const image = await unsplashService.getRandomImage(search.term, {
          orientation: search.orientation as any,
          content_filter: 'low'
        });
        if (image) {
          this.preloadedImages.set(search.term, image);
          console.log('[ImageService] ✅ Pre-loaded:', search.term);
        }
      } catch (error) {
        console.warn('[ImageService] ⚠️ Failed to pre-load:', search.term);
      }
    });

    await Promise.all(preloadPromises);
    console.log('[ImageService] Pre-loading complete. Cached images:', this.preloadedImages.size);
  }

  /**
   * Get a random local image path
   */
  private getRandomLocalImage(collection: 'avatars' | 'mockups'): string {
    const images = collection === 'avatars' ? LOCAL_AVATARS : LOCAL_MOCKUPS;
    const randomImage = images[Math.floor(Math.random() * images.length)];
    return `/images/${collection}/${randomImage}`;
  }

  /**
   * Extract theme from user prompt using AI-driven analysis
   * 100% dynamic - no hardcoded fallbacks
   */
  async extractThemeFromPrompt(prompt: string): Promise<string> {
    console.log('🌸 [ImageService] Extracting theme dynamically from user request...');
    
    // Fallback logic for Next.js runtime where Mistral client is not available
    console.log('🌸 [ImageService] Running in Next.js environment, using local theme extraction fallback.');
      const promptWords = prompt.toLowerCase().split(/\s+/);
      const businessKeywords = promptWords.filter(word => 
        word.length > 3 && 
        !['with', 'the', 'and', 'for', 'that', 'this', 'have', 'will', 'from', 'your', 'page', 'landing', 'website', 'create', 'sections', 'include'].includes(word)
      );
      
      if (businessKeywords.length > 0) {
      return businessKeywords[0];
    } else {
      return 'general';
    }
  }

  /**
   * Get theme-specific search terms for Unsplash - ENHANCED to use specific requirements
   * Uses parsed JSON requirements when available, falls back to generic theme extraction
   */
  async getThemeSearchTerms(theme: string, imageType: 'hero' | 'product' | 'background' | 'illustration', userPrompt?: string, requirements?: any): Promise<string[]> {
    console.log('🎯 [ImageService] Generating dynamic search terms from user request...');
    console.log('🎯 [ImageService] Theme:', theme);
    console.log('🎯 [ImageService] Image type:', imageType);
    console.log('🎯 [ImageService] User prompt:', userPrompt);
    console.log('🎯 [ImageService] Requirements available:', !!requirements);
    
    // === ENHANCED: Use specific requirements when available ===
    if (requirements && requirements.content && requirements.content.elements) {
      console.log('🎯 [ImageService] Using specific requirements for search terms...');
      
      // Handle both string arrays and object arrays
      const elements = requirements.content.elements;
      let searchTerms: string[] = [];
      
      if (Array.isArray(elements)) {
        if (typeof elements[0] === 'string') {
          // String array format
          const imageElements = elements.filter((element: string) => 
            element.toLowerCase().includes('image') || 
            element.toLowerCase().includes('photo') ||
            element.toLowerCase().includes('picture') ||
            element.toLowerCase().includes('product') ||
            element.toLowerCase().includes('service') ||
            element.toLowerCase().includes('item')
          );
          
          if (imageElements.length > 0) {
            console.log('🎯 [ImageService] Found specific image elements:', imageElements);
            searchTerms = imageElements.map((element: string) => `${element} ${imageType}`);
          } else {
            // If no specific image elements, use all elements as potential search terms
            console.log('🎯 [ImageService] Using all content elements as search terms...');
            searchTerms = elements.map((element: string) => `${element} ${imageType}`);
          }
        } else if (typeof elements[0] === 'object') {
          // Object array format (from gallery fix)
          searchTerms = elements.map((element: any) => {
            if (element.description) {
              return `${element.description} ${imageType}`;
            } else if (element.title) {
              return `${element.title} ${imageType}`;
            }
            return '';
          }).filter(term => term.length > 0);
          
          console.log('🎯 [ImageService] Found object elements with descriptions:', searchTerms);
        }
      }
      
      if (searchTerms.length > 0) {
        return searchTerms;
      }
    }
    
    // === FALLBACK: Use generic theme extraction ===
    console.log('🎯 [ImageService] Using fallback theme extraction...');
    console.log('🎯 [ImageService] Running in Next.js environment, using local search terms fallback.');
      
      const promptWords = (userPrompt || '').toLowerCase().split(/\s+/);
      const businessKeywords = promptWords.filter(word => 
        word.length > 3 && 
        !['with', 'the', 'and', 'for', 'that', 'this', 'have', 'will', 'from', 'your', 'page', 'landing', 'website', 'create', 'sections', 'include'].includes(word)
      );
      
      if (businessKeywords.length > 0) {
        const primaryKeyword = businessKeywords[0];
      return [
          `${primaryKeyword} ${imageType}`,
          `${primaryKeyword} ${theme}`,
          `${primaryKeyword} professional`,
          `${primaryKeyword} modern`
        ];
    } else {
      return [`${theme} ${imageType}`, `${theme} professional`, `${theme} modern`];
    }
  }

  async getMockupImage(searchTerm?: string, prompt?: string, componentName?: string, requirements?: any): Promise<string> {
    console.log('[ImageService] Getting mockup image');
    console.log('[ImageService] Search term:', searchTerm);
    console.log('[ImageService] Prompt provided:', !!prompt);
    console.log('[ImageService] Component name:', componentName);
    console.log('[ImageService] Requirements available:', !!requirements);
    
    if (prompt) {
      console.log('[ImageService] Extracting theme from prompt');
      const theme = await this.extractThemeFromPrompt(prompt);
      console.log('[ImageService] Theme detected:', theme);
      
      // === ENHANCED COMPONENT-SPECIFIC SEARCH ===
      let searchQuery: string;
      
      if (componentName) {
        // Create component-specific search terms
        const componentSearchTerms = this.getComponentSpecificSearchTerms(componentName, theme);
        searchQuery = componentSearchTerms;
        console.log('[ImageService] Using component-specific search:', searchQuery, '(component:', componentName + ')');
      } else {
        // === ENHANCED: Use requirements for better search terms ===
        const themeTerms = await this.getThemeSearchTerms(theme, 'product', prompt, requirements);
        searchQuery = themeTerms[0] || `${theme} product`; // Use first theme term or fallback
        console.log('[ImageService] Using enhanced theme-aware search:', searchQuery, '(theme:', theme + ')');
      }
      
      // === PRIORITY: Use requirements when available for ANY component ===
      if (requirements && requirements.content && requirements.content.elements) {
        console.log('[ImageService] Using requirements for search terms...');
        const themeTerms = await this.getThemeSearchTerms(theme, 'product', prompt, requirements);
        searchQuery = themeTerms[0] || searchQuery; // Use requirements-based search as priority
        console.log('[ImageService] Requirements-based search query:', searchQuery);
      }
      
      console.log('[ImageService] Final search query:', searchQuery);
      
      // === COMPONENT-SPECIFIC CACHE KEY ===
      // Add component-specific uniqueness to prevent same images across components
      const uniqueSuffix = componentName ? `${componentName}-${Date.now()}` : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const cacheKey = `${searchQuery}-${uniqueSuffix}`;
      
      // Check pre-loaded images first
      if (this.preloadedImages.has(searchQuery)) {
        const preloadedImage = this.preloadedImages.get(searchQuery);
        console.log('[ImageService] ✅ Using pre-loaded mockup image:', preloadedImage);
        return preloadedImage!;
      }
      
      // Check global cache with component-specific key
      if (this.globalCache.has(cacheKey)) {
        const cachedImage = this.globalCache.get(cacheKey);
        console.log('[ImageService] ✅ Using cached mockup image:', cachedImage);
        return cachedImage!;
      }
      
    if (this.useUnsplash) {
      try {
          console.log('[ImageService] Attempting to fetch from Unsplash API...');
        const unsplashImage = await unsplashService.getRandomImage(searchQuery, {
          orientation: 'landscape',
          content_filter: 'low'
        });
        if (unsplashImage) {
            const sanitizedImage = this.sanitizeImageUrl(unsplashImage);
            console.log('[ImageService] ✅ Using Unsplash mockup image:', sanitizedImage);
            this.globalCache.set(cacheKey, sanitizedImage);
          return sanitizedImage;
        }
      } catch (error) {
          console.warn('[ImageService] ⚠️ Unsplash API error, falling back to local images:', error);
        }
      }
    }

    // Fallback to local mockup with component-specific selection
    console.log('[ImageService] 📷 Using local mockup image as fallback');
    const localMockups = [
      '/images/mockups/dashboard-light.jpg',
      '//images/mockups/dashboard-dark.jpg',
      '//images/mockups/product.jpg',
      '//images/mockups/product_02.jpg',
      '//images/mockups/girl.jpg',
      '//images/mockups/web-app.jpg'
    ];
    
    // Use component name to select different mockup if available
    let selectedMockup: string;
    if (componentName) {
      const componentIndex = componentName.length % localMockups.length;
      selectedMockup = localMockups[componentIndex];
      console.log('[ImageService] Selected component-specific local mockup:', selectedMockup, '(component:', componentName + ')');
    } else {
      selectedMockup = localMockups[Math.floor(Math.random() * localMockups.length)];
      console.log('[ImageService] Selected random local mockup:', selectedMockup);
    }
    
    return selectedMockup;
  }

  // === NEW: COMPONENT-SPECIFIC SEARCH TERMS ===
  private getComponentSpecificSearchTerms(componentName: string, theme: string): string {
    const componentMap: Record<string, string[]> = {
      'hero': [
        `${theme} hero image`,
        `${theme} main banner`,
        `${theme} landing page hero`,
        `${theme} showcase image`
      ],
      'features': [
        `${theme} features illustration`,
        `${theme} product features`,
        `${theme} service highlights`,
        `${theme} benefits image`
      ],
      'testimonials': [
        `${theme} customer testimonials`,
        `${theme} reviews image`,
        `${theme} feedback illustration`,
        `${theme} satisfaction image`
      ],
      'contact': [
        `${theme} contact form`,
        `${theme} communication`,
        `${theme} support image`,
        `${theme} help illustration`
      ],
      'about': [
        `${theme} about us`,
        `${theme} company story`,
        `${theme} team image`,
        `${theme} mission illustration`
      ],
      'pricing': [
        `${theme} pricing table`,
        `${theme} cost illustration`,
        `${theme} plans image`,
        `${theme} value proposition`
      ],
      'faq': [
        `${theme} frequently asked questions`,
        `${theme} help center`,
        `${theme} support illustration`,
        `${theme} information image`
      ],
      'footer': [
        `${theme} footer design`,
        `${theme} bottom section`,
        `${theme} contact information`,
        `${theme} social links`
      ]
    };

    const normalizedComponentName = componentName.toLowerCase().replace(/[^a-z]/g, '');
    const searchTerms = componentMap[normalizedComponentName] || componentMap['hero'];
    
    // Return a random search term from the component's list
    return searchTerms[Math.floor(Math.random() * searchTerms.length)];
  }

  /**
   * Get avatar image - ENHANCED to prioritize local avatars
   */
  async getAvatarImage(prompt?: string, componentName?: string): Promise<string> {
    console.log('[ImageService] Getting avatar image');
    console.log('[ImageService] Component name:', componentName);
    
    // ENHANCED: Always prioritize local avatars for consistency
    console.log('📷 Using local avatar image (prioritized)');
    const localAvatars = [
      'Avatar_woman.avif',
    'Avatar_woman2.avif', 
    'Avatar_woman3.avif',
    'Avatar_woman4.avif',
    'Avatar_woman5.avif',
    'Avatar_man.avif',
    'Avatar_man2.avif',
    'Avatar_man3.avif',
    'Avatar_man4.avif',
      'Avatar_man6.avif',
      'Avatar_man7.avif'
    ];
    
    // ENHANCED: Use component-specific selection for variety
    let selectedAvatar: string;
    if (componentName) {
      const componentIndex = componentName.charCodeAt(0) % localAvatars.length;
      selectedAvatar = localAvatars[componentIndex];
      console.log(`[ImageService] Selected component-specific avatar: ${selectedAvatar}`);
    } else {
      selectedAvatar = localAvatars[Math.floor(Math.random() * localAvatars.length)];
      console.log(`[ImageService] Selected random avatar: ${selectedAvatar}`);
    }
    
    return `/images/avatars/${selectedAvatar}`;
  }

  /**
   * Get hero/banner image
   */
  async getHeroImage(searchTerm?: string, prompt?: string): Promise<string> {
    if (this.useUnsplash) {
      try {
        let searchQuery = searchTerm || 'hero banner';
        
        // If prompt is provided, extract theme and use theme-specific search terms
        if (prompt) {
          const theme = await this.extractThemeFromPrompt(prompt);
          const themeTerms = await this.getThemeSearchTerms(theme, 'hero', prompt);
          searchQuery = themeTerms[Math.floor(Math.random() * themeTerms.length)];
          console.log(`🎯 Using theme-aware hero search: ${searchQuery} (theme: ${theme})`);
        }
        
        const unsplashImage = await unsplashService.getRandomImage(searchQuery, {
          orientation: 'landscape',
          content_filter: 'low'
        });
        
        if (unsplashImage) {
          console.log('✅ Using Unsplash hero image');
          return unsplashImage;
        }
      } catch (error) {
        console.warn('⚠️ Unsplash hero fetch failed, falling back to placeholder:', error);
      }
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/1200x600/E2E8F0/4A5568?text=Hero+Image';
  }

  /**
   * Get background/pattern image
   */
  async getBackgroundImage(searchTerm?: string): Promise<string> {
    if (this.useUnsplash) {
      try {
        const searchQuery = searchTerm || 'background pattern';
        const unsplashImage = await unsplashService.getImageByType('background', {
          orientation: 'squarish',
          content_filter: 'low'
        });
        
        if (unsplashImage) {
          console.log('✅ Using Unsplash background image');
          return unsplashImage;
        }
      } catch (error) {
        console.warn('⚠️ Unsplash background fetch failed, falling back to placeholder:', error);
      }
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/800x600/E2E8F0/4A5568?text=Background';
  }

  /**
   * Get illustration/graphic image
   */
  async getIllustrationImage(searchTerm?: string): Promise<string> {
    if (this.useUnsplash) {
      try {
        const searchQuery = searchTerm || 'illustration graphic';
        const unsplashImage = await unsplashService.getImageByType('illustration', {
          content_filter: 'low'
        });
        
        if (unsplashImage) {
          console.log('✅ Using Unsplash illustration image');
          return unsplashImage;
        }
      } catch (error) {
        console.warn('⚠️ Unsplash illustration fetch failed, falling back to placeholder:', error);
      }
    }

    // Fallback to placeholder
    return 'https://via.placeholder.com/600x400/E2E8F0/4A5568?text=Illustration';
  }

  /**
   * Get multiple images for galleries/carousels
   */
  async getMultipleImages(count: number, searchTerm: string): Promise<string[]> {
    if (this.useUnsplash) {
      try {
        // ENHANCED: Request extra images then deduplicate to guarantee uniqueness
        const unsplashImagesRaw = await unsplashService.getMultipleImages(count * 3, searchTerm, {
          orientation: 'landscape',
          content_filter: 'low'
        });
        
        // Deduplicate URLs and ensure we have enough unique images
        const uniqueImages = Array.from(new Set(unsplashImagesRaw));
        
        if (uniqueImages.length >= count) {
          const selectedImages = uniqueImages.slice(0, count);
          const sanitizedImages = selectedImages.map(img => this.sanitizeImageUrl(img));
          console.log(`✅ Using ${sanitizedImages.length} unique Unsplash images for gallery`);
          return sanitizedImages;
        } else {
          console.warn(`⚠️ Only ${uniqueImages.length} unique images available, requesting more...`);
          // Try to get more images with different search terms
          const additionalImages = await unsplashService.getMultipleImages(count * 2, `${searchTerm} vintage`, {
            orientation: 'landscape',
            content_filter: 'low'
          });
          
          const allImages = [...uniqueImages, ...additionalImages];
          const finalUniqueImages = Array.from(new Set(allImages));
          
          if (finalUniqueImages.length >= count) {
            const selectedImages = finalUniqueImages.slice(0, count);
            const sanitizedImages = selectedImages.map(img => this.sanitizeImageUrl(img));
            console.log(`✅ Using ${sanitizedImages.length} unique Unsplash images (with additional search)`);
            return sanitizedImages;
          }
        }
      } catch (error) {
        console.warn('⚠️ Unsplash multiple images fetch failed, falling back to placeholders:', error);
      }
    }

    // Fallback to unique placeholders
    return Array.from({ length: count }, (_, i) => 
      `https://via.placeholder.com/400x300/E2E8F0/4A5568?text=Gallery+Image+${i + 1}`
    );
  }

  /**
   * Get per-item images for gallery using item-specific semantics
   * For each item, we derive a unique search query (service + clientName, etc.),
   * optionally refined by LLM, then fetch a unique Unsplash image.
   */
  async getGalleryItemImages(items: Array<{ service?: string; clientName?: string; title?: string; description?: string }>, prompt?: string, componentName?: string): Promise<string[]> {
    const { refineGallerySearch } = await import('./image-query-refiner');
    const results: string[] = [];
    for (const item of items) {
      const query = await refineGallerySearch(item, prompt);
      const uniqueKey = `${componentName || 'gallery'}-${query}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      if (this.useUnsplash) {
        try {
          const img = await unsplashService.getRandomImage(query, { orientation: 'landscape', content_filter: 'low' });
          if (img) {
            const url = this.sanitizeImageUrl(img);
            this.globalCache.set(uniqueKey, url);
            results.push(url);
            continue;
          }
        } catch {
          // fall through to fallback
        }
      }
      // fallback
      results.push(this.getRandomLocalImage('mockups'));
    }
    return results;
  }

  /**
   * Get icon (always uses Lucide icons, not Unsplash)
   */
  getIconImage(iconName: string = 'settings'): string {
    // Icons remain as Lucide React icons, not Unsplash images
    return `https://via.placeholder.com/48x48/4F46E5/FFFFFF?text=${encodeURIComponent(iconName)}`;
  }

  /**
   * Get logo (always uses placeholder, not Unsplash)
   */
  getLogoImage(): string {
    // Logos remain as placeholders, not Unsplash images
    return 'https://via.placeholder.com/120x60/1F2937/FFFFFF?text=LOGO';
  }

  /**
   * Toggle Unsplash usage
   */
  setUseUnsplash(use: boolean): void {
    this.useUnsplash = use;
    console.log(`🔄 Unsplash usage ${use ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle local fallback
   */
  setFallbackToLocal(fallback: boolean): void {
    this.fallbackToLocal = fallback;
    console.log(`🔄 Local fallback ${fallback ? 'enabled' : 'disabled'}`);
  }

  private sanitizeImageUrl(url: string): string {
    // Remove common formatting issues that cause malformed URLs
    return url
      .replace(/^""/, '') // Remove leading double quotes
      .replace(/""$/, '') // Remove trailing double quotes
      .replace(/^"|"$/g, '') // Remove single quotes at start/end
      .trim(); // Remove whitespace
  }

  /**
   * Extract image description from path and fetch relevant Unsplash image
   * ENHANCED: Now uses altText as search query for more accurate image fetching
   */
  async getImageFromDescription(imagePath: string, prompt?: string, altText?: string, componentName?: string): Promise<string> {
    console.log('🌸 [ImageService] Getting image from description:', imagePath);
    console.log('🌸 [ImageService] AltText provided:', altText);
    console.log('🌸 [ImageService] Component name:', componentName);
    
    // ENHANCED: Use altText as primary search query if available
    let searchDescription = altText || '';
    
    if (!searchDescription) {
      // Fallback to filename extraction
    const filename = imagePath.split('/').pop() || '';
      searchDescription = filename
      .replace(/\.(jpg|jpeg|png|webp|gif|svg)$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();
    }
    
    console.log('🌸 [ImageService] Final search description:', searchDescription);
    
    // ENHANCED: Create component-specific cache key
    const cacheKey = `${componentName || 'unknown'}-${searchDescription}-${prompt || 'no-prompt'}`;
    
    if (this.globalCache.has(cacheKey)) {
      const cachedImage = this.globalCache.get(cacheKey);
      console.log('🌸 [ImageService] ✅ Using component-specific cached image:', cachedImage);
      return cachedImage!;
    }
    
    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🌸 [ImageService] ⏳ Waiting for pending request for:', cacheKey);
      return await this.pendingRequests.get(cacheKey)!;
    }
    
    // Create new request promise
    const requestPromise = this.fetchImageWithCache(searchDescription, prompt, cacheKey, componentName);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchImageWithCache(description: string, prompt?: string, cacheKey?: string, componentName?: string): Promise<string> {
    if (this.useUnsplash) {
      try {
        let searchQuery = description;
        
        // ENHANCED: Use component-specific search terms
        if (componentName && prompt) {
          const theme = await this.extractThemeFromPrompt(prompt);
          const componentSpecificSearch = this.getComponentSpecificSearchTerms(componentName, theme);
          searchQuery = `${componentSpecificSearch} ${description}`;

          console.log('🌸 [ImageService] Enhanced search query with component-specific terms:', searchQuery);
        } else if (prompt) {
          const theme = await this.extractThemeFromPrompt(prompt);
          const themeTerms = await this.getThemeSearchTerms(theme, 'product', prompt);
          searchQuery = `${theme} ${description}`;

          console.log('🌸 [ImageService] Enhanced search query with theme:', searchQuery);
        }
        
        // Check pre-loaded images first
        if (this.preloadedImages.has(searchQuery)) {
          const preloadedImage = this.preloadedImages.get(searchQuery);
          console.log('🌸 [ImageService] ✅ Using pre-loaded image:', preloadedImage);
          if (cacheKey) {
            this.globalCache.set(cacheKey, preloadedImage!);
            this.imageCache.set(cacheKey, preloadedImage!);
          }
          return preloadedImage!;
        }
        
        console.log('🌸 [ImageService] Attempting to fetch from Unsplash API...');
        console.log('🌸 [ImageService] Search query:', searchQuery);
        
        const unsplashImage = await unsplashService.getRandomImage(searchQuery, {
          orientation: 'landscape',
          content_filter: 'low'
        });
        
        if (unsplashImage) {
          const sanitizedImage = this.sanitizeImageUrl(unsplashImage);
          console.log('🌸 [ImageService] ✅ Successfully fetched Unsplash image:', sanitizedImage);
          // Cache in both local and global cache
          if (cacheKey) {
            this.globalCache.set(cacheKey, sanitizedImage);
            this.imageCache.set(cacheKey, sanitizedImage);
          }
          return sanitizedImage;
        } else {
          console.log('🌸 [ImageService] ❌ No Unsplash image found for description, falling back');
        }
      } catch (error) {
        console.warn('🌸 [ImageService] ⚠️ Unsplash API error, falling back to local images:', error);
      }
    }
    
    console.log('🌸 [ImageService] 📷 Using local mockup image as fallback');
    const localMockups = [
      '/images/mockups/dashboard-light.jpg',
      '/images/mockups/dashboard-dark.jpg',
      '/images/mockups/product.jpg',
      '/images/mockups/product_02.jpg',
      '/images/mockups/girl.jpg',
      '/images/mockups/web-app.jpg'
    ];
    
    // ENHANCED: Use component-specific random selection to ensure variety
    const componentIndex = componentName ? componentName.charCodeAt(0) % localMockups.length : 0;
    const randomMockup = localMockups[componentIndex];
    
    console.log('🌸 [ImageService] Selected component-specific local mockup:', randomMockup);
    
    // Cache the fallback result too
    if (cacheKey) {
      this.globalCache.set(cacheKey, randomMockup);
      this.imageCache.set(cacheKey, randomMockup);
    }
    return randomMockup;
  }
}

// Create singleton instance
const enhancedImageService = new EnhancedImageService();

export { enhancedImageService, EnhancedImageService }; 