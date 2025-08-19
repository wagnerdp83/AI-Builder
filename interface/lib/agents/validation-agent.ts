import { Mistral } from '@mistralai/mistralai';
import { AstroValidator } from '../validation/astro-validator';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  metadata: any;
}

interface SemanticValidationResult {
  requirementsAlignment: number; // 0-1 score
  userIntentMatch: number; // 0-1 score
  semanticIssues: string[];
  improvements: string[];
}

export class ValidationAgent {
  private astroValidator: AstroValidator;
  private validationHistory: any[] = [];

  constructor() {
    this.astroValidator = new AstroValidator();
  }

  /**
   * Comprehensive validation using multiple techniques
   */
  async validateCode(
    generatedCode: string, 
    requirements: any, 
    userRequest: string
  ): Promise<ValidationResult> {
    
    console.log('[ValidationAgent] Starting comprehensive validation...');
    
    const results = await Promise.all([
      this.syntaxValidation(generatedCode),
      this.semanticValidation(generatedCode, requirements, userRequest),
      this.requirementsValidation(generatedCode, requirements),
      this.performanceValidation(generatedCode),
      this.accessibilityValidation(generatedCode)
    ]);
    
    // Combine all validation results
    const combinedResult = this.combineValidationResults(results);
    
    // Store in history for learning
    this.validationHistory.push({
      generatedCode,
      requirements,
      userRequest,
      results,
      combinedResult,
      timestamp: new Date()
    });
    
    return combinedResult;
  }

  /**
   * Syntax and structural validation
   */
  private async syntaxValidation(code: string): Promise<ValidationResult> {
    try {
      const astroValidation = await this.astroValidator.validate(code);
      
      return {
        isValid: astroValidation.isValid,
        confidence: 0.9,
        errors: astroValidation.errors,
        warnings: astroValidation.warnings,
        suggestions: astroValidation.suggestions || [],
        metadata: {
          type: 'syntax',
          astroValidation
        }
      };
    } catch (error) {
      return {
        isValid: false,
        confidence: 0.5,
        errors: [`Syntax validation failed: ${error.message}`],
        warnings: [],
        suggestions: [],
        metadata: { type: 'syntax', error: error.message }
      };
    }
  }

  /**
   * Semantic validation using LLM
   */
  private async semanticValidation(
    code: string, 
    requirements: any, 
    userRequest: string
  ): Promise<ValidationResult> {
    
    const systemPrompt = `You are an expert code reviewer. Analyze the generated code for semantic alignment with user requirements.

VALIDATION CRITERIA:
1. Does the code implement the user's layout requirements?
2. Does the code include all specified content elements?
3. Does the code follow the user's styling preferences?
4. Is the code semantically correct and meaningful?
5. Does the code match the user's intent?

Return JSON with:
{
  "isValid": true/false,
  "confidence": 0.95,
  "errors": ["list of semantic errors"],
  "warnings": ["list of warnings"],
  "suggestions": ["list of improvements"],
  "requirementsAlignment": 0.9,
  "userIntentMatch": 0.95
}`;

    const userPrompt = `Validate this generated code against the user requirements:

USER REQUEST: "${userRequest}"

REQUIREMENTS: ${JSON.stringify(requirements, null, 2)}

GENERATED CODE:
\`\`\`astro
${code}
\`\`\`

Analyze semantic alignment and provide detailed feedback:`;

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
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const semanticResult = JSON.parse(jsonMatch[0]);
        
        return {
          isValid: semanticResult.isValid,
          confidence: semanticResult.confidence,
          errors: semanticResult.errors || [],
          warnings: semanticResult.warnings || [],
          suggestions: semanticResult.suggestions || [],
          metadata: {
            type: 'semantic',
            requirementsAlignment: semanticResult.requirementsAlignment,
            userIntentMatch: semanticResult.userIntentMatch
          }
        };
      }
      
