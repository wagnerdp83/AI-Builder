import { Mistral } from '@mistralai/mistralai';
import { TEST_CONFIG } from './config';
import { 
  MistralRequest, 
  MistralResponse, 
  MistralMessage, 
  ToolDecision,
  TestLog 
} from './types';
import { logTestActivity } from './logger';

// Initialize Mistral client with test configuration
export class TestMistralClient {
  private client: Mistral;
  private config = TEST_CONFIG.mistral;

  constructor() {
    this.client = new Mistral({ 
      apiKey: this.config.apiKey 
    });
  }

  // Test connection to Mistral API
  async testConnection(testId: string): Promise<boolean> {
    try {
      logTestActivity(testId, 'info', 'Testing Mistral API connection');
      
      const testResponse = await this.client.chat.complete({
        model: this.config.model,
        messages: [
          {
            role: 'user' as const,
            content: 'Respond with: {"status": "connected", "test": true}'
          }
        ],
        temperature: 0.1,
        maxTokens: 50
      });

      const content = testResponse.choices[0]?.message?.content;
      const isConnected = (typeof content === 'string' && content.includes('connected')) || false;
      
      logTestActivity(testId, 'info', `Mistral API connection: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      return isConnected;
    } catch (error) {
      logTestActivity(testId, 'error', 'Mistral API connection failed', error);
      return false;
    }
  }

  // Generate tool decision based on test request
  async generateToolDecision(
    prompt: string, 
    componentContent: string, 
    testId: string
  ): Promise<ToolDecision> {
    logTestActivity(testId, 'info', 'Requesting tool decision from Mistral');

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt, componentContent);

    try {
      const response = await this.client.chat.complete({
        model: this.config.model,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt }
        ],
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('No content received from Mistral API');
      }

      logTestActivity(testId, 'info', 'Raw Mistral response received', { content });

      // Parse the JSON response
      const decision = this.parseToolDecision(content);
      logTestActivity(testId, 'info', 'Tool decision parsed successfully', decision);
      
      return decision;
    } catch (error) {
      logTestActivity(testId, 'error', 'Failed to generate tool decision', error);
      throw error;
    }
  }

  // Request error recovery from Codestral agent
  async requestErrorRecovery(
    originalPrompt: string,
    errorMessage: string,
    componentContent: string,
    testId: string
  ): Promise<ToolDecision> {
    logTestActivity(testId, 'info', 'Requesting error recovery from Codestral agent');

    const recoveryPrompt = `
The previous attempt to modify the component failed. Please analyze the error and provide corrected instructions.

ORIGINAL REQUEST: "${originalPrompt}"
ERROR MESSAGE: "${errorMessage}"

COMPONENT CONTENT:
${componentContent}

Please provide a new, corrected tool decision that addresses the error and accomplishes the original goal.
    `;

    try {
      const response = await this.client.chat.complete({
        model: this.config.model,
        messages: [
          { 
            role: 'system' as const, 
            content: 'You are a debugging expert. Analyze the error and provide corrected instructions in JSON format.' 
          },
          { role: 'user' as const, content: recoveryPrompt }
        ],
        temperature: 0.1,
        maxTokens: 600
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('No recovery content received from Mistral API');
      }

      const recoveryDecision = this.parseToolDecision(content);
      logTestActivity(testId, 'info', 'Error recovery decision generated', recoveryDecision);
      
      return recoveryDecision;
    } catch (error) {
      logTestActivity(testId, 'error', 'Error recovery failed', error);
      throw error;
    }
  }

  // Build system prompt for tool selection
  private buildSystemPrompt(): string {
    return `You are an expert UI modification agent. Your task is to analyze user requests and provide precise tool decisions for modifying Astro components.

AVAILABLE TOOLS:
- style-update: For changing CSS classes, colors, backgrounds, etc.
- text-edit: For updating text content, headlines, descriptions
- component-edit: For structural changes to components

RESPONSE FORMAT (JSON only):
{
  "tool": "style-update|text-edit|component-edit",
  "confidence": 0.0-1.0,
  "reasoning": "Why this tool and approach",
  "instructions": {
    "component": "ComponentName",
    "elementSelector": "CSS selector or class",
    "newContent": "New content or CSS classes",
    "operation": "replace"
  }
}

RULES:
1. Always respond with valid JSON
2. Choose the most appropriate tool
3. Provide specific, actionable selectors
4. Include clear reasoning
5. Use Tailwind CSS classes for styling`;
  }

  // Build user prompt with context
  private buildUserPrompt(prompt: string, componentContent: string): string {
    return `
USER REQUEST: "${prompt}"

COMPONENT CONTENT:
${componentContent}

Analyze the request and component content, then provide a JSON tool decision to accomplish the requested change.`;
  }

  // Parse tool decision from Mistral response
  private parseToolDecision(content: string): ToolDecision {
    try {
      // Remove code block markers if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanContent);
      
      // Validate required fields
      if (!parsed.tool || !parsed.confidence || !parsed.reasoning || !parsed.instructions) {
        throw new Error('Missing required fields in tool decision');
      }

      return parsed as ToolDecision;
    } catch (error) {
      throw new Error(`Failed to parse tool decision: ${error}`);
    }
  }

  // Get API usage statistics
  getApiStats(): object {
    return {
      apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : 'NOT_SET',
      model: this.config.model,
      agentId: this.config.agentId,
      apiUrl: this.config.apiUrl
    };
  }
} 