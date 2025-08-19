// Pexels Video Service for dynamic video fetching
// Uses PEXEL_ACCESS_KEY from environment variables

interface PexelsVideoResponse {
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
}

interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideoResponse[];
}

class PexelsVideoService {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/videos';
  private cache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = process.env.PEXEL_ACCESS_KEY || '';
    if (!this.apiKey) {
      console.warn('🎬 [PexelsVideoService] ⚠️ PEXEL_ACCESS_KEY not found, will use fallback videos');
    }
  }

  /**
   * Test connection to Pexels API
   */
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/search?query=test&per_page=1`, {
        headers: {
          'Authorization': this.apiKey
        }
      });
      return response.ok;
    } catch (error) {
      console.error('🎬 [PexelsVideoService] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get a random video URL based on search terms
   */
  async getRandomVideo(searchTerms: string, options: {
    orientation?: 'landscape' | 'portrait' | 'square';
    size?: 'large' | 'medium' | 'small';
    duration?: 'short' | 'medium' | 'long';
  } = {}): Promise<string> {
    const cacheKey = `${searchTerms}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('🎬 [PexelsVideoService] ✅ Using cached video');
      return this.cache.get(cacheKey)!;
    }

    if (!this.apiKey) {
      console.log('🎬 [PexelsVideoService] 📹 Using fallback video (no API key)');
      return '/images/videos/placeholder.mov';
    }

    try {
      console.log('🎬 [PexelsVideoService] Fetching video for:', searchTerms);
      
      const queryParams = new URLSearchParams({
        query: searchTerms,
        per_page: '10', // Get multiple videos to choose from
        orientation: options.orientation || 'landscape',
        size: options.size || 'large'
      });

      const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data: PexelsSearchResponse = await response.json();
      
      if (data.videos && data.videos.length > 0) {
        // Select a random video from the results
        const randomIndex = Math.floor(Math.random() * data.videos.length);
        const video = data.videos[randomIndex];
        
        // Get the best quality video file
        const videoFile = video.video_files
          .filter(file => file.file_type === 'video/mp4')
          .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
        
        if (videoFile) {
          const videoUrl = videoFile.link;
          console.log('🎬 [PexelsVideoService] ✅ Video fetched:', videoUrl.substring(0, 50) + '...');
          
          // Cache the result
          this.cache.set(cacheKey, videoUrl);
          return videoUrl;
        }
      }
      
      throw new Error('No suitable video found');
      
    } catch (error) {
      console.error('🎬 [PexelsVideoService] ❌ Video fetch failed:', error);
      console.log('🎬 [PexelsVideoService] 📹 Using fallback video');
      return '/images/videos/placeholder.mov';
    }
  }

  /**
   * Get multiple videos for galleries or carousels
   */
  async getMultipleVideos(count: number, searchTerms: string): Promise<string[]> {
    if (!this.apiKey) {
      console.log('🎬 [PexelsVideoService] 📹 Using fallback videos for gallery');
      return Array.from({ length: count }, () => '/images/videos/placeholder.mov');
    }

    try {
      console.log('🎬 [PexelsVideoService] Fetching multiple videos for:', searchTerms);
      
      const queryParams = new URLSearchParams({
        query: searchTerms,
        per_page: count.toString(),
        orientation: 'landscape'
      });

      const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data: PexelsSearchResponse = await response.json();
      
      if (data.videos && data.videos.length > 0) {
        const videoUrls: string[] = [];
        
        for (const video of data.videos.slice(0, count)) {
          const videoFile = video.video_files
            .filter(file => file.file_type === 'video/mp4')
            .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
          
          if (videoFile) {
            videoUrls.push(videoFile.link);
          }
        }
        
        console.log(`🎬 [PexelsVideoService] ✅ Fetched ${videoUrls.length} videos`);
        return videoUrls;
      }
      
      throw new Error('No videos found');
      
    } catch (error) {
      console.error('🎬 [PexelsVideoService] ❌ Multiple videos fetch failed:', error);
      console.log('🎬 [PexelsVideoService] 📹 Using fallback videos');
      return Array.from({ length: count }, () => '/images/videos/placeholder.mov');
    }
  }

  /**
   * Get video by type (hero, background, product, etc.)
   */
  async getVideoByType(type: string, searchTerms?: string): Promise<string> {
    const typeMap: Record<string, string> = {
      'hero': 'hero video',
      'background': 'background video',
      'product': 'product showcase',
      'testimonial': 'testimonial video',
      'gallery': 'gallery video',
      'showcase': 'showcase video'
    };

    const searchQuery = searchTerms || typeMap[type] || type;
    return this.getRandomVideo(searchQuery, {
      orientation: 'landscape',
      size: 'large'
    });
  }
}

// Create singleton instance
const pexelsVideoService = new PexelsVideoService();

export { pexelsVideoService, PexelsVideoService }; 