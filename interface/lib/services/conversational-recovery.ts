import { Mistral } from '@mistralai/mistralai';
import { UserIntent } from '../types/intent-types';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'boolean' | 'number';
  options?: string[];
  context: string;
  importance: 'high' | 'medium' | 'low';
}

export interface RecoveryContext {
  original_prompt: string;
  detected_intent: UserIntent;
  confidence: number;
  uncertainty_reasons: string[];
  clarification_questions: ClarificationQuestion[];
  suggested_alternatives: string[];
}

export interface RecoveryResponse {
  needs_clarification: boolean;
  clarification_questions?: ClarificationQuestion[];
  suggested_alternatives?: string[];
  confidence_boost?: number;
  reasoning: string;
}

export class ConversationalRecoveryService {
  
  /**
   * Analyze if clarification is needed and generate questions
   */
  async analyzeForClarification(
    userPrompt: string, 
    detectedIntent: UserIntent, 
    confidence: number
  ): Promise<RecoveryResponse> {
    console.log('[ConversationalRecovery] Analyzing need for clarification');
    
    // Check if confidence is too low
    if (confidence < 0.6) {
      return await this.generateClarificationQuestions(userPrompt, detectedIntent, confidence);
    }
    
    // Check for ambiguous terms
    const ambiguousTerms = this.detectAmbiguousTerms(userPrompt);
    if (ambiguousTerms.length > 0) {
      return await this.generateClarificationQuestions(userPrompt, detectedIntent, confidence, ambiguousTerms);
    }
    
    // Check for missing critical information
    const missingInfo = this.detectMissingInformation(userPrompt, detectedIntent);
    if (missingInfo.length > 0) {
      return await this.generateClarificationQuestions(userPrompt, detectedIntent, confidence, [], missingInfo);
    }
    
    return {
      needs_clarification: false,
      reasoning: 'Confidence is high and no ambiguous terms detected'
    };
  }
  
