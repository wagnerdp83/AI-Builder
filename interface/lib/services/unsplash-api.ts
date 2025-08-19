// === UNSPLASH API SERVICE ===
// Shared service for fetching images from Unsplash API
// Used by all Create modes (Generic, Single, Abstract, Vision)

interface UnsplashImage {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  likes: number;
  liked_by_user: boolean;
  description: string;
  alt_description: string;
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string;
    bio: string;
    location: string;
    total_likes: number;
    total_photos: number;
    total_collections: number;
    instagram_username: string;
    twitter_username: string;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
    };
  };
  current_user_collections: any[];
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

interface UnsplashSearchParams {
  query?: string;
  page?: number;
  per_page?: number;
  order_by?: 'latest' | 'relevant';
  orientation?: 'landscape' | 'portrait' | 'squarish';
  content_filter?: 'low' | 'high';
  color?: string;
  collections?: string;
}

class UnsplashAPIService {
  private accessKey: string;
  private baseUrl: string;
  private searchCache: Map<string, string> = new Map(); // Cache for search results

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
    this.baseUrl = 'https://api.unsplash.com';

    console.log('[UnsplashAPI] Access Key loaded:', this.accessKey ? 'YES' : 'NO');
    console.log('[UnsplashAPI] Access Key length:', this.accessKey.length);
    console.log('[UnsplashAPI] Base URL:', this.baseUrl);
    
    this.testEnvironmentVariables();
  }

  private testEnvironmentVariables(): void {
    console.log('[UnsplashAPI] Environment variables:');
    console.log('[UnsplashAPI] - UNSPLASH_ACCESS_KEY:', this.accessKey ? 'SET' : 'NOT SET');
    console.log('[UnsplashAPI] - Current working directory:', process.cwd());
    console.log('[UnsplashAPI] - Node environment:', process.env.NODE_ENV);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[UnsplashAPI] Testing connection...');
      const response = await this.searchImages({ query: 'test', per_page: 1 });
      console.log('[UnsplashAPI] ✅ Connection test successful');
      return true;
    } catch (error) {
      console.log('[UnsplashAPI] ❌ Connection test failed:', error);
      return false;
    }
  }

  async searchImages(params: UnsplashSearchParams): Promise<UnsplashSearchResponse> {
    if (!this.accessKey) {
      throw new Error('Unsplash Access Key not configured');
    }

    const url = new URL('/search/photos', this.baseUrl);
    
    if (params.query) url.searchParams.append('query', params.query);
    if (params.page) url.searchParams.append('page', params.page.toString());
    if (params.per_page) url.searchParams.append('per_page', params.per_page.toString());
    if (params.order_by) url.searchParams.append('order_by', params.order_by);
    if (params.orientation) url.searchParams.append('orientation', params.orientation);
    if (params.content_filter) url.searchParams.append('content_filter', params.content_filter);
    if (params.color) url.searchParams.append('color', params.color);
    if (params.collections) url.searchParams.append('collections', params.collections);

    console.log('[UnsplashAPI] Searching images with params:', params);
    console.log('[UnsplashAPI] Query params:', url.searchParams.toString());
    console.log('[UnsplashAPI] Making request to:', url.toString());
    console.log('[UnsplashAPI] Access Key present:', !!this.accessKey);
    console.log('[UnsplashAPI] Access Key first 10 chars:', this.accessKey.substring(0, 10) + '...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[UnsplashAPI] Response status:', response.status);
      console.log('[UnsplashAPI] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[UnsplashAPI] ❌ API request failed:', response.status, errorText);
        throw new Error(`Unsplash API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[UnsplashAPI] ✅ Search successful, data received');
      console.log('[UnsplashAPI] Results count:', data.results?.length || 0);
      console.log('[UnsplashAPI] Search response received');
      console.log('[UnsplashAPI] Results found:', data.results?.length || 0);

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Unsplash API request timed out');
      }
      throw error;
    }
  }

  async getRandomImage(searchTerm: string, options: {
    orientation?: 'landscape' | 'portrait' | 'squarish';
    content_filter?: 'low' | 'high';
  } = {}): Promise<string | null> {
    // Check cache first
    const cacheKey = `${searchTerm}-${JSON.stringify(options)}`;
    if (this.searchCache.has(cacheKey)) {
      console.log('[UnsplashAPI] ✅ Using cached image for:', searchTerm);
      return this.searchCache.get(cacheKey) || null;
    }

    console.log('[UnsplashAPI] Getting random image for search term:', searchTerm);
    console.log('[UnsplashAPI] Options:', options);

    try {
      const response = await this.searchImages({
        query: searchTerm,
        per_page: 3,
        order_by: 'relevant',
        orientation: options.orientation || 'landscape',
        content_filter: options.content_filter || 'low'
      });

      if (response.results && response.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * response.results.length);
        const selectedImage = response.results[randomIndex];
        
        console.log('[UnsplashAPI] Selected random image at index:', randomIndex);
        console.log('[UnsplashAPI] Image title:', selectedImage.description || selectedImage.alt_description);
        console.log('[UnsplashAPI] Image URL:', selectedImage.urls.regular);

        // Cache the result
        this.searchCache.set(cacheKey, selectedImage.urls.regular);
        
        return selectedImage.urls.regular;
      }

      console.log('[UnsplashAPI] ❌ No images found for search term:', searchTerm);
      return null;
    } catch (error) {
      console.log('[UnsplashAPI] ❌ Failed to get random Unsplash image:', error);
      return null;
    }
  }

  async getImageByType(type: 'hero' | 'product' | 'avatar' | 'background' | 'illustration', options: {
    orientation?: 'landscape' | 'portrait' | 'squarish';
    content_filter?: 'low' | 'high';
  } = {}): Promise<string | null> {
    const searchTerms = {
      hero: ['hero', 'banner', 'header'],
      product: ['product', 'item', 'goods'],
      avatar: ['portrait', 'person', 'profile'],
      background: ['background', 'wallpaper', 'texture'],
      illustration: ['illustration', 'art', 'drawing']
    };

    const terms = searchTerms[type] || ['photo'];
    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
    
    return this.getRandomImage(randomTerm, options);
  }

  async getMultipleImages(count: number, searchTerm: string, options: {
    orientation?: 'landscape' | 'portrait' | 'squarish';
    content_filter?: 'low' | 'high';
  } = {}): Promise<string[]> {
    try {
      const response = await this.searchImages({
        query: searchTerm,
        per_page: count,
        order_by: 'relevant',
        orientation: options.orientation || 'landscape',
        content_filter: options.content_filter || 'low'
      });

      return response.results?.map(img => img.urls.regular) || [];
    } catch (error) {
      console.log('[UnsplashAPI] ❌ Failed to get multiple images:', error);
      return [];
    }
  }
}

// Export singleton instance
export const unsplashService = new UnsplashAPIService(); 