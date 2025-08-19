import { Mistral } from '@mistralai/mistralai';
import * as fs from 'fs/promises';
import * as path from 'path';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface ComponentPattern {
  id: string;
  componentName: string;
  userRequest: string;
  requirements: any;
  generatedCode: string;
  success: boolean;
  feedback?: string;
  timestamp: Date;
}

interface KnowledgeBaseEntry {
  pattern: ComponentPattern;
  embedding: number[];
  similarity: number;
}

export class ComponentKnowledgeBase {
  private static instance: ComponentKnowledgeBase;
  private patterns: ComponentPattern[] = [];
  private embeddings: Map<string, number[]> = new Map();
  private knowledgeBasePath: string;
  private pendingEmbeddings: Map<string, Promise<number[]>> = new Map(); // Prevent duplicate requests

  private constructor() {
    this.knowledgeBasePath = path.join(process.cwd(), 'lib', 'data', 'component-patterns.json');
    this.loadPatterns();
  }

  public static getInstance(): ComponentKnowledgeBase {
    if (!ComponentKnowledgeBase.instance) {
      ComponentKnowledgeBase.instance = new ComponentKnowledgeBase();
    }
    return ComponentKnowledgeBase.instance;
  }

  /**
   * Add a new component pattern to the knowledge base
   */
    async addPattern(pattern: ComponentPattern): Promise<void> {
    try {
      // CRITICAL FIX: Validate pattern data before any operations
      if (!pattern.userRequest || typeof pattern.userRequest !== 'string' || pattern.userRequest.trim().length === 0) {
        console.warn('[ComponentKnowledgeBase] Invalid userRequest for pattern, using fallback');
        // Use fallback userRequest if invalid
        pattern.userRequest = pattern.userRequest || `Generate ${pattern.componentName} component`;
      }

      // Generate embedding for the pattern
      const embedding = await this.generateEmbedding(pattern.userRequest);

      this.patterns.push(pattern);
      this.embeddings.set(pattern.id, embedding);

      // Save to file
      await this.savePatterns();

      console.log(`[ComponentKnowledgeBase] Added pattern: ${pattern.componentName} (${pattern.id})`);
    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error adding pattern:', error);
      // Still try to save the pattern even if embedding fails
      try {
        // Ensure we have a valid userRequest
        if (!pattern.userRequest || typeof pattern.userRequest !== 'string' || pattern.userRequest.trim().length === 0) {
          pattern.userRequest = `Generate ${pattern.componentName} component`;
        }
        
        this.patterns.push(pattern);
        await this.savePatterns();
        console.log(`[ComponentKnowledgeBase] Added pattern without embedding due to error: ${pattern.componentName} (${pattern.id})`);
      } catch (saveError) {
        console.error('[ComponentKnowledgeBase] Failed to save pattern:', saveError);
      }
    }
  }

