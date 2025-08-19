import { Mistral } from '@mistralai/mistralai';
import { OpenAI } from 'openai';

const mistralApiKey = process.env.MISTRAL_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}

const mistralClient = new Mistral({ apiKey: mistralApiKey });
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

interface CodeGenerationStrategy {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  priority: number;
}

interface GenerationResult {
  code: string;
  confidence: number;
  reasoning: string;
  strategy: string;
  metadata: any;
}

export class CodeGenerationAgent {
  private strategies: CodeGenerationStrategy[] = [];
  private generationHistory: any[] = [];
  private mode: 'generic' | 'vision' | 'abstract' = 'generic';

  constructor(mode: 'generic' | 'vision' | 'abstract' = 'generic') {
    this.mode = mode;
    this.initializeStrategies();
  }

  /**
   * Initialize multiple generation strategies
   */
  private initializeStrategies(): void {
    // Base strategies for all modes
    const baseStrategies = [
      {
        name: 'codestral-precise',
        model: 'codestral-2405',
        temperature: 0.1,
        maxTokens: 3000,
        priority: 1,
        systemPrompt: `You are an expert Astro developer. Generate precise, production-ready Astro components.

CRITICAL RULES:
1. Follow user requirements EXACTLY - no assumptions
2. Use Tailwind CSS for styling
3. Use Lucide icons from @lucide/astro
4. Use image placeholders: {{MOCKUP_IMAGE}} for hero/product images, {{AVATAR_IMAGE}} for avatars, {{VIDEO_URL}} for videos
5. Make components responsive and accessible
6. Follow Astro best practices
7. Return ONLY the component code, no explanations
8. If user specifies layout (left/right), implement it precisely with flexbox
9. If user specifies content (headlines, text, counts), include them exactly
10. Use proper TypeScript types

LAYOUT EXAMPLES:
- Content on RIGHT, image on LEFT: Use flex-row-reverse
- Content on LEFT, image on RIGHT: Use flex-row
- Center layout: Use flex-col with text-center`
      },
      {
        name: 'mistral-large-creative',
        model: 'mistral-large-latest',
        temperature: 0.3,
        maxTokens: 4000,
        priority: 2,
        systemPrompt: `You are a creative Astro developer. Generate innovative, modern Astro components with advanced features.

FOCUS ON:
1. Modern design patterns and animations
2. Advanced Tailwind CSS techniques
3. Interactive elements and micro-interactions
4. Accessibility and performance optimization
5. Creative layouts and visual effects
6. User experience best practices

Still follow user requirements but add creative enhancements.`
      }
    ];

    // Vision-specific strategy (ONLY for vision mode)
    const visionStrategy = {
      name: 'gpt4-vision-enhanced',
      model: 'gpt-4-vision-preview',
      temperature: 0.2,
      maxTokens: 3000,
      priority: 3,
      systemPrompt: `You are an expert visual designer and Astro developer. Generate components with strong visual appeal.

EMPHASIS ON:
1. Visual hierarchy and design principles
2. Color theory and typography
3. Modern UI/UX patterns
4. Visual feedback and states
5. Responsive design excellence

IMPORTANT: This strategy is ONLY for vision mode. Do not use for Generic pipeline.`
    };

    // Initialize strategies based on mode
    if (this.mode === 'vision') {
      this.strategies = [...baseStrategies, visionStrategy];
      console.log('[CodeGenerationAgent] Initialized with VISION mode strategies (including GPT-4 Vision)');
    } else {
      this.strategies = baseStrategies;
      console.log(`[CodeGenerationAgent] Initialized with ${this.mode.toUpperCase()} mode strategies (NO vision models)`);
    }
  }

