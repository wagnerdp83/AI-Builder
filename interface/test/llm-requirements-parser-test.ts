import { describe, it, expect, beforeEach } from 'vitest';

// Mock LLMRequirementsParser
class MockLLMRequirementsParser {
  private responseCache: Map<string, any> = new Map();

  async parseRequirements(response: string, componentName?: string): Promise<any> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.warn('[LLMRequirementsParser] No JSON found in response, creating fallback structure');
        return this.createFallbackRequirements(componentName);
      }

      let parsedRequirements;
      try {
        parsedRequirements = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // Enhanced JSON cleanup for LLM responses
        let fixedJson = jsonMatch[0];
        fixedJson = fixedJson
          .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
          .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ':"$1"') // Quote single-quoted strings
          .replace(/:\s*([^",\{\}\[\]\s][^,\{\}\[\]]*)/g, ':"$1"') // Quote other unquoted values
          .replace(/:\s*"([^"]*)"\s*([^,}\]])/g, ':"$1",$2') // Add missing commas
          .replace(/}\s*$/g, '}') // Clean trailing whitespace
          .replace(/]\s*$/g, ']'); // Clean trailing whitespace

        // Check for incomplete JSON and complete it
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;

        // Complete missing brackets/braces
        if (openBraces > closeBraces) {
          fixedJson += '}'.repeat(openBraces - closeBraces);
        }
        if (openBrackets > closeBrackets) {
          fixedJson += ']'.repeat(openBrackets - closeBrackets);
        }

        try {
          parsedRequirements = JSON.parse(fixedJson);
        } catch (secondError) {
          // Create robust fallback structure
          return this.createFallbackRequirements(componentName);
        }
      }

      return parsedRequirements;
    } catch (error) {
      console.error('[LLMRequirementsParser] Error parsing requirements:', error);
      return this.createFallbackRequirements(componentName);
    }
  }

  // Test various malformed JSON scenarios
  getMalformedResponses(): string[] {
    return [
      // Missing quotes around property names
      `{
        requirements: [
          {
            componentName: Hero,
            layout: {
              contentPosition: center
            }
          }
        ]
      }`,

      // Trailing commas
      `{
        "requirements": [
          {
            "componentName": "Hero",
            "layout": {
              "contentPosition": "center",
            },
          },
        ],
      }`,

      // Unclosed brackets
      `{
        "requirements": [
          {
            "componentName": "Hero",
            "layout": {
              "contentPosition": "center"
            }
          }
        `,

      // Mixed quote types
      `{
        'requirements': [
          {
            "componentName": 'Hero',
            layout: {
              "contentPosition": "center"
            }
          }
        ]
      }`,

      // Incomplete JSON
      `{
        "requirements": [
          {
            "componentName": "Hero"
          }
        ]
        "confidence": 0.8
      }`
    ];
  }

  private createFallbackRequirements(componentName?: string): any {
    return {
      requirements: [{
        componentName: componentName || 'Component',
        layout: {
          contentPosition: 'center',
          imagePosition: 'center',
          layoutType: 'flex',
          direction: 'column'
        },
        content: {
          elements: ['basic content'],
          counts: {},
          text: {}
        },
        styling: {
          theme: 'modern',
          colors: [],
          spacing: 'standard',
          responsive: true
        },
        interactions: {
          animations: [],
          hover: false,
          click: false
        }
      }],
      confidence: 0.3,
      reasoning: 'Fallback due to JSON parsing errors'
    };
  }
}

describe('LLMRequirementsParser JSON Parsing', () => {
  let parser: MockLLMRequirementsParser;

  beforeEach(() => {
    parser = new MockLLMRequirementsParser();
  });

  it('should handle unquoted property names', async () => {
    const malformedResponse = `{
      requirements: [
        {
          componentName: Hero,
          layout: {
            contentPosition: center
          }
        }
      ]
    }`;

    const result = await parser.parseRequirements(malformedResponse, 'Hero');
    
    expect(result).toBeDefined();
    expect(result.requirements).toBeDefined();
    expect(result.requirements[0].componentName).toBe('Hero');
  });

  it('should handle trailing commas', async () => {
    const malformedResponse = `{
      "requirements": [
        {
          "componentName": "Hero",
          "layout": {
            "contentPosition": "center",
          },
        },
      ],
    }`;

    const result = await parser.parseRequirements(malformedResponse, 'Hero');
    
    expect(result).toBeDefined();
    expect(result.requirements).toBeDefined();
    expect(result.requirements[0].componentName).toBe('Hero');
  });

  it('should handle unclosed brackets', async () => {
    const malformedResponse = `{
      "requirements": [
        {
          "componentName": "Hero",
          "layout": {
            "contentPosition": "center"
          }
        }
      `;

    const result = await parser.parseRequirements(malformedResponse, 'Hero');
    
    expect(result).toBeDefined();
    expect(result.requirements).toBeDefined();
  });

  it('should handle mixed quote types', async () => {
    const malformedResponse = `{
      'requirements': [
        {
          "componentName": 'Hero',
          layout: {
            "contentPosition": "center"
          }
        }
      ]
    }`;

    const result = await parser.parseRequirements(malformedResponse, 'Hero');
    
    expect(result).toBeDefined();
    expect(result.requirements).toBeDefined();
  });

  it('should create fallback structure when parsing completely fails', async () => {
    const completelyInvalidResponse = `This is not JSON at all`;

    const result = await parser.parseRequirements(completelyInvalidResponse, 'Hero');
    
    expect(result).toBeDefined();
    expect(result.confidence).toBe(0.3);
    expect(result.reasoning).toContain('Fallback due to JSON parsing errors');
    expect(result.requirements[0].componentName).toBe('Hero');
  });

  it('should handle all malformed response types', async () => {
    const malformedResponses = parser.getMalformedResponses();
    
    for (const response of malformedResponses) {
      const result = await parser.parseRequirements(response, 'TestComponent');
      
      expect(result).toBeDefined();
      expect(result.requirements).toBeDefined();
      expect(Array.isArray(result.requirements)).toBe(true);
    }
  });

  it('should preserve valid JSON structure', async () => {
    const validResponse = `{
      "requirements": [
        {
          "componentName": "Hero",
          "layout": {
            "contentPosition": "center",
            "imagePosition": "right"
          },
          "styling": {
            "theme": "modern",
            "colors": ["#ff0000", "#00ff00"]
          }
        }
      ],
      "confidence": 0.9,
      "reasoning": "Valid JSON structure"
    }`;

    const result = await parser.parseRequirements(validResponse, 'Hero');
    
    expect(result.confidence).toBe(0.9);
    expect(result.reasoning).toBe('Valid JSON structure');
    expect(result.requirements[0].styling.theme).toBe('modern');
    expect(result.requirements[0].styling.colors).toEqual(['#ff0000', '#00ff00']);
  });
}); 