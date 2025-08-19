import { promises as fs } from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { UserIntent } from '../types/intent-types';
import { ValidationResult } from '../types/intermediate-representation';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

export interface FeedbackEntry {
  id: string;
  timestamp: Date;
  user_prompt: string;
  detected_intent: UserIntent;
  generated_code?: string;
  validation_result?: ValidationResult;
  error_message?: string;
  success: boolean;
  processing_time: number;
  retry_count: number;
  human_correction?: string;
  learning_applied: boolean;
}

export interface LearningMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_processing_time: number;
  common_errors: Record<string, number>;
  intent_accuracy: Record<string, number>;
  component_success_rates: Record<string, number>;
}

export class FeedbackLearningService {
  private feedbackLogPath: string;
  private learningDataPath: string;
  private metricsPath: string;
  
  constructor() {
    const dataDir = path.join(process.cwd(), 'lib', 'data', 'feedback');
    this.feedbackLogPath = path.join(dataDir, 'feedback-log.json');
    this.learningDataPath = path.join(dataDir, 'learning-data.json');
    this.metricsPath = path.join(dataDir, 'metrics.json');
    
    // Ensure directories exist
    this.ensureDataDirectory();
  }
  
  /**
   * Log a feedback entry for learning
   */
  async logFeedback(entry: Omit<FeedbackEntry, 'id' | 'timestamp' | 'learning_applied'>): Promise<void> {
    console.log('[FeedbackLearning] Logging feedback entry');
    
    const feedbackEntry: FeedbackEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
      learning_applied: false
    };
    