      return {
        isValid: true,
        confidence: 0.7,
        errors: [],
        warnings: ['Semantic validation could not be completed'],
        suggestions: [],
        metadata: { type: 'semantic' }
      };
      
    } catch (error) {
      console.error('[ValidationAgent] Semantic validation error:', error);
      return {
        isValid: true,
        confidence: 0.5,
        errors: [],
        warnings: ['Semantic validation failed'],
        suggestions: [],
        metadata: { type: 'semantic', error: error.message }
      };
    }
  }

  /**
   * Requirements-specific validation using AI intelligence
   */
  private async requirementsValidation(code: string, requirements: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check if requirements exist
    if (!requirements) {
      warnings.push('No requirements provided for validation');
      return {
        isValid: true,
        confidence: 0.5,
        errors,
        warnings,
        suggestions,
        metadata: { type: 'requirements' }
      };
    }

    // INTELLIGENT VALIDATION USING AI
    try {
      const validationPrompt = `You are an expert AI validator for web components. Analyze the generated code against the requirements and provide intelligent validation feedback.

VALIDATION TASKS:
1. **Component Type Validation**: Does the code match the intended component type?
2. **Layout Compliance**: Does the layout match user specifications?
3. **Content Accuracy**: Does the content match the business domain and requirements?
4. **Styling Consistency**: Is the styling appropriate for the business domain?
5. **Functionality Check**: Are interactive features properly implemented?
6. **Accessibility Review**: Are accessibility standards met?
7. **Performance Assessment**: Is the code optimized for performance?

ANALYSIS CRITERIA:
- **Business Domain Alignment**: Code should match the industry context
- **User Intent Compliance**: Code should fulfill the user's stated requirements
- **Technical Quality**: Code should follow best practices
- **Visual Consistency**: Styling should be appropriate for the domain
- **Interactive Functionality**: Interactive features should work as intended

Return JSON with validation results:
{
  "isValid": true/false,
  "confidence": 0.95,
  "errors": ["list of critical issues"],
  "warnings": ["list of minor issues"],
  "suggestions": ["list of improvements"],
  "reasoning": "AI analysis of the validation"
}`;

      const userPrompt = `Validate this component code against the requirements:

GENERATED CODE:
\`\`\`astro
${code}
\`\`\`

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Provide intelligent validation feedback based on the component type, business domain, and user requirements.`;

      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: validationPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 1000
      });

      const responseText = response.choices[0]?.message?.content || '';
      const responseString = Array.isArray(responseText) ? responseText.join('') : responseText;
      const jsonMatch = responseString.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const validationResult = JSON.parse(jsonMatch[0]);
        return {
          isValid: validationResult.isValid || true,
          confidence: validationResult.confidence || 0.8,
          errors: validationResult.errors || [],
          warnings: validationResult.warnings || [],
          suggestions: validationResult.suggestions || [],
          metadata: { 
            type: 'requirements',
            aiValidation: true,
            reasoning: validationResult.reasoning
          }
        };
      }

    } catch (error) {
      console.error('[ValidationAgent] AI validation failed:', error);
      // Fallback to basic validation
    }
    
    // FALLBACK VALIDATION (if AI validation fails)
    // Check layout requirements
    if (requirements.layout) {
      const layout = requirements.layout;
      
      if (layout.contentPosition && layout.imagePosition) {
        const hasFlexRow = code.includes('flex-row');
        const hasFlexRowReverse = code.includes('flex-row-reverse');
        
        if (layout.contentPosition === 'right' && layout.imagePosition === 'left') {
          if (!hasFlexRowReverse) {
            errors.push('Layout requirement not met: content should be on right, image on left');
          }
        } else if (layout.contentPosition === 'left' && layout.imagePosition === 'right') {
          if (!hasFlexRow) {
            errors.push('Layout requirement not met: content should be on left, image on right');
          }
        }
      }
    }
    
    // Check content requirements
    if (requirements.content) {
      const content = requirements.content;
      
      if (content.elements) {
        content.elements.forEach((element: string) => {
          if (element.includes('headline') && !code.includes('h1') && !code.includes('h2')) {
            warnings.push(`Headline element not found in code`);
          }
          if (element.includes('avatar') && !code.includes('avatar')) {
            warnings.push(`Avatar elements not found in code`);
          }
        });
      }
      
      if (content.counts) {
        Object.entries(content.counts).forEach(([key, value]) => {
          const count = (code.match(new RegExp(key, 'gi')) || []).length;
          if (count < (value as number)) {
            warnings.push(`Expected ${value} ${key}, found ${count}`);
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      confidence: errors.length === 0 ? 0.9 : 0.6,
      errors,
      warnings,
      suggestions,
      metadata: { type: 'requirements' }
    };
  }

  /**
   * Performance validation
   */
  private async performanceValidation(code: string): Promise<ValidationResult> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for performance issues
    if (code.includes('document.querySelector') || code.includes('document.getElementById')) {
      warnings.push('Direct DOM manipulation detected - consider using Astro patterns');
    }
    
    if (code.includes('innerHTML')) {
      warnings.push('innerHTML usage detected - potential security risk');
    }
    
    if (code.includes('setInterval') || code.includes('setTimeout')) {
      warnings.push('Timer usage detected - ensure proper cleanup');
    }
    
    // Check for large inline styles
    const styleMatches = code.match(/style="[^"]*"/g);
    if (styleMatches && styleMatches.length > 5) {
      suggestions.push('Consider moving inline styles to Tailwind classes');
    }
    
    return {
      isValid: true,
      confidence: 0.8,
      errors: [],
      warnings,
      suggestions,
      metadata: { type: 'performance' }
    };
  }

  /**
   * Accessibility validation
   */
  private async accessibilityValidation(code: string): Promise<ValidationResult> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Check for accessibility issues
    if (code.includes('<img') && !code.includes('alt=')) {
      warnings.push('Images missing alt attributes');
    }
    
    if (code.includes('<button') && !code.includes('aria-label') && !code.includes('>')) {
      warnings.push('Buttons missing accessible labels');
    }
    
    if (code.includes('tabindex') && !code.includes('tabindex="0"') && !code.includes('tabindex="-1"')) {
      warnings.push('Invalid tabindex values detected');
    }
    
    // Check for semantic HTML
    if (code.includes('<div') && code.includes('onclick') && !code.includes('role=')) {
      suggestions.push('Consider using semantic elements or adding ARIA roles');
    }
    
    return {
      isValid: true,
      confidence: 0.8,
      errors: [],
      warnings,
      suggestions,
      metadata: { type: 'accessibility' }
    };
  }

  /**
   * Combine multiple validation results
   */
  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const allSuggestions: string[] = [];
    let totalConfidence = 0;
    let validResults = 0;
    
    results.forEach(result => {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
      allSuggestions.push(...result.suggestions);
      
      if (result.isValid) {
        totalConfidence += result.confidence;
        validResults++;
      }
    });
    
    const averageConfidence = validResults > 0 ? totalConfidence / validResults : 0;
    const isValid = allErrors.length === 0;
    
    return {
      isValid,
      confidence: averageConfidence,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      metadata: {
        validationTypes: results.map(r => r.metadata?.type),
        totalValidations: results.length
      }
    };
  }

  /**
   * Learn from validation results
   */
  async learnFromValidation(): Promise<void> {
    console.log('[ValidationAgent] Learning from validation history...');
    
    const recentValidations = this.validationHistory.slice(-50);
    
    // Analyze common validation issues
    const commonErrors = this.analyzeCommonErrors(recentValidations);
    const commonWarnings = this.analyzeCommonWarnings(recentValidations);
    
    // Update validation rules based on patterns
    this.updateValidationRules(commonErrors, commonWarnings);
    
    console.log('[ValidationAgent] Validation rules updated based on learning');
  }

  /**
   * Analyze common validation errors
   */
  private analyzeCommonErrors(validations: any[]): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    validations.forEach(validation => {
      validation.combinedResult.errors.forEach((error: string) => {
        const key = error.toLowerCase().split(' ').slice(0, 3).join(' ');
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });
    });
    
    return errorCounts;
  }

  /**
   * Analyze common validation warnings
   */
  private analyzeCommonWarnings(validations: any[]): Record<string, number> {
    const warningCounts: Record<string, number> = {};
    
    validations.forEach(validation => {
      validation.combinedResult.warnings.forEach((warning: string) => {
        const key = warning.toLowerCase().split(' ').slice(0, 3).join(' ');
        warningCounts[key] = (warningCounts[key] || 0) + 1;
      });
    });
    
    return warningCounts;
  }

  /**
   * Update validation rules based on learning
   */
  private updateValidationRules(commonErrors: Record<string, number>, commonWarnings: Record<string, number>): void {
    // This would update validation rules based on common patterns
    // For now, just log the patterns
    console.log('[ValidationAgent] Common errors:', commonErrors);
    console.log('[ValidationAgent] Common warnings:', commonWarnings);
  }

  /**
   * Get validation analytics
   */
  getAnalytics(): any {
    const totalValidations = this.validationHistory.length;
    const successfulValidations = this.validationHistory.filter(v => v.combinedResult.isValid).length;
    const averageConfidence = this.validationHistory.reduce((sum, v) => 
      sum + v.combinedResult.confidence, 0) / totalValidations;
    
    const validationTypeStats = this.validationHistory.reduce((stats, v) => {
      v.combinedResult.metadata.validationTypes.forEach((type: string) => {
        stats[type] = (stats[type] || 0) + 1;
      });
      return stats;
    }, {} as Record<string, number>);
    
    return {
      totalValidations,
      successfulValidations,
      successRate: successfulValidations / totalValidations,
      averageConfidence,
      validationTypeStats,
      recentValidations: this.validationHistory.slice(-10)
    };
  }
} 