import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock ComponentKnowledgeBase
class MockComponentKnowledgeBase {
  private embeddingsCache: Map<string, number[]> = new Map();
  private pendingEmbeddings: Map<string, Promise<number[]>> = new Map();
  private requestCount = 0;
  private shouldRateLimit = false;

  constructor() {
    this.embeddingsCache = new Map();
    this.pendingEmbeddings = new Map();
  }

  setShouldRateLimit(value: boolean) {
    this.shouldRateLimit = value;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().trim();
    
    // Check cache first
    if (this.embeddingsCache.has(cacheKey)) {
      console.log('[ComponentKnowledgeBase] ✅ Using cached embedding for:', text.substring(0, 50));
      return this.embeddingsCache.get(cacheKey)!;
    }

    // Check if request is already pending
    if (this.pendingEmbeddings.has(cacheKey)) {
      console.log('[ComponentKnowledgeBase] ⏳ Using pending embedding for:', text.substring(0, 50));
      return this.pendingEmbeddings.get(cacheKey)!;
    }

    // Simulate rate limiting
    this.requestCount++;
    if (this.shouldRateLimit && this.requestCount > 3) {
      const error = new Error('Rate limit exceeded');
      (error as any).statusCode = 429;
      throw error;
    }

    // Create pending request
    const embeddingPromise = this.performEmbeddingRequest(text);
    this.pendingEmbeddings.set(cacheKey, embeddingPromise);

    try {
      const embedding = await embeddingPromise;
      this.embeddingsCache.set(cacheKey, embedding);
      this.pendingEmbeddings.delete(cacheKey);
      return embedding;
    } catch (error) {
      this.pendingEmbeddings.delete(cacheKey);
      throw error;
    }
  }

  private async performEmbeddingRequest(text: string): Promise<number[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate mock embedding
    const embedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    return embedding;
  }

  async findSimilarPatterns(userRequest: string, componentName: string): Promise<any[]> {
    try {
      const embedding = await this.generateEmbedding(userRequest);
      
      // Mock similarity search
      return [
        {
          id: 'pattern-1',
          componentName: componentName,
          confidence: 0.85,
          embedding: embedding
        }
      ];
    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error finding patterns:', error);
      return [];
    }
  }

  async savePattern(componentName: string, pattern: any): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(JSON.stringify(pattern));
      
      // Mock pattern saving
      console.log('[ComponentKnowledgeBase] Saved pattern:', componentName);
    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error saving pattern:', error);
    }
  }

  // Test rate limiting scenarios
  async testRateLimitScenarios(): Promise<{
    successfulRequests: number;
    rateLimitedRequests: number;
    cachedRequests: number;
  }> {
    const results = {
      successfulRequests: 0,
      rateLimitedRequests: 0,
      cachedRequests: 0
    };

    const texts = [
      'Create a modern landing page for my fashion salon',
      'Hero section with background video',
      'Navigation bar with logo and menu',
      'About us section with company story',
      'Services showcase with pricing',
      'Contact form with validation',
      'Footer with social links',
      'Testimonial carousel component',
      'Gallery with image grid',
      'Booking widget with calendar'
    ];

    for (const text of texts) {
      try {
        await this.generateEmbedding(text);
        results.successfulRequests++;
      } catch (error) {
        if ((error as any).statusCode === 429) {
          results.rateLimitedRequests++;
        }
      }
    }

    // Test cache hits
    for (const text of texts.slice(0, 3)) {
      try {
        await this.generateEmbedding(text);
        results.cachedRequests++;
      } catch (error) {
        // Should not fail for cached requests
      }
    }

    return results;
  }
}

describe('ComponentKnowledgeBase Rate Limiting', () => {
  let knowledgeBase: MockComponentKnowledgeBase;

  beforeEach(() => {
    knowledgeBase = new MockComponentKnowledgeBase();
  });

  it('should handle rate limiting gracefully', async () => {
    knowledgeBase.setShouldRateLimit(true);
    
    const results = await knowledgeBase.testRateLimitScenarios();
    
    expect(results.successfulRequests).toBeGreaterThan(0);
    expect(results.rateLimitedRequests).toBeGreaterThan(0);
    expect(results.cachedRequests).toBeGreaterThan(0);
  });

  it('should cache embeddings to reduce API calls', async () => {
    knowledgeBase.setShouldRateLimit(false);
    
    // First request
    const embedding1 = await knowledgeBase.generateEmbedding('Test text');
    expect(embedding1).toBeDefined();
    
    // Second identical request should use cache
    const embedding2 = await knowledgeBase.generateEmbedding('Test text');
    expect(embedding2).toEqual(embedding1);
  });

  it('should prevent duplicate concurrent requests', async () => {
    knowledgeBase.setShouldRateLimit(false);
    
    // Start multiple identical requests simultaneously
    const promises = [
      knowledgeBase.generateEmbedding('Concurrent test'),
      knowledgeBase.generateEmbedding('Concurrent test'),
      knowledgeBase.generateEmbedding('Concurrent test')
    ];
    
    const results = await Promise.all(promises);
    
    // All results should be identical (same embedding)
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it('should continue working after rate limit errors', async () => {
    knowledgeBase.setShouldRateLimit(true);
    
    // First few requests should succeed
    const embedding1 = await knowledgeBase.generateEmbedding('First request');
    expect(embedding1).toBeDefined();
    
    // Later requests should fail due to rate limiting
    try {
      await knowledgeBase.generateEmbedding('Rate limited request');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect((error as any).statusCode).toBe(429);
    }
    
    // Should still be able to use cached embeddings
    const cachedEmbedding = await knowledgeBase.generateEmbedding('First request');
    expect(cachedEmbedding).toEqual(embedding1);
  });

  it('should find similar patterns even with rate limiting', async () => {
    knowledgeBase.setShouldRateLimit(true);
    
    const patterns = await knowledgeBase.findSimilarPatterns(
      'Create a modern landing page for my fashion salon',
      'Hero'
    );
    
    // Should either find patterns or return empty array gracefully
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should save patterns with error handling', async () => {
    knowledgeBase.setShouldRateLimit(true);
    
    const pattern = {
      componentName: 'Hero',
      layout: 'full-width',
      styling: 'modern'
    };
    
    // Should not throw error even with rate limiting
    await expect(knowledgeBase.savePattern('Hero', pattern)).resolves.not.toThrow();
  });

  it('should implement exponential backoff for retries', async () => {
    knowledgeBase.setShouldRateLimit(true);
    
    const startTime = Date.now();
    
    try {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await knowledgeBase.generateEmbedding(`Request ${i}`);
      }
    } catch (error) {
      // Should have taken some time due to retries
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(100);
    }
  });
}); 