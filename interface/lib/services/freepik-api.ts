// === FREEPIK API SERVICE - COMMENTED OUT FOR UNSPLASH MIGRATION ===
// Shared service for fetching images from Freepik stock content API
// Used by all Create modes (Generic, Single, Abstract, Vision)

interface FreepikImage {
  id: number;
  title: string;
  url: string;
  filename: string;
  licenses: Array<{
    type: string;
    url: string;
  }>;
  products: Array<{
    type: string;
    url: string;
  }>;
  meta: {
    published_at: string;
    is_new: boolean;
    available_formats: {
      jpg?: {
        total: number;
        items: Array<{
          id: number;
          name?: string;
          colorspace?: string;
          size: number;
        }>;
      };
      png?: {
        total: number;
        items: Array<{
          id: number;
          size: number;
        }>;
      };
    };
  };
  image: {
    type: 'photo' | 'vector' | 'illustration';
    orientation: 'square' | 'portrait' | 'landscape';
    source: {
      url: string;
      key: string;
      size: string;
    };
  };
  related: {
    serie: any[];
    others: any[];
    keywords: any[];
  };
  stats: {
    downloads: number;
    likes: number;
  };
  author: {
    id: number;
    name: string;
    avatar: string;
    slug: string;
  };
}

interface FreepikSearchResponse {
  data: FreepikImage[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface FreepikSearchParams {
  term?: string;
  page?: number;
  limit?: number;
  order?: 'relevance' | 'recent';
  filters?: {
    orientation?: 'square' | 'portrait' | 'landscape';
    type?: 'photo' | 'vector' | 'illustration';
    license?: 'freemium' | 'premium';
  };
}

class FreepikAPIService {
  private apiKey: string;
  private baseUrl: string;
  private searchCache: Map<string, string> = new Map(); // Cache for search results

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    const envUrl = process.env.FREEPIK_API_URL || 'https://api.freepik.com/v1';
    this.baseUrl = envUrl.endsWith('/resources') ? envUrl.replace('/resources', '') : envUrl; // Prevent double /resources

    console.log('🌸 [FreepikAPI] API Key loaded:', this.apiKey ? 'YES' : 'NO');
    console.log('🌸 [FreepikAPI] API Key length:', this.apiKey.length);
    console.log('🌸 [FreepikAPI] Base URL:', this.baseUrl);
    console.log('🌸 [FreepikAPI] Full search URL will be:', `${this.baseUrl}/resources/search`);

    if (!this.apiKey) {
      console.error('🌸 [FreepikAPI] ❌ FREEPIK_API_KEY not found in environment variables');
      console.error('🌸 [FreepikAPI] Available env vars:', Object.keys(process.env).filter(key => key.includes('FREEPIK')));
      console.error('🌸 [FreepikAPI] Please set FREEPIK_API_KEY in your /interface/.env file');
    }
    if (!process.env.FREEPIK_API_URL) {
      console.warn('🌸 [FreepikAPI] ⚠️ FREEPIK_API_URL not found, using default URL');
    }
    this.testEnvironmentVariables(); // Call test method for debugging
  }

  /**
   * Test method to verify environment variables
   */
  testEnvironmentVariables(): void {
    console.log('🌸 [FreepikAPI] === ENVIRONMENT VARIABLES TEST ===');
    console.log('🌸 [FreepikAPI] All env vars with FREEPIK:', Object.keys(process.env).filter(key => key.includes('FREEPIK')));
    console.log('🌸 [FreepikAPI] FREEPIK_API_KEY length:', process.env.FREEPIK_API_KEY?.length || 0);
    console.log('🌸 [FreepikAPI] FREEPIK_API_URL:', process.env.FREEPIK_API_URL);
    console.log('🌸 [FreepikAPI] Current working directory:', process.cwd());
    console.log('🌸 [FreepikAPI] Node environment:', process.env.NODE_ENV);
    console.log('🌸 [FreepikAPI] === END ENVIRONMENT TEST ===');
  }

  /**
   * Test method to verify API key and connectivity
   */
  async testConnection(): Promise<boolean> {
    console.log('🌸 [FreepikAPI] Testing API connection...');
    console.log('🌸 [FreepikAPI] API Key present:', !!this.apiKey);
    console.log('🌸 [FreepikAPI] Base URL:', this.baseUrl);

    if (!this.apiKey) {
      console.error('🌸 [FreepikAPI] ❌ No API key available');
      return false;
    }

    try {
      // Test with a simple search
      const response = await this.searchImages({
        term: 'test',
        limit: 1
      });

      console.log('🌸 [FreepikAPI] ✅ Connection test successful');
      return true;
    } catch (error) {
      console.error('🌸 [FreepikAPI] ❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * Search for images on Freepik
   */
  async searchImages(params: FreepikSearchParams): Promise<FreepikSearchResponse> {
    console.log('🌸 [FreepikAPI] Searching images with params:', params);

    const queryParams = new URLSearchParams();

    if (params.term) {
      queryParams.append('term', params.term);
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.order) {
      queryParams.append('order', params.order);
    }

    // Add filters as individual query parameters (not JSON)
    if (params.filters) {
      if (params.filters.type) {
        queryParams.append('type', params.filters.type);
      }
      if (params.filters.orientation) {
        queryParams.append('orientation', params.filters.orientation);
      }
      if (params.filters.license) {
        queryParams.append('license', params.filters.license);
      }
    }

    console.log('🌸 [FreepikAPI] Query params:', queryParams.toString());

    const url = `${this.baseUrl}/resources?${queryParams.toString()}`;
    console.log('🌸 [FreepikAPI] Making request to:', url);
    console.log('🌸 [FreepikAPI] API Key present:', !!this.apiKey);
    console.log('🌸 [FreepikAPI] API Key first 10 chars:', this.apiKey.substring(0, 10) + '...');

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced from 10 to 5 seconds

      const response = await fetch(url, {
        headers: {
          'x-freepik-api-key': this.apiKey, // Correct header format from docs
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('🌸 [FreepikAPI] Response status:', response.status);
      console.log('🌸 [FreepikAPI] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌸 [FreepikAPI] ❌ API request failed:', response.status, errorText);
        throw new Error(`Freepik API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🌸 [FreepikAPI] ✅ Search successful, data received');
      console.log('🌸 [FreepikAPI] Results count:', data.data?.length || 0);

      return data as FreepikSearchResponse;
    } catch (error) {
      console.error('🌸 [FreepikAPI] ❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Get a random image based on search criteria
   */
  async getRandomImage(searchTerm: string, options: {
    type?: 'photo' | 'vector' | 'illustration';
    orientation?: 'square' | 'portrait' | 'landscape';
    license?: 'freemium' | 'premium';
  } = {}): Promise<string | null> {
    console.log('🌸 [FreepikAPI] Getting random image for search term:', searchTerm);
    console.log('🌸 [FreepikAPI] Options:', options);
    
    // Create cache key from search term and options
    const cacheKey = `${searchTerm}-${options.type || 'any'}-${options.orientation || 'any'}-${options.license || 'any'}`;
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cachedImage = this.searchCache.get(cacheKey);
      console.log('🌸 [FreepikAPI] ✅ Using cached image for:', searchTerm);
      return cachedImage!;
    }
    
    try {
      const response = await this.searchImages({
        term: searchTerm,
        limit: 3, // Reduced from 5 to 3 for even faster response
        order: 'relevance',
        filters: {
          type: options.type,
          orientation: options.orientation,
          license: options.license,
        },
      });
      
      console.log('🌸 [FreepikAPI] Search response received');
      console.log('🌸 [FreepikAPI] Results found:', response.data?.length || 0);
      
      if (!response.data || response.data.length === 0) {
        console.log('🌸 [FreepikAPI] ❌ No images found for search term:', searchTerm);
        return null;
      }
      
      // Select a random image from the results
      const randomIndex = Math.floor(Math.random() * response.data.length);
      const randomImage = response.data[randomIndex];
      
      console.log('🌸 [FreepikAPI] Selected random image at index:', randomIndex);
      console.log('🌸 [FreepikAPI] Image title:', randomImage.title);
      console.log('🌸 [FreepikAPI] Image URL:', randomImage.image.source.url);
      
      // Cache the result
      this.searchCache.set(cacheKey, randomImage.image.source.url);
      
      return randomImage.image.source.url;
    } catch (error) {
      console.error('🌸 [FreepikAPI] ❌ Failed to get random Freepik image:', error);
      return null;
    }
  }

  /**
   * Get image by specific type for components
   */
  async getImageByType(type: 'hero' | 'product' | 'avatar' | 'background' | 'illustration', options: {
    orientation?: 'square' | 'portrait' | 'landscape';
    license?: 'freemium' | 'premium';
  } = {}): Promise<string | null> {
    const searchTerms = {
      hero: ['hero image', 'banner', 'header image', 'main image'],
      product: ['product', 'product photography', 'product shot'],
      avatar: ['portrait', 'headshot', 'profile picture', 'person'],
      background: ['background', 'pattern', 'texture'],
      illustration: ['illustration', 'graphic', 'design'],
    };

    const terms = searchTerms[type] || ['image'];
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];

    return this.getRandomImage(randomTerm, {
      type: type === 'illustration' ? 'illustration' : 'photo',
      orientation: options.orientation,
      license: options.license,
    });
  }

  /**
   * Get multiple images for a component
   */
  async getMultipleImages(count: number, searchTerm: string, options: {
    type?: 'photo' | 'vector' | 'illustration';
    orientation?: 'square' | 'portrait' | 'landscape';
    license?: 'freemium' | 'premium';
  } = {}): Promise<string[]> {
    const images: string[] = [];

    try {
      const response = await this.searchImages({
        term: searchTerm,
        limit: count * 2, // Get more results to ensure we have enough
        order: 'relevance',
        filters: {
          type: options.type,
          orientation: options.orientation,
          license: options.license,
        },
      });

      if (response.data && response.data.length > 0) {
        // Shuffle the results and take the requested count
        const shuffled = response.data.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        images.push(...selected.map(img => img.image.source.url));
      }
    } catch (error) {
      console.error('❌ Failed to get multiple Freepik images:', error);
    }

    return images;
  }
}

// Create singleton instance
const freepikService = new FreepikAPIService();

export { freepikService, FreepikAPIService };
export type { FreepikImage, FreepikSearchParams, FreepikSearchResponse }; 