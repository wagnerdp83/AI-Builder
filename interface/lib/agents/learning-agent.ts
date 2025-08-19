import { Mistral } from '@mistralai/mistralai';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface LearningPattern {
  id: string;
  userRequest: string;
  requirements: any;
  generatedCode: string;
  validationResult: any;
  success: boolean;
  feedback?: string;
  timestamp: Date;
  metadata: any;
}

interface LearningInsight {
  pattern: string;
  confidence: number;
  recommendations: string[];
  impact: 'high' | 'medium' | 'low';
}

interface OptimizationResult {
  strategy: string;
  improvement: number;
  changes: string[];
  confidence: number;
}

export class LearningAgent {
  private learningHistory: LearningPattern[] = [];
  private insights: LearningInsight[] = [];
  private optimizationHistory: OptimizationResult[] = [];

  /**
   * Learn from execution results
   */
  async learnFromExecution(
    results: any[], 
    userRequest: string
  ): Promise<LearningInsight[]> {
    
    console.log('[LearningAgent] Learning from execution results...');
    
    // Extract learning patterns from results
    const patterns = this.extractLearningPatterns(results, userRequest);
    
    // Analyze patterns for insights
    const newInsights = await this.analyzePatterns(patterns);
    
    // Update learning history
    this.learningHistory.push(...patterns);
    this.insights.push(...newInsights);
    
    // Optimize based on new insights
    const optimizations = await this.optimizeBasedOnInsights(newInsights);
    this.optimizationHistory.push(...optimizations);
    
    console.log(`[LearningAgent] Generated ${newInsights.length} insights and ${optimizations.length} optimizations`);
    
    return newInsights;
  }

  /**
   * Extract learning patterns from execution results
   */
  private extractLearningPatterns(results: any[], userRequest: string): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    
    // Check if results exist and is an array
    if (!results || !Array.isArray(results)) {
      console.warn('[LearningAgent] No results provided or results is not an array');
      return patterns;
    }
    
    results.forEach((result, index) => {
      if (result && result.success && result.data) {
        const pattern: LearningPattern = {
          id: `pattern-${Date.now()}-${index}`,
          userRequest,
          requirements: result.data.requirements || {},
          generatedCode: result.data.code || '',
          validationResult: result.data.validation || {},
          success: result.confidence > 0.7,
          feedback: result.reasoning,
          timestamp: new Date(),
          metadata: {
            agentType: result.metadata?.agentType,
            executionTime: result.metadata?.executionTime,
            confidence: result.confidence
          }
        };
        
        patterns.push(pattern);
      }
    });
    