  /**
   * Generate specific clarification questions
   */
  private async generateClarificationQuestions(
    userPrompt: string,
    detectedIntent: UserIntent,
    confidence: number,
    ambiguousTerms: string[] = [],
    missingInfo: string[] = []
  ): Promise<RecoveryResponse> {
    
    const analysisPrompt = `Analyze this user request and generate clarification questions:

User Prompt: "${userPrompt}"
Detected Intent: ${JSON.stringify(detectedIntent)}
Confidence: ${confidence}
Ambiguous Terms: ${ambiguousTerms.join(', ')}
Missing Information: ${missingInfo.join(', ')}

Generate 2-3 specific clarification questions to resolve uncertainty. Focus on:
1. Business type and industry
2. Design preferences (modern, minimal, etc.)
3. Specific features or sections needed
4. Color scheme or branding
5. Target audience

Return JSON with:
{
  "questions": [
    {
      "id": "unique_id",
      "question": "Clear, specific question",
      "type": "multiple_choice|text|boolean",
      "options": ["option1", "option2"] (for multiple_choice),
      "context": "Why this question is needed",
      "importance": "high|medium|low"
    }
  ],
  "suggested_alternatives": ["alternative1", "alternative2"],
  "reasoning": "Why clarification is needed"
}

Return only the JSON object:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at generating clarifying questions for website creation requests.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
        maxTokens: 800
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        return {
          needs_clarification: true,
          clarification_questions: result.questions || [],
          suggested_alternatives: result.suggested_alternatives || [],
          reasoning: result.reasoning || 'Clarification needed to improve accuracy'
        };
      }
      
      return {
        needs_clarification: true,
        clarification_questions: this.generateDefaultQuestions(userPrompt),
        reasoning: 'Unable to parse specific questions, using defaults'
      };
      
    } catch (error) {
      console.error('[ConversationalRecovery] Error generating clarification questions:', error);
      return {
        needs_clarification: true,
        clarification_questions: this.generateDefaultQuestions(userPrompt),
        reasoning: 'Error generating questions, using defaults'
      };
    }
  }
  
  /**
   * Generate default clarification questions
   */
  private generateDefaultQuestions(userPrompt: string): ClarificationQuestion[] {
    return [
      {
        id: 'business_type',
        question: 'What type of business or industry is this website for?',
        type: 'multiple_choice',
        options: ['Technology/Software', 'E-commerce/Retail', 'Professional Services', 'Creative/Portfolio', 'Restaurant/Food', 'Real Estate', 'Healthcare', 'Education', 'Other'],
        context: 'This helps determine the appropriate design style and content focus',
        importance: 'high'
      },
      {
        id: 'design_style',
        question: 'What design style would you prefer?',
        type: 'multiple_choice',
        options: ['Modern and Clean', 'Minimal and Simple', 'Creative and Bold', 'Professional and Corporate', 'Warm and Friendly', 'Luxury and Elegant'],
        context: 'This guides the visual design and layout choices',
        importance: 'high'
      },
      {
        id: 'color_preference',
        question: 'Do you have any color preferences or brand colors?',
        type: 'text',
        context: 'This ensures the design matches your brand identity',
        importance: 'medium'
      }
    ];
  }
  
  /**
   * Detect ambiguous terms in the prompt
   */
  private detectAmbiguousTerms(prompt: string): string[] {
    const ambiguousTerms = [
      'modern', 'professional', 'creative', 'elegant', 'simple', 'clean',
      'beautiful', 'attractive', 'stunning', 'amazing', 'great', 'good',
      'nice', 'pretty', 'cool', 'awesome', 'fantastic'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return ambiguousTerms.filter(term => lowerPrompt.includes(term));
  }
  
  /**
   * Detect missing critical information
   */
  private detectMissingInformation(prompt: string, intent: UserIntent): string[] {
    const missing: string[] = [];
    
    // Check for business type
    if (!intent.slots.business_type) {
      missing.push('business_type');
    }
    
    // Check for theme/style
    if (!intent.slots.theme) {
      missing.push('design_theme');
    }
    
    // Check for specific sections
    if (!intent.slots.sections || intent.slots.sections.length === 0) {
      missing.push('specific_sections');
    }
    
    // Check for color preferences
    if (!intent.slots.colors || intent.slots.colors.length === 0) {
      missing.push('color_preferences');
    }
    
    return missing;
  }
  
  /**
   * Process user's clarification response
   */
  async processClarificationResponse(
    originalPrompt: string,
    clarificationQuestions: ClarificationQuestion[],
    userResponses: Record<string, any>
  ): Promise<{
    enhanced_prompt: string;
    updated_intent: UserIntent;
    confidence_boost: number;
  }> {
    console.log('[ConversationalRecovery] Processing clarification responses');
    
    // Enhance the original prompt with clarification responses
    let enhancedPrompt = originalPrompt;
    let confidenceBoost = 0;
    
    for (const question of clarificationQuestions) {
      const response = userResponses[question.id];
      if (response) {
        enhancedPrompt += `\n\nClarification: ${question.question} - ${response}`;
        confidenceBoost += 0.1; // Boost confidence for each clarification
      }
    }
    
    // Update the intent with clarification information
    const updatedIntent = await this.updateIntentWithClarifications(
      originalPrompt,
      userResponses
    );
    
    return {
      enhanced_prompt: enhancedPrompt,
      updated_intent: updatedIntent,
      confidence_boost: Math.min(confidenceBoost, 0.4) // Cap at 40% boost
    };
  }
  
  /**
   * Update intent with clarification responses
   */
  private async updateIntentWithClarifications(
    originalPrompt: string,
    userResponses: Record<string, any>
  ): Promise<UserIntent> {
    
    const updatePrompt = `Update this intent with user clarifications:

Original Intent: ${originalPrompt}
User Clarifications: ${JSON.stringify(userResponses)}

Update the intent slots based on the clarifications. Return the updated intent as JSON:

{
  "intent": "create_website",
  "slots": {
    "business_type": "updated_business_type",
    "theme": "updated_theme",
    "colors": ["updated_colors"],
    "sections": ["updated_sections"]
  },
  "confidence": 0.9,
  "raw_prompt": "enhanced_prompt"
}

Return only the JSON object:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at updating user intents based on clarifications.' },
          { role: 'user', content: updatePrompt }
        ],
        temperature: 0.1,
        maxTokens: 500
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to basic intent
      return {
        intent: 'create_website',
        slots: {},
        confidence: 0.8,
        raw_prompt: originalPrompt
      };
      
    } catch (error) {
      console.error('[ConversationalRecovery] Error updating intent:', error);
      return {
        intent: 'create_website',
        slots: {},
        confidence: 0.8,
        raw_prompt: originalPrompt
      };
    }
  }
  
  /**
   * Generate progressive refinement suggestions
   */
  async generateProgressiveRefinement(
    userPrompt: string,
    currentResult: any,
    userFeedback?: string
  ): Promise<{
    suggestions: string[];
    next_questions: ClarificationQuestion[];
    improvement_areas: string[];
  }> {
    console.log('[ConversationalRecovery] Generating progressive refinement');
    
    const refinementPrompt = `Analyze the current result and suggest improvements:

User Original Request: "${userPrompt}"
Current Result: ${JSON.stringify(currentResult)}
User Feedback: ${userFeedback || 'None provided'}

Generate progressive refinement suggestions. Return JSON with:
{
  "suggestions": ["suggestion1", "suggestion2"],
  "next_questions": [
    {
      "id": "refinement_id",
      "question": "Specific refinement question",
      "type": "multiple_choice",
      "options": ["option1", "option2"],
      "context": "Why this refinement is needed",
      "importance": "medium"
    }
  ],
  "improvement_areas": ["area1", "area2"]
}

Return only the JSON object:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at suggesting progressive improvements for website generation.' },
          { role: 'user', content: refinementPrompt }
        ],
        temperature: 0.1,
        maxTokens: 600
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        suggestions: ['Add more specific sections', 'Include color preferences'],
        next_questions: [],
        improvement_areas: ['specificity', 'design_preferences']
      };
      
    } catch (error) {
      console.error('[ConversationalRecovery] Error generating refinement:', error);
      return {
        suggestions: ['Add more specific sections', 'Include color preferences'],
        next_questions: [],
        improvement_areas: ['specificity', 'design_preferences']
      };
    }
  }
  
  /**
   * Check if user wants to continue with current result
   */
  async checkUserSatisfaction(
    userPrompt: string,
    generatedResult: any,
    userResponse: string
  ): Promise<{
    is_satisfied: boolean;
    confidence: number;
    next_action: 'proceed' | 'refine' | 'restart' | 'clarify';
    reasoning: string;
  }> {
    
    const satisfactionPrompt = `Analyze user satisfaction with the generated result:

User Original Request: "${userPrompt}"
Generated Result: ${JSON.stringify(generatedResult)}
User Response: "${userResponse}"

Determine if the user is satisfied and what the next action should be.

Return JSON with:
{
  "is_satisfied": boolean,
  "confidence": number (0-1),
  "next_action": "proceed|refine|restart|clarify",
  "reasoning": "Explanation of the analysis"
}

Return only the JSON object:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing user satisfaction and determining next actions.' },
          { role: 'user', content: satisfactionPrompt }
        ],
        temperature: 0.1,
        maxTokens: 300
      });

      const responseText = response.choices[0]?.message?.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Default analysis
      const lowerResponse = userResponse.toLowerCase();
      if (lowerResponse.includes('yes') || lowerResponse.includes('good') || lowerResponse.includes('perfect')) {
        return {
          is_satisfied: true,
          confidence: 0.8,
          next_action: 'proceed',
          reasoning: 'User expressed satisfaction'
        };
      } else if (lowerResponse.includes('no') || lowerResponse.includes('change') || lowerResponse.includes('different')) {
        return {
          is_satisfied: false,
          confidence: 0.7,
          next_action: 'refine',
          reasoning: 'User wants changes'
        };
      } else {
        return {
          is_satisfied: false,
          confidence: 0.5,
          next_action: 'clarify',
          reasoning: 'Unclear user response'
        };
      }
      
    } catch (error) {
      console.error('[ConversationalRecovery] Error checking satisfaction:', error);
      return {
        is_satisfied: false,
        confidence: 0.5,
        next_action: 'clarify',
        reasoning: 'Error analyzing user satisfaction'
      };
    }
  }
} 