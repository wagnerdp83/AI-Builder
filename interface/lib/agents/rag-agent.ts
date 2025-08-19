import { Mistral } from '@mistralai/mistralai';
import { ComponentKnowledgeBase } from '../services/component-knowledge-base';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface RAGQuery {
  userRequest: string;
  componentName?: string;
  context?: any;
  maxResults?: number;
}

interface RAGResult {
  patterns: any[];
  examples: any[];
  recommendations: string[];
  confidence: number;
  reasoning: string;
  metadata: any;
}

interface RAGPattern {
  id: string;
  userRequest: string;
  requirements: any;
  generatedCode: string;
  success: boolean;
  similarity: number;
  relevance: number;
}

export class RAGAgent {
  private knowledgeBase: ComponentKnowledgeBase;
  private retrievalHistory: any[] = [];

  constructor() {
    this.knowledgeBase = new ComponentKnowledgeBase();
  }

  /**
   * Retrieve relevant patterns and examples using RAG
   */
  async retrieveRelevantPatterns(
    userRequest: string, 
    componentName?: string
  ): Promise<RAGResult> {
    
    // Respect DISABLE_KNOWLEDGE_BASE flag: do not use saved patterns for retrieval
    const kbDisabled = process.env.DISABLE_KNOWLEDGE_BASE === 'true';
    if (kbDisabled) {
      console.log('[RAGAgent] KB retrieval disabled by DISABLE_KNOWLEDGE_BASE=true. Proceeding with zero patterns.');
    }
    
    console.log('[RAGAgent] Retrieving relevant patterns...');
    console.log('[RAGAgent] userRequest:', userRequest ? userRequest.substring(0, 100) + '...' : 'undefined');
    console.log('[RAGAgent] componentName:', componentName);
    
    // Validate inputs
    if (!userRequest || typeof userRequest !== 'string' || userRequest.trim().length === 0) {
      console.warn('[RAGAgent] Invalid userRequest, returning empty result');
      return {
        patterns: [],
        examples: [],
        recommendations: [],
        confidence: 0,
        reasoning: 'No valid user request provided',
        metadata: { totalPatterns: 0, successfulPatterns: 0, averageSimilarity: 0 }
      };
    }
    
    // Step 1: Optionally find similar patterns from knowledge base
    let similarPatterns: any[] = [];
    if (!kbDisabled) {
      try {
        similarPatterns = await this.knowledgeBase.findSimilarPatterns(
          userRequest, 
          componentName, 
          10
        );
      } catch (error) {
        console.warn('[RAGAgent] Error finding similar patterns:', error);
        // Continue with empty patterns - RAG will still work
        similarPatterns = [];
      }
    }
    
    // CRITICAL: Ensure we always have valid patterns array
    if (!Array.isArray(similarPatterns)) {
      console.warn('[RAGAgent] Invalid similarPatterns, using empty array');
      similarPatterns = [];
    }
    
    // Step 2: Generate intelligent recommendations using LLM
    const recommendations = await this.generateRecommendations(userRequest, similarPatterns);
    
    // Step 3: Extract relevant examples
    const examples = this.extractRelevantExamples(similarPatterns, userRequest);
    
    // Step 4: Calculate confidence and reasoning
    const confidence = this.calculateConfidence(similarPatterns, recommendations);
    const reasoning = this.generateReasoning(similarPatterns, recommendations);
    
    const result: RAGResult = {
      patterns: similarPatterns.map(p => ({
        id: p.pattern.id,
        userRequest: p.pattern.userRequest,
        requirements: p.pattern.requirements,
        generatedCode: p.pattern.generatedCode,
        success: p.pattern.success,
        similarity: p.similarity,
        relevance: this.calculateRelevance(p, userRequest)
      })),
      examples: examples,
      recommendations: recommendations,
      confidence,
      reasoning,
      metadata: {
        totalPatterns: similarPatterns.length,
        successfulPatterns: similarPatterns.filter(p => p.pattern.success).length,
        averageSimilarity: similarPatterns.reduce((sum, p) => sum + p.similarity, 0) / similarPatterns.length
      }
    };
    
    // Store in history
    this.retrievalHistory.push({
      userRequest,
      componentName,
      result,
      timestamp: new Date()
    });
    
    return result;
  }