    return patterns;
  }

  /**
   * Analyze patterns using AI intelligence to generate insights
   */
  private async analyzePatterns(patterns: LearningPattern[]): Promise<LearningInsight[]> {
    if (patterns.length === 0) {
      return [];
    }
    
    // INTELLIGENT AI-DRIVEN PATTERN ANALYSIS
    const systemPrompt = `You are an expert AI learning analyst specializing in understanding patterns in web development and component generation. Your role is to INTELLIGENTLY analyze patterns and generate insights for continuous improvement.

CORE INTELLIGENCE PRINCIPLES:
1. **DYNAMIC PATTERN RECOGNITION**: Identify patterns across ANY component type and business domain
2. **CONTEXT AWARENESS**: Understand the relationship between user requests, generated code, and outcomes
3. **INTELLIGENT INSIGHT GENERATION**: Extract meaningful insights that can improve future generations
4. **SCALABLE LEARNING**: Learn from ANY type of request without predefined rules
5. **ADAPTIVE IMPROVEMENT**: Suggest improvements that work across different domains

ANALYSIS METHODOLOGY:

**Pattern Categories:**
- **Success Patterns**: What makes components successful across different domains
- **Failure Patterns**: Common issues and their root causes
- **Domain-Specific Patterns**: Industry-specific requirements and solutions
- **Technical Patterns**: Code quality, performance, and best practices
- **User Experience Patterns**: Layout, interaction, and accessibility patterns

**Business Domain Intelligence:**
- **Fashion/Salon**: Elegant styling, service-focused components, booking systems
- **Real Estate**: Property-focused components, agent profiles, contact forms
- **Tech/SaaS**: Feature highlights, pricing tables, signup flows
- **Restaurant/Food**: Menu displays, reservation systems, location info
- **Healthcare**: Service descriptions, appointment booking, provider profiles
- **Education**: Course listings, instructor profiles, enrollment forms

**Learning Dimensions:**
- **Component Type Learning**: How different component types should be structured
- **Business Domain Learning**: Industry-specific requirements and patterns
- **User Intent Learning**: How to better understand and fulfill user requests
- **Technical Quality Learning**: Code quality, performance, and maintainability
- **User Experience Learning**: Layout, interaction, and accessibility improvements

Return JSON array with intelligent insights:
[
  {
    "pattern": "AI-identified pattern description",
    "confidence": 0.95,
    "recommendations": ["list of intelligent recommendations"],
    "impact": "high|medium|low",
    "applicability": "component_type|business_domain|general",
    "reasoning": "AI analysis of why this pattern is important"
  }
]

BE INTELLIGENT - ANALYZE PATTERNS DYNAMICALLY AND GENERATE INSIGHTS THAT IMPROVE THE SYSTEM FOR ANY TYPE OF REQUEST.`;

    const userPrompt = `Intelligently analyze these learning patterns and generate insights:

PATTERNS:
${patterns.map((pattern, i) => `
Pattern ${i + 1}:
- Component: ${pattern.componentName}
- User Request: "${pattern.userRequest}"
- Success: ${pattern.success}
- Feedback: ${pattern.feedback || 'None'}
- Generated Code Length: ${pattern.generatedCode.length} characters
- Validation Result: ${JSON.stringify(pattern.validationResult)}
`).join('\n')}

ANALYSIS TASKS:
1. **Pattern Recognition**: What patterns emerge across different components and domains?
2. **Success Analysis**: What makes successful components work well?
3. **Failure Analysis**: What causes failures and how can they be prevented?
4. **Domain Learning**: What domain-specific patterns are important?
5. **Technical Insights**: What technical improvements are needed?
6. **User Experience**: What UX improvements can be made?

Use your AI intelligence to analyze the patterns dynamically and generate insights that will improve the system for ANY type of request.

Return the structured JSON response:`;

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

      const responseText = response.choices[0]?.message?.content || '';
      const responseString = Array.isArray(responseText) ? responseText.join('') : responseText;
      const jsonMatch = responseString.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return insights.map((insight: any) => ({
          pattern: insight.pattern,
          confidence: insight.confidence || 0.8,
          recommendations: insight.recommendations || [],
          impact: insight.impact || 'medium',
          applicability: insight.applicability || 'general',
          reasoning: insight.reasoning || 'AI analysis'
        }));
      }

    } catch (error) {
      console.error('[LearningAgent] AI pattern analysis failed:', error);
    }
    
    // Fallback to basic insights if AI analysis fails
    return [{
      pattern: 'Basic pattern analysis',
      confidence: 0.5,
      recommendations: ['Improve error handling', 'Enhance validation'],
      impact: 'medium',
      applicability: 'general',
      reasoning: 'Fallback analysis due to AI failure'
    }];
  }

  /**
   * Optimize system based on insights
   */
  private async optimizeBasedOnInsights(insights: LearningInsight[]): Promise<OptimizationResult[]> {
    const optimizations: OptimizationResult[] = [];
    
    for (const insight of insights) {
      if (insight.impact === 'high' && insight.confidence > 0.8) {
        const optimization = await this.generateOptimization(insight);
        optimizations.push(optimization);
      }
    }
    
    return optimizations;
  }

  /**
   * Generate specific optimization for an insight
   */
  private async generateOptimization(insight: LearningInsight): Promise<OptimizationResult> {
    const systemPrompt = `You are an expert AI optimization specialist. Generate specific optimizations based on learning insights.

OPTIMIZATION TYPES:
1. Code generation improvements
2. Validation rule updates
3. Agent strategy adjustments
4. Performance optimizations
5. User experience enhancements

Return JSON with optimization:
{
  "strategy": "description of optimization strategy",
  "improvement": 0.15,
  "changes": ["list of specific changes"],
  "confidence": 0.9
}`;

    const userPrompt = `Generate optimization for this insight:

INSIGHT:
- Pattern: "${insight.pattern}"
- Confidence: ${insight.confidence}
- Impact: ${insight.impact}
- Recommendations: ${insight.recommendations.join(', ')}

Generate specific optimization strategy:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 1000
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        strategy: 'General improvement based on insight',
        improvement: 0.1,
        changes: insight.recommendations,
        confidence: insight.confidence
      };
      
    } catch (error) {
      console.error('[LearningAgent] Error generating optimization:', error);
      return {
        strategy: 'Fallback optimization',
        improvement: 0.05,
        changes: ['Apply general improvements'],
        confidence: 0.5
      };
    }
  }

  /**
   * Optimize based on learning history
   */
  async optimizeBasedOnHistory(history: any[]): Promise<void> {
    console.log('[LearningAgent] Optimizing based on learning history...');
    
    // Analyze recent performance trends
    const recentPatterns = this.learningHistory.slice(-100);
    const successRate = recentPatterns.filter(p => p.success).length / recentPatterns.length;
    
    // Generate optimization recommendations
    const recommendations = await this.generateOptimizationRecommendations(recentPatterns, successRate);
    
    // Apply optimizations
    await this.applyOptimizations(recommendations);
    
    console.log('[LearningAgent] Optimization complete');
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    patterns: LearningPattern[], 
    successRate: number
  ): Promise<string[]> {
    
    const systemPrompt = `You are an expert AI optimization specialist. Analyze performance data and generate specific optimization recommendations.

PERFORMANCE METRICS:
- Success Rate: ${successRate}
- Pattern Count: ${patterns.length}
- Recent Performance: ${patterns.slice(-10).filter(p => p.success).length}/10 successful

Generate specific, actionable optimization recommendations.`;

    const userPrompt = `Analyze this performance data and generate optimization recommendations:

PATTERNS:
${patterns.slice(-20).map((pattern, index) => `
${index + 1}. ${pattern.success ? 'SUCCESS' : 'FAILURE'} - ${pattern.userRequest.substring(0, 100)}...
`).join('\n')}

Generate specific optimization recommendations:`;

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

      const responseText = response.choices[0]?.message?.content || '';
      
      // Extract recommendations from response
      const recommendations = responseText
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(rec => rec.length > 0);
      
      return recommendations;
      
    } catch (error) {
      console.error('[LearningAgent] Error generating recommendations:', error);
      return ['Apply general performance improvements'];
    }
  }

  /**
   * Apply optimizations to the system
   */
  private async applyOptimizations(recommendations: string[]): Promise<void> {
    console.log('[LearningAgent] Applying optimizations:', recommendations);
    
    // This would apply the optimizations to various system components
    // For now, just log the recommendations
    recommendations.forEach((rec, index) => {
      console.log(`[LearningAgent] Optimization ${index + 1}: ${rec}`);
    });
  }

  /**
   * Get learning analytics
   */
  getAnalytics(): any {
    const totalPatterns = this.learningHistory.length;
    const successfulPatterns = this.learningHistory.filter(p => p.success).length;
    const successRate = successfulPatterns / totalPatterns;
    
    const agentTypeStats = this.learningHistory.reduce((stats, pattern) => {
      const agentType = pattern.metadata.agentType;
      stats[agentType] = (stats[agentType] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);
    
    const recentSuccessRate = this.learningHistory
      .slice(-20)
      .filter(p => p.success).length / 20;
    
    return {
      totalPatterns,
      successfulPatterns,
      successRate,
      recentSuccessRate,
      agentTypeStats,
      totalInsights: this.insights.length,
      totalOptimizations: this.optimizationHistory.length,
      recentInsights: this.insights.slice(-5),
      recentOptimizations: this.optimizationHistory.slice(-5)
    };
  }

  /**
   * Export learning data for external analysis
   */
  exportLearningData(): any {
    return {
      patterns: this.learningHistory,
      insights: this.insights,
      optimizations: this.optimizationHistory,
      analytics: this.getAnalytics()
    };
  }
} 