    try {
      const existingLog = await this.loadFeedbackLog();
      existingLog.push(feedbackEntry);
      await this.saveFeedbackLog(existingLog);
      
      console.log('[FeedbackLearning] Feedback logged successfully');
      
      // Trigger learning analysis if this was a failure
      if (!feedbackEntry.success) {
        await this.analyzeFailure(feedbackEntry);
      }
      
    } catch (error) {
      console.error('[FeedbackLearning] Error logging feedback:', error);
    }
  }
  
  /**
   * Analyze a failure and extract learning insights
   */
  private async analyzeFailure(entry: FeedbackEntry): Promise<void> {
    console.log('[FeedbackLearning] Analyzing failure for learning');
    
    try {
      const analysisPrompt = `Analyze this failed generation and provide insights for improvement:

User Prompt: "${entry.user_prompt}"
Detected Intent: ${JSON.stringify(entry.detected_intent)}
Error: ${entry.error_message}
Generated Code: ${entry.generated_code || 'None'}

Provide a JSON response with:
1. Root cause analysis
2. Suggested improvements
3. Pattern recognition
4. Prevention strategies

Return only the JSON object:`;

      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing AI generation failures and extracting learning insights.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
        maxTokens: 1000
      });

      const analysis = response.choices[0]?.message?.content || '';
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        await this.storeLearningInsights(entry.id, insights);
        console.log('[FeedbackLearning] Learning insights stored');
      }
      
    } catch (error) {
      console.error('[FeedbackLearning] Error analyzing failure:', error);
    }
  }
  
  /**
   * Store learning insights for future use
   */
  private async storeLearningInsights(entryId: string, insights: any): Promise<void> {
    try {
      const learningData = await this.loadLearningData();
      learningData[entryId] = {
        timestamp: new Date(),
        insights,
        applied: false
      };
      await this.saveLearningData(learningData);
    } catch (error) {
      console.error('[FeedbackLearning] Error storing learning insights:', error);
    }
  }
  
  /**
   * Apply learned insights to improve future generations
   */
  async applyLearningInsights(prompt: string, intent: UserIntent): Promise<{
    enhanced_prompt: string;
    confidence_boost: number;
    applied_insights: string[];
  }> {
    console.log('[FeedbackLearning] Applying learning insights');
    
    try {
      const learningData = await this.loadLearningData();
      const relevantInsights = this.findRelevantInsights(prompt, intent, learningData);
      
      if (relevantInsights.length === 0) {
        return {
          enhanced_prompt: prompt,
          confidence_boost: 0,
          applied_insights: []
        };
      }
      
      // Enhance prompt with learned insights
      let enhancedPrompt = prompt;
      const appliedInsights: string[] = [];
      let confidenceBoost = 0;
      
      for (const insight of relevantInsights) {
        if (insight.insights.suggested_improvements) {
          enhancedPrompt += `\n\nLearning Context: ${insight.insights.suggested_improvements}`;
          appliedInsights.push(insight.insights.suggested_improvements);
          confidenceBoost += 0.1;
        }
        
        if (insight.insights.prevention_strategies) {
          enhancedPrompt += `\n\nPrevention: ${insight.insights.prevention_strategies}`;
          appliedInsights.push(insight.insights.prevention_strategies);
          confidenceBoost += 0.05;
        }
      }
      
      console.log('[FeedbackLearning] Applied', appliedInsights.length, 'insights');
      
      return {
        enhanced_prompt: enhancedPrompt,
        confidence_boost: Math.min(confidenceBoost, 0.3), // Cap at 30% boost
        applied_insights: appliedInsights
      };
      
    } catch (error) {
      console.error('[FeedbackLearning] Error applying learning insights:', error);
      return {
        enhanced_prompt: prompt,
        confidence_boost: 0,
        applied_insights: []
      };
    }
  }
  
  /**
   * Find relevant insights for current prompt and intent
   */
  private findRelevantInsights(prompt: string, intent: UserIntent, learningData: any): any[] {
    const relevantInsights: any[] = [];
    
    for (const [entryId, data] of Object.entries(learningData)) {
      const entryData = data as any;
      
      // Check if insights are relevant based on intent similarity
      if (entryData.insights.root_cause && intent.intent === 'create_website') {
        // Check for similar business types or themes
        if (entryData.insights.pattern_recognition) {
          const pattern = entryData.insights.pattern_recognition.toLowerCase();
          const currentPrompt = prompt.toLowerCase();
          
          if (pattern.includes('business') || pattern.includes('theme') || 
              currentPrompt.includes('business') || currentPrompt.includes('theme')) {
            relevantInsights.push(entryData);
          }
        }
      }
    }
    
    return relevantInsights.slice(0, 3); // Limit to top 3 most relevant
  }
  
  /**
   * Generate learning metrics
   */
  async generateMetrics(): Promise<LearningMetrics> {
    console.log('[FeedbackLearning] Generating learning metrics');
    
    try {
      const feedbackLog = await this.loadFeedbackLog();
      
      const metrics: LearningMetrics = {
        total_requests: feedbackLog.length,
        successful_requests: feedbackLog.filter(entry => entry.success).length,
        failed_requests: feedbackLog.filter(entry => !entry.success).length,
        average_processing_time: this.calculateAverageProcessingTime(feedbackLog),
        common_errors: this.analyzeCommonErrors(feedbackLog),
        intent_accuracy: this.analyzeIntentAccuracy(feedbackLog),
        component_success_rates: this.analyzeComponentSuccessRates(feedbackLog)
      };
      
      await this.saveMetrics(metrics);
      console.log('[FeedbackLearning] Metrics generated successfully');
      
      return metrics;
      
    } catch (error) {
      console.error('[FeedbackLearning] Error generating metrics:', error);
      throw error;
    }
  }
  
  /**
   * Self-reflection prompt for verification
   */
  async generateSelfReflectionPrompt(userPrompt: string, generatedCode: string, intent: UserIntent): Promise<string> {
    const reflectionPrompt = `Analyze if the generated code matches the user's intent:

User Request: "${userPrompt}"
Detected Intent: ${JSON.stringify(intent)}
Generated Code Length: ${generatedCode.length} characters

Questions for self-reflection:
1. Does the generated code address all aspects of the user's request?
2. Are there any missing features or sections?
3. Is the code quality and structure appropriate?
4. Are there any potential issues or improvements needed?

Provide a JSON response with:
{
  "matches_intent": boolean,
  "confidence_score": number (0-1),
  "missing_features": string[],
  "quality_issues": string[],
  "suggested_improvements": string[]
}

Return only the JSON object:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing code quality and intent matching.' },
          { role: 'user', content: reflectionPrompt }
        ],
        temperature: 0.1,
        maxTokens: 500
      });

      return response.choices[0]?.message?.content || '';
      
    } catch (error) {
      console.error('[FeedbackLearning] Error generating self-reflection:', error);
      return '';
    }
  }
  
  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(feedbackLog: FeedbackEntry[]): number {
    if (feedbackLog.length === 0) return 0;
    
    const totalTime = feedbackLog.reduce((sum, entry) => sum + entry.processing_time, 0);
    return totalTime / feedbackLog.length;
  }
  
  /**
   * Analyze common errors
   */
  private analyzeCommonErrors(feedbackLog: FeedbackEntry[]): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    feedbackLog
      .filter(entry => !entry.success && entry.error_message)
      .forEach(entry => {
        const errorKey = this.categorizeError(entry.error_message!);
        errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
      });
    
    return errorCounts;
  }
  
  /**
   * Categorize errors for analysis
   */
  private categorizeError(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('syntax') || lowerError.includes('parse')) {
      return 'syntax_error';
    } else if (lowerError.includes('import') || lowerError.includes('module')) {
      return 'import_error';
    } else if (lowerError.includes('image') || lowerError.includes('path')) {
      return 'image_path_error';
    } else if (lowerError.includes('validation') || lowerError.includes('invalid')) {
      return 'validation_error';
    } else if (lowerError.includes('timeout') || lowerError.includes('time out')) {
      return 'timeout_error';
    } else {
      return 'other_error';
    }
  }
  
  /**
   * Analyze intent accuracy
   */
  private analyzeIntentAccuracy(feedbackLog: FeedbackEntry[]): Record<string, number> {
    const intentStats: Record<string, { success: number; total: number }> = {};
    
    feedbackLog.forEach(entry => {
      const intent = entry.detected_intent.intent;
      if (!intentStats[intent]) {
        intentStats[intent] = { success: 0, total: 0 };
      }
      intentStats[intent].total++;
      if (entry.success) {
        intentStats[intent].success++;
      }
    });
    
    const accuracy: Record<string, number> = {};
    for (const [intent, stats] of Object.entries(intentStats)) {
      accuracy[intent] = stats.total > 0 ? stats.success / stats.total : 0;
    }
    
    return accuracy;
  }
  
  /**
   * Analyze component success rates
   */
  private analyzeComponentSuccessRates(feedbackLog: FeedbackEntry[]): Record<string, number> {
    const componentStats: Record<string, { success: number; total: number }> = {};
    
    feedbackLog.forEach(entry => {
      if (entry.detected_intent.slots.sections) {
        entry.detected_intent.slots.sections.forEach(section => {
          if (!componentStats[section]) {
            componentStats[section] = { success: 0, total: 0 };
          }
          componentStats[section].total++;
          if (entry.success) {
            componentStats[section].success++;
          }
        });
      }
    });
    
    const successRates: Record<string, number> = {};
    for (const [component, stats] of Object.entries(componentStats)) {
      successRates[component] = stats.total > 0 ? stats.success / stats.total : 0;
    }
    
    return successRates;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.feedbackLogPath);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('[FeedbackLearning] Error creating data directory:', error);
    }
  }
  
  /**
   * Load feedback log
   */
  private async loadFeedbackLog(): Promise<FeedbackEntry[]> {
    try {
      const data = await fs.readFile(this.feedbackLogPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Save feedback log
   */
  private async saveFeedbackLog(log: FeedbackEntry[]): Promise<void> {
    await fs.writeFile(this.feedbackLogPath, JSON.stringify(log, null, 2));
  }
  
  /**
   * Load learning data
   */
  private async loadLearningData(): Promise<any> {
    try {
      const data = await fs.readFile(this.learningDataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }
  
  /**
   * Save learning data
   */
  private async saveLearningData(data: any): Promise<void> {
    await fs.writeFile(this.learningDataPath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Save metrics
   */
  private async saveMetrics(metrics: LearningMetrics): Promise<void> {
    await fs.writeFile(this.metricsPath, JSON.stringify(metrics, null, 2));
  }
} 