  /**
   * Generate code using multiple strategies and select the best result
   */
  async generateComponentCode(requirements: any, userRequest: string): Promise<GenerationResult> {
    console.log(`[CodeGenerationAgent] Starting multi-strategy code generation in ${this.mode.toUpperCase()} mode...`);
    
    // Safety check: Prevent vision models in Generic mode
    if (this.mode === 'generic') {
      const visionStrategies = this.strategies.filter(s => s.name.includes('vision') || s.model.includes('vision'));
      if (visionStrategies.length > 0) {
        console.error('[CodeGenerationAgent] ❌ CRITICAL ERROR: Vision strategies detected in Generic mode!');
        console.error('[CodeGenerationAgent] Vision strategies found:', visionStrategies.map(s => s.name));
        throw new Error('Vision models are not allowed in Generic mode');
      }
      console.log('[CodeGenerationAgent] ✅ Confirmed: No vision strategies in Generic mode');
    }
    
    const results: GenerationResult[] = [];
    
    // Execute all strategies in parallel
    const generationPromises = this.strategies.map(strategy => 
      this.executeStrategy(strategy, requirements, userRequest)
    );
    
    const strategyResults = await Promise.allSettled(generationPromises);
    
    // Collect successful results
    strategyResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`[CodeGenerationAgent] Strategy ${this.strategies[index].name} failed:`, result.reason);
      }
    });
    
    // Select best result using LLM evaluation
    const bestResult = await this.selectBestResult(results, requirements, userRequest);
    
    // Store in history for learning
    this.generationHistory.push({
      requirements,
      userRequest,
      results,
      selectedResult: bestResult,
      timestamp: new Date()
    });
    
    return bestResult;
  }

  /**
   * Execute a specific generation strategy
   */
  private async executeStrategy(
    strategy: CodeGenerationStrategy, 
    requirements: any, 
    userRequest: string
  ): Promise<GenerationResult> {
    
    const userPrompt = this.buildUserPrompt(requirements, userRequest);
    
    try {
      let response: any;
      
      if (strategy.model.includes('codestral')) {
        response = await mistralClient.chat.complete({
          model: strategy.model,
          messages: [
            { role: 'system', content: strategy.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: strategy.temperature,
          maxTokens: strategy.maxTokens
        });
        response = response.choices[0]?.message?.content || '';
      } else if (strategy.model.includes('mistral')) {
        response = await mistralClient.chat.complete({
          model: strategy.model,
          messages: [
            { role: 'system', content: strategy.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: strategy.temperature,
          maxTokens: strategy.maxTokens
        });
        response = response.choices[0]?.message?.content || '';
      } else if (strategy.model.includes('gpt-4') && openaiClient) {
        response = await openaiClient.chat.completions.create({
          model: strategy.model,
          messages: [
            { role: 'system', content: strategy.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: strategy.temperature,
          max_tokens: strategy.maxTokens
        });
        response = response.choices[0]?.message?.content || '';
      } else {
        throw new Error(`Model not supported: ${strategy.model}`);
      }
      
      const code = this.extractCodeFromResponse(response);
      
      return {
        code,
        confidence: 0.8,
        reasoning: `Generated using ${strategy.name} strategy`,
        strategy: strategy.name,
        metadata: {
          model: strategy.model,
          temperature: strategy.temperature,
          maxTokens: strategy.maxTokens
        }
      };
      
    } catch (error) {
      console.error(`[CodeGenerationAgent] Strategy ${strategy.name} failed:`, error);
      throw error;
    }
  }

  /**
   * Build user prompt for code generation
   */
  private buildUserPrompt(requirements: any, userRequest: string): string {
    const prompt = `Generate an Astro component based on these requirements:

COMPONENT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

ORIGINAL USER REQUEST:
"${userRequest}"

Generate the Astro component code:`;
    
    return prompt;
  }

  /**
   * Extract code from LLM response
   */
  private extractCodeFromResponse(response: string): string {
    // Remove markdown code blocks
    let code = response.replace(/```(astro)?/g, '').trim();
    
    // Remove any explanations before or after the code
    const codeBlockMatch = response.match(/```(?:astro)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1].trim();
    }
    
    return code;
  }

  /**
   * Use LLM to select the best result from multiple strategies
   */
  private async selectBestResult(
    results: GenerationResult[], 
    requirements: any, 
    userRequest: string
  ): Promise<GenerationResult> {
    
    if (results.length === 0) {
      throw new Error('No successful generation results');
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    const systemPrompt = `You are an expert code reviewer. Evaluate multiple code generation results and select the best one.

EVALUATION CRITERIA:
1. Adherence to user requirements (most important)
2. Code quality and best practices
3. Visual appeal and modern design
4. Performance and accessibility
5. Maintainability and readability

Return JSON with:
{
  "selectedIndex": 0,
  "reasoning": "explanation",
  "confidence": 0.95
}`;

    const userPrompt = `Evaluate these code generation results:

REQUIREMENTS: ${JSON.stringify(requirements, null, 2)}
USER REQUEST: "${userRequest}"

RESULTS:
${results.map((result, index) => `
Result ${index + 1} (${result.strategy}):
${result.code.substring(0, 500)}...
`).join('\n')}

Select the best result and explain why:`;

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
      const responseString = Array.isArray(responseText) ? responseText.join('') : responseText;
      const jsonMatch = responseString.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        const selectedResult = results[evaluation.selectedIndex];
        
        return {
          ...selectedResult,
          confidence: evaluation.confidence,
          reasoning: evaluation.reasoning
        };
      }
      
      // Fallback: return first result
      return results[0];
      
    } catch (error) {
      console.error('[CodeGenerationAgent] Error selecting best result:', error);
      return results[0];
    }
  }

  /**
   * Learn from generation results
   */
  async learnFromResults(): Promise<void> {
    console.log('[CodeGenerationAgent] Learning from generation history...');
    
    const recentResults = this.generationHistory.slice(-50);
    
    // Analyze success patterns
    const successPatterns = recentResults.filter(r => r.selectedResult.confidence > 0.8);
    const failurePatterns = recentResults.filter(r => r.selectedResult.confidence < 0.6);
    
    // Update strategy priorities based on success rates
    const strategySuccessRates = this.calculateStrategySuccessRates(recentResults);
    
    // Reorder strategies based on success rates
    this.strategies.sort((a, b) => {
      const rateA = strategySuccessRates[a.name] || 0;
      const rateB = strategySuccessRates[b.name] || 0;
      return rateB - rateA;
    });
    
    console.log('[CodeGenerationAgent] Strategy priorities updated based on learning');
  }

  /**
   * Calculate success rates for each strategy
   */
  private calculateStrategySuccessRates(results: any[]): Record<string, number> {
    const strategyStats: Record<string, { success: number; total: number }> = {};
    
    results.forEach(result => {
      result.results.forEach((genResult: any) => {
        const strategy = genResult.strategy;
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = { success: 0, total: 0 };
        }
        
        strategyStats[strategy].total++;
        if (genResult.confidence > 0.7) {
          strategyStats[strategy].success++;
        }
      });
    });
    
    const successRates: Record<string, number> = {};
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      successRates[strategy] = stats.success / stats.total;
    });
    
    return successRates;
  }

  /**
   * Get generation analytics
   */
  getAnalytics(): any {
    const totalGenerations = this.generationHistory.length;
    const averageConfidence = this.generationHistory.reduce((sum, h) => 
      sum + h.selectedResult.confidence, 0) / totalGenerations;
    
    const strategyUsage = this.generationHistory.reduce((stats, h) => {
      h.results.forEach((result: any) => {
        const strategy = result.strategy;
        stats[strategy] = (stats[strategy] || 0) + 1;
      });
      return stats;
    }, {} as Record<string, number>);
    
    return {
      totalGenerations,
      averageConfidence,
      strategyUsage,
      recentGenerations: this.generationHistory.slice(-10)
    };
  }
} 