  /**
   * Generate intelligent recommendations using LLM
   */
  private async generateRecommendations(
    userRequest: string, 
    patterns: any[]
  ): Promise<string[]> {
    
    if (patterns.length === 0) {
      return ['Use standard component generation approach'];
    }

    const systemPrompt = `You are an expert AI recommendation system. Analyze similar patterns and generate specific recommendations for the user request.

RECOMMENDATION CRITERIA:
1. Successful patterns that match the user's intent
2. Common failure patterns to avoid
3. Best practices from similar requests
4. Performance optimizations
5. User experience improvements

Return JSON array with specific recommendations:
[
  "specific recommendation 1",
  "specific recommendation 2"
]`;

    const userPrompt = `Generate recommendations for this user request:

USER REQUEST: "${userRequest}"

SIMILAR PATTERNS:
${patterns.slice(0, 5).map((pattern, index) => `
Pattern ${index + 1}:
- Request: "${pattern.pattern.userRequest}"
- Success: ${pattern.pattern.success}
- Similarity: ${pattern.similarity}
- Code: ${pattern.pattern.generatedCode.substring(0, 200)}...
`).join('\n')}

Generate specific, actionable recommendations:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        maxTokens: 1500
      });

      const responseContent = response.choices[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback recommendations
      return patterns
        .filter(p => p.pattern.success)
        .slice(0, 3)
        .map(p => `Follow successful pattern: ${p.pattern.userRequest.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('[RAGAgent] Error generating recommendations:', error);
      return ['Use standard generation approach'];
    }
  }

  /**
   * Extract relevant examples from patterns
   */
  private extractRelevantExamples(patterns: any[], userRequest: string): any[] {
    const examples: any[] = [];
    
    // Extract successful patterns as examples
    const successfulPatterns = patterns
      .filter(p => p.pattern.success && p.similarity > 0.7)
      .slice(0, 5);
    
    successfulPatterns.forEach(pattern => {
      examples.push({
        type: 'successful_pattern',
        userRequest: pattern.pattern.userRequest,
        generatedCode: pattern.pattern.generatedCode,
        similarity: pattern.similarity,
        keyFeatures: this.extractKeyFeatures(pattern.pattern.generatedCode)
      });
    });
    
    return examples;
  }

  /**
   * Extract key features from generated code
   */
  private extractKeyFeatures(code: string): string[] {
    const features: string[] = [];
    
    if (code.includes('flex-row-reverse')) features.push('Content on right, image on left');
    if (code.includes('flex-row')) features.push('Content on left, image on right');
    if (code.includes('text-center')) features.push('Centered layout');
    if (code.includes('avatar')) features.push('Avatar integration');
    if (code.includes('{{MOCKUP_IMAGE}}')) features.push('Mockup image placeholder');
    if (code.includes('{{AVATAR_IMAGE}}')) features.push('Avatar image placeholder');
    if (code.includes('lucide')) features.push('Lucide icons');
    if (code.includes('responsive')) features.push('Responsive design');
    
    return features;
  }