  /**
   * Find similar patterns based on user request
   */
  async findSimilarPatterns(
    userRequest: string, 
    componentName?: string,
    limit: number = 5
  ): Promise<KnowledgeBaseEntry[]> {
    // Honor flag to disable KB retrieval while still allowing saving/learning
    if (process.env.DISABLE_KNOWLEDGE_BASE === 'true') {
      console.log('[ComponentKnowledgeBase] KB retrieval disabled by DISABLE_KNOWLEDGE_BASE=true. Returning no patterns.');
      return [];
    }
    try {
      console.log('[ComponentKnowledgeBase] Finding similar patterns...');
      console.log('[ComponentKnowledgeBase] userRequest:', userRequest ? userRequest.substring(0, 100) + '...' : 'undefined');
      console.log('[ComponentKnowledgeBase] componentName:', componentName);
      
      // CRITICAL FIX: Validate userRequest before generating embedding
      if (!userRequest || typeof userRequest !== 'string' || userRequest.trim().length === 0) {
        console.warn('[ComponentKnowledgeBase] Invalid userRequest for embedding, returning empty results');
        return [];
      }
      
      // CRITICAL FIX: Ensure componentName is valid
      if (componentName && (typeof componentName !== 'string' || componentName.trim().length === 0)) {
        console.warn('[ComponentKnowledgeBase] Invalid componentName, using undefined');
        componentName = undefined;
      }
      
      const queryEmbedding = await this.generateEmbedding(userRequest);
      const similarities: KnowledgeBaseEntry[] = [];

      for (const pattern of this.patterns) {
        // CRITICAL FIX: Add null checks for componentName comparison
        if (componentName && pattern.componentName && 
            pattern.componentName.toLowerCase() !== componentName.toLowerCase()) {
          continue;
        }

        // LAZY EMBEDDING GENERATION: Only generate if not already cached
        let patternEmbedding = this.embeddings.get(pattern.id);
        if (!patternEmbedding) {
          // Generate embedding only when needed
          if (pattern.userRequest && typeof pattern.userRequest === 'string' && pattern.userRequest.trim().length > 0) {
            try {
              patternEmbedding = await this.generateEmbedding(pattern.userRequest);
              this.embeddings.set(pattern.id, patternEmbedding);
            } catch (error) {
              console.warn(`[ComponentKnowledgeBase] Failed to generate embedding for pattern ${pattern.id}, using fallback`);
              patternEmbedding = this.simpleHashEmbedding(pattern.userRequest || 'fallback');
              this.embeddings.set(pattern.id, patternEmbedding);
            }
          } else {
            console.warn(`[ComponentKnowledgeBase] Invalid userRequest for pattern ${pattern.id}, using fallback`);
            patternEmbedding = this.simpleHashEmbedding('fallback');
            this.embeddings.set(pattern.id, patternEmbedding);
          }
        }

        if (patternEmbedding) {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, patternEmbedding);
          
          similarities.push({
            pattern,
            embedding: patternEmbedding,
            similarity
          });
        }
      }

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error finding similar patterns:', error);
      return [];
    }
  }

  /**
   * Generate component requirements using RAG
   */
  async generateRequirementsWithRAG(
    userRequest: string,
    componentName?: string
  ): Promise<any> {
    // If KB retrieval is disabled, skip RAG-with-patterns flow entirely
    if (process.env.DISABLE_KNOWLEDGE_BASE === 'true') {
      console.log('[ComponentKnowledgeBase] KB retrieval disabled; skipping generateRequirementsWithRAG context.');
      return null;
    }
    
    // CRITICAL FIX: Validate inputs before RAG
    if (!userRequest || typeof userRequest !== 'string' || userRequest.trim().length === 0) {
      console.warn('[ComponentKnowledgeBase] Invalid userRequest for RAG, returning null');
      return null;
    }
    
    // Find similar patterns
    const similarPatterns = await this.findSimilarPatterns(userRequest, componentName, 3);
    
    if (similarPatterns.length === 0) {
      console.log('[ComponentKnowledgeBase] No similar patterns found, using LLM-only approach');
      return null;
    }

    // Create context from similar patterns
    const context = similarPatterns.map(entry => ({
      userRequest: entry.pattern.userRequest,
      requirements: entry.pattern.requirements,
      success: entry.pattern.success,
      feedback: entry.pattern.feedback
    }));

    // Use LLM to generate requirements with RAG context
    const systemPrompt = `You are an expert at parsing user requirements for web components. Use the provided similar patterns as context to better understand the user's intent.

CONTEXT PATTERNS:
${context.map((ctx, i) => `
Pattern ${i + 1}:
- User Request: "${ctx.userRequest}"
- Requirements: ${JSON.stringify(ctx.requirements, null, 2)}
- Success: ${ctx.success}
- Feedback: ${ctx.feedback || 'None'}
`).join('\n')}

Based on these patterns and the new user request, extract the requirements. Follow the same structure as the successful patterns.`;

    const userPrompt = `Parse this user request using the context patterns as reference:

USER REQUEST: "${userRequest}"
${componentName ? `COMPONENT: ${componentName}` : ''}

Extract requirements following the same structure as the successful patterns above.`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 2000
      });

      const responseText = response.choices[0]?.message?.content || '';
      
      // Extract JSON from response
      const responseString = typeof responseText === 'string' ? responseText : '';
      const jsonMatch = responseString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;

    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error generating requirements with RAG:', error);
      return null;
    }
  }

  /**
   * Learn from successful and failed generations
   */
  async learnFromGeneration(
    userRequest: string,
    componentName: string,
    requirements: any,
    generatedCode: string,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    
    const pattern: ComponentPattern = {
      id: `${componentName}-${Date.now()}`,
      componentName,
      userRequest,
      requirements,
      generatedCode,
      success,
      feedback,
      timestamp: new Date()
    };

    await this.addPattern(pattern);
    
    console.log(`[ComponentKnowledgeBase] Learned from ${success ? 'successful' : 'failed'} generation`);
  }

  /**
   * Generate embedding for text with retry mechanism
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Text cannot be empty');
    }

    // Check cache first
    const cacheKey = trimmedText.toLowerCase();
    if (this.embeddings.has(cacheKey)) {
      console.log('[ComponentKnowledgeBase] ✅ Using cached embedding for:', trimmedText.substring(0, 50));
      return this.embeddings.get(cacheKey)!;
    }

    // Check if request is already pending
    if (this.pendingEmbeddings.has(cacheKey)) {
      console.log('[ComponentKnowledgeBase] ⏳ Using pending embedding for:', trimmedText.substring(0, 50));
      return this.pendingEmbeddings.get(cacheKey)!;
    }

    // Create pending request
    const embeddingPromise = this.performEmbeddingRequest(trimmedText);
    this.pendingEmbeddings.set(cacheKey, embeddingPromise);

    try {
      const embedding = await embeddingPromise;
      this.embeddings.set(cacheKey, embedding);
      this.pendingEmbeddings.delete(cacheKey);
      return embedding;
    } catch (error) {
      this.pendingEmbeddings.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Perform the actual embedding request with retry logic
   */
  private async performEmbeddingRequest(trimmedText: string): Promise<number[]> {
    const maxRetries = 5;
      let lastError: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
        const { Mistral } = await import('@mistralai/mistralai');
        const mistralClient = new Mistral({
          apiKey: process.env.MISTRAL_API_KEY as string
        });

          const response = await mistralClient.embeddings.create({
            model: 'mistral-embed',
          input: [trimmedText]
        });

        if (response.data && response.data[0] && response.data[0].embedding) {
          return response.data[0].embedding;
        } else {
          throw new Error('Invalid embedding response structure');
        }
        } catch (error: any) {
          lastError = error;
          
          // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          console.warn(`[ComponentKnowledgeBase] ⚠️ Rate limit hit (attempt ${attempt}/${maxRetries})`);
          
            if (attempt < maxRetries) {
            // Exponential backoff with jitter
            const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s, 32s
            const jitter = Math.random() * 1000; // 0-1s random jitter
            const delay = baseDelay + jitter;
            
            console.log(`[ComponentKnowledgeBase] ⏳ Waiting ${Math.round(delay)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          } else {
            console.error('[ComponentKnowledgeBase] ❌ Max retries reached for rate limit');
            throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
          }
        } else {
          // Non-rate-limit error, don't retry
          console.error('[ComponentKnowledgeBase] ❌ Non-rate-limit error:', error.message);
          throw error;
        }
      }
    }

    throw lastError || new Error('Embedding generation failed');
  }

  private isRateLimitError(error: any): boolean {
    // Check for various rate limit error patterns
    return (
      error?.statusCode === 429 ||
      error?.code === 429 ||
      error?.message?.includes('rate limit') ||
      error?.message?.includes('Rate limit') ||
      error?.message?.includes('too many requests') ||
      error?.message?.includes('Too Many Requests') ||
      (error?.response?.status === 429) ||
      (error?.status === 429)
    );
  }

  /**
   * Simple hash-based embedding fallback
   */
  private simpleHashEmbedding(text: string): number[] {
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate a simple 10-dimensional embedding
    const embedding = new Array(10).fill(0);
    for (let i = 0; i < 10; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
    }
    
    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Load patterns from file
   */
  private async loadPatterns(): Promise<void> {
    try {
      const data = await fs.readFile(this.knowledgeBasePath, 'utf-8');
      const patterns: ComponentPattern[] = JSON.parse(data);
      
      this.patterns = patterns;
      
      // OPTIMIZATION: Don't generate embeddings during loading to avoid rate limits
      // Embeddings will be generated lazily when needed
      console.log(`[ComponentKnowledgeBase] Loaded ${patterns.length} patterns (embeddings will be generated on-demand)`);
    } catch (error) {
      console.log('[ComponentKnowledgeBase] No existing patterns found, starting fresh');
      this.patterns = [];
    }
  }

  /**
   * Save patterns to file
   */
  private async savePatterns(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.knowledgeBasePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.knowledgeBasePath, JSON.stringify(this.patterns, null, 2));
      console.log(`[ComponentKnowledgeBase] Saved ${this.patterns.length} patterns`);
    } catch (error) {
      console.error('[ComponentKnowledgeBase] Error saving patterns:', error);
    }
  }

  /**
   * Get statistics about the knowledge base
   */
  getStats(): {
    totalPatterns: number;
    successfulPatterns: number;
    failedPatterns: number;
    components: string[];
  } {
    const successfulPatterns = this.patterns.filter(p => p.success).length;
    const failedPatterns = this.patterns.filter(p => !p.success).length;
    const components = [...new Set(this.patterns.map(p => p.componentName))];

    return {
      totalPatterns: this.patterns.length,
      successfulPatterns,
      failedPatterns,
      components
    };
  }
}