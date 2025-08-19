// === PEXELS VIDEO API SERVICE ===
// Service for fetching videos from Pexels API
// Used by Generic Pipeline for video content

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
}

interface PexelsSearchParams {
  query?: string;
  page?: number;
  per_page?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  size?: 'large' | 'medium' | 'small';
  locale?: string;
}

class PexelsVideoAPIService {
  private accessKey: string;
  private baseUrl: string;
  private maxRetries: number = 3;
  private timeoutMs: number = 10000;

  constructor() {
    this.accessKey = process.env.PEXEL_ACCESS_KEY || '';
    this.baseUrl = 'https://api.pexels.com/videos';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.searchVideos({ query: 'test', per_page: 1 });
      return response && response.videos && Array.isArray(response.videos);
    } catch (error) {
      console.error('[PexelsVideoAPI] Connection test failed:', error);
      return false;
    }
  }

  async searchVideos(params: PexelsSearchParams): Promise<PexelsSearchResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('query', params.query);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.orientation) queryParams.append('orientation', params.orientation);
    if (params.size) queryParams.append('size', params.size);
    if (params.locale) queryParams.append('locale', params.locale);

    const url = `${this.baseUrl}/search?${queryParams.toString()}`;
    return await this.makeRequest(url);
  }

  async getRandomVideo(searchTerm: string, options: PexelsSearchParams = {}): Promise<string | null> {
    try {
      const response = await this.searchVideos({ 
        query: searchTerm, 
        per_page: 10,
        ...options 
      });
      
      if (response.videos && response.videos.length > 0) {
        const video = response.videos[Math.floor(Math.random() * response.videos.length)];
        const videoFile = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];
        return videoFile?.link || null;
      }
      
      return null;
    } catch (error) {
      console.error('[PexelsVideoAPI] Error fetching video:', error);
      return null;
    }
  }

  private async makeRequest(url: string, retryCount: number = 0): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'Authorization': this.accessKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        } else if (response.status === 522) {
          throw new Error('Connection timed out');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error(`[PexelsVideoAPI] Request failed (attempt ${retryCount + 1}):`, error.message);
      
      // Retry logic for specific errors
      if (retryCount < this.maxRetries) {
        if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('timed out')) {
          console.log(`[PexelsVideoAPI] Timeout detected, retrying in ${Math.pow(2, retryCount) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return this.makeRequest(url, retryCount + 1);
        } else if (error.message.includes('rate limit')) {
          console.log(`[PexelsVideoAPI] Rate limit hit, retrying in ${Math.pow(2, retryCount) * 2000}ms...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 2000));
          return this.makeRequest(url, retryCount + 1);
        }
      }
      
      throw error;
    }
  }

  // Fallback video URLs for when API fails
  getFallbackVideos(): string[] {
    return [
      '/images/videos/placeholder.mov'
    ];
  }

  getRandomFallbackVideo(): string {
    const fallbackVideos = this.getFallbackVideos();
    return fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];
  }
}

// Export singleton instance
export const pexelsVideoService = new PexelsVideoAPIService(); 