  /**
   * Calculate confidence based on patterns and recommendations
   */
  private calculateConfidence(patterns: any[], recommendations: string[]): number {
    if (patterns.length === 0) return 0.3;
    
    const successfulPatterns = patterns.filter(p => p.pattern.success);
    const successRate = successfulPatterns.length / patterns.length;
    const averageSimilarity = patterns.reduce((sum, p) => sum + p.similarity, 0) / patterns.length;
    
    // Weighted confidence calculation
    const confidence = (successRate * 0.4) + (averageSimilarity * 0.4) + (recommendations.length > 0 ? 0.2 : 0);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate reasoning for RAG results
   */
  private generateReasoning(patterns: any[], recommendations: string[]): string {
    const successfulCount = patterns.filter(p => p.pattern.success).length;
    const totalCount = patterns.length;
    
    if (totalCount === 0) {
      return 'No similar patterns found, using standard approach';
    }
    
    const successRate = (successfulCount / totalCount) * 100;
    const avgSimilarity = patterns.reduce((sum, p) => sum + p.similarity, 0) / totalCount;
    
    return `Found ${totalCount} similar patterns (${successRate.toFixed(1)}% success rate, ${(avgSimilarity * 100).toFixed(1)}% similarity). Generated ${recommendations.length} recommendations based on successful patterns.`;
  }

  /**
   * Calculate relevance score for a pattern
   */
  private calculateRelevance(pattern: any, userRequest: string): number {
    // Simple relevance calculation based on similarity and success
    const similarityWeight = 0.6;
    const successWeight = 0.4;
    
    return (pattern.similarity * similarityWeight) + (pattern.pattern.success ? successWeight : 0);
  }

  /**
   * Enhanced RAG with context awareness
   */
  async retrieveWithContext(
    query: RAGQuery
  ): Promise<RAGResult> {
    
    console.log('[RAGAgent] Retrieving with context awareness...');
    
    // Build enhanced query with context
    const enhancedQuery = this.buildEnhancedQuery(query);
    
    // Retrieve patterns with context
    const patterns = await this.knowledgeBase.findSimilarPatterns(
      enhancedQuery.userRequest,
      enhancedQuery.componentName,
      enhancedQuery.maxResults || 10
    );
    
    // Filter patterns based on context
    const filteredPatterns = this.filterPatternsByContext(patterns, query.context);
    
    // Generate context-aware recommendations
    const recommendations = await this.generateContextAwareRecommendations(
      query.userRequest,
      filteredPatterns,
      query.context
    );
    
    return {
      patterns: filteredPatterns.map(p => ({
        id: p.pattern.id,
        userRequest: p.pattern.userRequest,
        requirements: p.pattern.requirements,
        generatedCode: p.pattern.generatedCode,
        success: p.pattern.success,
        similarity: p.similarity,
        relevance: this.calculateRelevance(p, query.userRequest)
      })),
      examples: this.extractRelevantExamples(filteredPatterns, query.userRequest),
      recommendations,
      confidence: this.calculateConfidence(filteredPatterns, recommendations),
      reasoning: this.generateReasoning(filteredPatterns, recommendations),
      metadata: {
        totalPatterns: filteredPatterns.length,
        contextUsed: !!query.context,
        successfulPatterns: filteredPatterns.filter(p => p.pattern.success).length
      }
    };
  }

  /**
   * Build enhanced query with context
   */
  private buildEnhancedQuery(query: RAGQuery): RAGQuery {
    let enhancedRequest = query.userRequest;
    
    if (query.context) {
      // Add context information to the query
      const contextInfo = Object.entries(query.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      enhancedRequest = `${query.userRequest} [Context: ${contextInfo}]`;
    }
    
    return {
      ...query,
      userRequest: enhancedRequest
    };
  }

  /**
   * Filter patterns based on context
   */
  private filterPatternsByContext(patterns: any[], context?: any): any[] {
    if (!context) return patterns;
    
    return patterns.filter(pattern => {
      // Apply context-based filtering logic
      const patternContext = pattern.pattern.metadata?.context || {};
      
      // Check if pattern context matches query context
      const contextMatch = Object.entries(context).every(([key, value]) => {
        const patternValue = patternContext[key];
        return patternValue === value || !patternValue;
      });
      
      return contextMatch;
    });
  }

  /**
   * Generate context-aware recommendations
   */
  private async generateContextAwareRecommendations(
    userRequest: string,
    patterns: any[],
    context?: any
  ): Promise<string[]> {
    
    const systemPrompt = `You are an expert AI recommendation system. Generate context-aware recommendations based on similar patterns and user context.

CONTEXT-AWARE CRITERIA:
1. Consider user's specific context and requirements
2. Adapt recommendations based on similar successful patterns
3. Avoid patterns that failed in similar contexts
4. Provide context-specific optimizations
5. Consider performance and user experience factors

Return JSON array with context-aware recommendations.`;

    const userPrompt = `Generate context-aware recommendations for:

USER REQUEST: "${userRequest}"
CONTEXT: ${context ? JSON.stringify(context, null, 2) : 'None'}

SIMILAR PATTERNS:
${patterns.slice(0, 3).map((pattern, index) => `
Pattern ${index + 1}:
- Request: "${pattern.pattern.userRequest}"
- Success: ${pattern.pattern.success}
- Context: ${JSON.stringify(pattern.pattern.metadata?.context || {})}
`).join('\n')}

Generate context-aware recommendations:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        maxTokens: 1500
      });

      const responseContent = response.choices[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return ['Apply context-aware generation approach'];
      
    } catch (error) {
      console.error('[RAGAgent] Error generating context-aware recommendations:', error);
      return ['Use standard generation approach'];
    }
  }

  /**
   * Get RAG analytics
   */
  getAnalytics(): any {
    const totalRetrievals = this.retrievalHistory.length;
    const averageConfidence = this.retrievalHistory.reduce((sum, r) => 
      sum + r.result.confidence, 0) / totalRetrievals;
    
    const patternUsageStats = this.retrievalHistory.reduce((stats, retrieval) => {
      retrieval.result.patterns.forEach((pattern: any) => {
        const componentName = pattern.userRequest.split(' ')[0];
        stats[componentName] = (stats[componentName] || 0) + 1;
      });
      return stats;
    }, {} as Record<string, number>);
    
    return {
      totalRetrievals,
      averageConfidence,
      patternUsageStats,
      recentRetrievals: this.retrievalHistory.slice(-10)
    };
  }
} 