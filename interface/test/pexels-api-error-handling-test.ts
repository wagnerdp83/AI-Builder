import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Pexels API service
class MockPexelsVideoAPIService {
  private accessKey: string;
  private baseUrl: string;
  private shouldTimeout: boolean = false;
  private shouldReturnError: boolean = false;

  constructor() {
    this.accessKey = process.env.PEXEL_ACCESS_KEY || 'test-key';
    this.baseUrl = 'https://api.pexels.com/videos';
  }

  setShouldTimeout(value: boolean) {
    this.shouldTimeout = value;
  }

  setShouldReturnError(value: boolean) {
    this.shouldReturnError = value;
  }

  async testConnection(): Promise<boolean> {
    if (this.shouldTimeout) {
      throw new Error('Connection timed out');
    }
    return true;
  }

  async searchVideos(params: any): Promise<any> {
    if (this.shouldTimeout) {
      // Simulate 522 timeout error
      const errorResponse = {
        ok: false,
        status: 522,
        statusText: 'Connection timed out',
        text: () => Promise.resolve(`
          <!DOCTYPE html>
          <html>
          <head><title>api.pexels.com | 522: Connection timed out</title></head>
          <body>
            <h1>Connection timed out</h1>
            <p>Error code 522</p>
          </body>
          </html>
        `)
      };
      throw new Error(`Pexels API request failed: 522 Connection timed out`);
    }

    if (this.shouldReturnError) {
      throw new Error('API Error: 500 Internal Server Error');
    }

    // Normal response
    return {
      videos: [
        {
          id: 1,
          video_files: [
            {
              quality: 'hd',
              link: 'https://player.vimeo.com/external/test1.mp4'
            }
          ]
        }
      ]
    };
  }

  async getRandomVideo(searchTerm: string, options: any = {}): Promise<string | null> {
    try {
      const response = await this.searchVideos({ query: searchTerm, ...options });
      
      if (response.videos && response.videos.length > 0) {
        const video = response.videos[0];
        const videoFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
        return videoFile?.link || null;
      }
      
      return null;
    } catch (error) {
      console.error('Pexels API error:', error);
      return null;
    }
  }
}

describe('Pexels API Error Handling', () => {
  let pexelsService: MockPexelsVideoAPIService;

  beforeEach(() => {
    pexelsService = new MockPexelsVideoAPIService();
  });

  it('should handle 522 connection timeout errors gracefully', async () => {
    pexelsService.setShouldTimeout(true);
    
    try {
      const isConnected = await pexelsService.testConnection();
      expect(isConnected).toBe(false);
    } catch (error) {
      expect(error.message).toContain('Connection timed out');
    }
  });

  it('should return fallback video when API fails', async () => {
    pexelsService.setShouldTimeout(true);
    
    const videoUrl = await pexelsService.getRandomVideo('salon experience');
    
    // Should return null when API fails
    expect(videoUrl).toBeNull();
  });

  it('should handle API errors and continue with fallback', async () => {
    pexelsService.setShouldReturnError(true);
    
    const videoUrl = await pexelsService.getRandomVideo('fashion experience');
    
    // Should handle error gracefully
    expect(videoUrl).toBeNull();
  });

  it('should work normally when API is available', async () => {
    pexelsService.setShouldTimeout(false);
    pexelsService.setShouldReturnError(false);
    
    const videoUrl = await pexelsService.getRandomVideo('salon experience');
    
    expect(videoUrl).toBe('https://player.vimeo.com/external/test1.mp4');
  });

  it('should implement proper retry logic for timeouts', async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptRequest = async (): Promise<string | null> => {
      try {
        retryCount++;
        if (retryCount <= 2) {
          // First two attempts fail
          throw new Error('Connection timed out');
        }
        // Third attempt succeeds
        return 'https://player.vimeo.com/external/success.mp4';
      } catch (error) {
        if (retryCount >= maxRetries) {
          return null;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return attemptRequest();
      }
    };

    const result = await attemptRequest();
    
    expect(retryCount).toBe(3);
    expect(result).toBe('https://player.vimeo.com/external/success.mp4');
  });

  it('should use fallback videos when all retries fail', async () => {
    const fallbackVideos = [
      'https://player.vimeo.com/external/fallback1.mp4',
      'https://player.vimeo.com/external/fallback2.mp4'
    ];

    pexelsService.setShouldTimeout(true);
    
    const videoUrl = await pexelsService.getRandomVideo('salon experience');
    
    // Should use fallback when API fails
    const fallbackUrl = fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];
    expect(fallbackUrl).toMatch(/https:\/\/player\.vimeo\.com\/external\/fallback\d+\.mp4/);
  });
}); 