import { Mistral } from '@mistralai/mistralai';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface ComponentRequirement {
  componentName: string;
  layout?: {
    contentPosition: 'left' | 'right' | 'center';
    imagePosition: 'left' | 'right' | 'center';
    layoutType: 'flex' | 'grid' | 'stack';
    direction: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  };
  content?: {
    elements: string[];
    counts: Record<string, number>;
    text: Record<string, string>;
  };
  styling?: {
    theme?: string;
    colors?: string[];
    spacing?: string;
    responsive?: boolean;
  };
  interactions?: {
    animations?: string[];
    hover?: boolean;
    click?: boolean;
  };
}

interface ParsedRequirements {
  requirements: ComponentRequirement[];
  confidence: number;
  reasoning: string;
}

export class LLMRequirementsParser {
  
  /**
   * Parse user prompt to extract component requirements using LLM
   */
  static async parseComponentRequirements(
    prompt: string, 
    componentName?: string
  ): Promise<ParsedRequirements> {
    
    try {
    // INTELLIGENT, AI-DRIVEN REQUIREMENTS PARSING
    const systemPrompt = `You are an expert AI analyst specializing in understanding component requirements for web development. Your role is to INTELLIGENTLY analyze ANY user request and extract structured component requirements.

CORE INTELLIGENCE PRINCIPLES:
1. **DYNAMIC UNDERSTANDING**: Analyze component requirements without predefined rules
2. **CONTEXT AWARENESS**: Understand the business domain and component purpose
3. **INTELLIGENT EXTRACTION**: Identify ALL layout, content, styling, and interaction requirements
4. **SMART MAPPING**: Map user terminology to technical requirements intelligently
5. **SCALABLE ANALYSIS**: Work with ANY component type, ANY business domain

ANALYSIS METHODOLOGY:

**Component Type Intelligence:**
- Navigation/Menu: Logo placement, navigation links, mobile responsiveness, branding
- Hero/Banner: Headlines, CTAs, background elements, layout positioning
- About/Team: Content structure, image placement, team information, layout flow
- Services/Features: Service descriptions, pricing, feature lists, interactive elements
- Gallery/Portfolio: Image layouts, filtering, lightbox functionality, responsive grids
- Contact/Booking: Form fields, validation, contact information, booking logic
- Testimonials/Reviews: Review display, ratings, carousel functionality, social proof
- Newsletter/Signup: Email capture, promotional messaging, form validation
- Footer: Link organization, contact info, social media, legal information

**Business Domain Intelligence:**
- Fashion/Salon: Service menus, stylist profiles, booking systems, elegant styling
- Real Estate: Property listings, agent profiles, contact forms, image galleries
- Tech/SaaS: Feature highlights, pricing tables, signup forms, testimonials
- Restaurant/Food: Menu displays, reservation systems, location info, reviews
- Healthcare: Service descriptions, appointment booking, doctor profiles
- Education: Course listings, instructor profiles, enrollment forms

**Requirement Categories:**
- **Layout Requirements**: Positioning, grid systems, responsive behavior
- **Content Requirements**: Text, images, data structure, dynamic content
- **Styling Requirements**: Colors, typography, spacing, visual hierarchy
- **Interaction Requirements**: Hover effects, animations, form handling
- **Technical Requirements**: Performance, accessibility, SEO considerations

Return ONLY valid JSON in this exact format:
{
  "requirements": [
    {
      "componentName": "detected_component_name",
      "layout": {
        "type": "detected_layout_type",
        "contentPosition": "detected_position",
        "imagePosition": "detected_position",
        "responsive": true,
        "gridSystem": "detected_grid_type"
      },
      "content": {
        "elements": ["list", "of", "content", "elements"],
        "counts": {"element_type": count},
        "text": {"key": "value"}
      },
      "styling": {
        "theme": "detected_theme",
        "colors": ["color1", "color2"],
        "spacing": "detected_spacing",
        "responsive": true
      },
      "interactions": {
        "animations": ["animation1", "animation2"],
        "hover": true/false,
        "click": true/false
      }
    }
  ],
  "confidence": 0.0-1.0,
  "reasoning": "explanation_of_analysis"
}

Analyze this user request: "${prompt}"

Focus on the component: ${componentName || 'any component'}`;

      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: 2000
      });

      const responseText = response.choices[0]?.message?.content || '';
      
      // CRITICAL FIX: Handle ContentChunk[] type properly
      let responseString: string;
      if (Array.isArray(responseText)) {
        responseString = responseText.map(chunk => {
          if (typeof chunk === 'string') return chunk;
          if ('text' in chunk) return chunk.text;
          // Handle other ContentChunk types safely
          return '';
        }).join('');
      } else {
        responseString = responseText;
      }
      
      // Extract JSON from response with better error handling
      let jsonMatch = responseString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON with different patterns
        jsonMatch = responseString.match(/\{[\s\S]*"requirements"[\s\S]*\}/);
        if (!jsonMatch) {
          // Try to find any JSON-like structure
          jsonMatch = responseString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
            console.warn('[LLMRequirementsParser] No JSON found in response, creating fallback structure');
            return this.createFallbackRequirements(componentName);
          }
        }
      }

      let parsedRequirements: ParsedRequirements;
      try {
        parsedRequirements = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[LLMRequirementsParser] JSON parse error:', parseError);
        console.error('[LLMRequirementsParser] Raw response:', responseString);
        console.error('[LLMRequirementsParser] Extracted JSON:', jsonMatch[0]);
        
        // ENHANCED: Better JSON cleanup for LLM responses
        let fixedJson = jsonMatch[0];
        
        // Fix common LLM JSON issues
        fixedJson = fixedJson
          .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
          .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ':"$1"') // Quote single-quoted strings
          .replace(/:\s*([^",\{\}\[\]\s][^,\{\}\[\]]*)/g, ':"$1"') // Quote unquoted values
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

        // If JSON is still incomplete, try to extract just the requirements array
        if (!fixedJson.includes('"requirements"')) {
          const requirementsMatch = responseString.match(/"requirements"\s*:\s*\[[\s\S]*?\]/);
          if (requirementsMatch) {
            fixedJson = `{"requirements": ${requirementsMatch[0].split(':')[1].trim()}, "confidence": 0.7, "reasoning": "Extracted from incomplete response"}`;
          } else {
            // Try to find any array that might be requirements
            const arrayMatch = responseString.match(/\[\s*\{[\s\S]*?\}\s*\]/);
            if (arrayMatch) {
              fixedJson = `{"requirements": ${arrayMatch[0]}, "confidence": 0.5, "reasoning": "Extracted array as requirements"}`;
            }
          }
        }

        try {
          parsedRequirements = JSON.parse(fixedJson);
        } catch (secondError) {
          console.error('[LLMRequirementsParser] Second parse attempt failed:', secondError);
          console.error('[LLMRequirementsParser] Fixed JSON:', fixedJson);
          
          // ENHANCED: Create a more robust fallback structure
          parsedRequirements = this.createFallbackRequirements(componentName);
        }
      }

      // Validate the parsed requirements
      if (!parsedRequirements.requirements || !Array.isArray(parsedRequirements.requirements)) {
        console.warn('[LLMRequirementsParser] Invalid requirements structure, using fallback');
        return this.createFallbackRequirements(componentName);
      }

      // Ensure each requirement has the required structure
      parsedRequirements.requirements = parsedRequirements.requirements.map(req => {
        if (!req.componentName) {
          req.componentName = componentName || 'Component';
        }
        if (!req.layout) {
          req.layout = {
            contentPosition: 'center',
            imagePosition: 'center',
            layoutType: 'flex',
            direction: 'column'
          };
        }
        if (!req.content) {
          req.content = {
                elements: ['basic content'],
                counts: {},
                text: {}
          };
        }
        if (!req.styling) {
          req.styling = {
            theme: 'modern',
            colors: [],
            spacing: 'standard',
            responsive: true
          };
        }
        if (!req.interactions) {
          req.interactions = {
            animations: [],
            hover: false,
            click: false
          };
        }
        return req;
      });

      console.log('[LLMRequirementsParser] ✅ Successfully parsed requirements');
      return parsedRequirements;
    } catch (error) {
      console.error('[LLMRequirementsParser] Error parsing requirements:', error);
      return this.createFallbackRequirements(componentName);
    }
  }

  private static createFallbackRequirements(componentName?: string): ParsedRequirements {
    console.log('[LLMRequirementsParser] Creating fallback requirements structure');
    
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

  /**
   * Generate component code based on parsed requirements
   */
  static async generateComponentCode(
    requirements: ComponentRequirement,
    originalPrompt: string
  ): Promise<string> {
    
    const systemPrompt = `You are an expert Astro developer. Generate production-ready Astro components based on the provided requirements.

CRITICAL RULES:
1. Follow the layout specifications EXACTLY (content position, image position, direction)
2. Include ALL specified content elements and counts
3. Use Tailwind CSS for styling
4. Use Lucide icons from @lucide/astro
5. Use image placeholders: {{MOCKUP_IMAGE}} for hero/product images, {{AVATAR_IMAGE}} for avatars, {{VIDEO_URL}} for videos
6. Make components responsive and accessible
7. Follow Astro best practices
8. Return ONLY the component code, no explanations

LAYOUT EXAMPLES:
- If contentPosition: "right" and imagePosition: "left" → Use flex-row-reverse
- If contentPosition: "left" and imagePosition: "right" → Use flex-row
- If contentPosition: "center" → Use flex-col with text-center

Return ONLY the Astro component code.`;

    const userPrompt = `Generate an Astro component based on these requirements:

COMPONENT: ${requirements.componentName}
LAYOUT: ${JSON.stringify(requirements.layout, null, 2)}
CONTENT: ${JSON.stringify(requirements.content, null, 2)}
STYLING: ${JSON.stringify(requirements.styling, null, 2)}

ORIGINAL USER REQUEST: "${originalPrompt}"

Generate the Astro component code:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'codestral-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 3000
      });

      const generatedCode = response.choices[0]?.message?.content || '';
      
      console.log('[LLMRequirementsParser] Component code generated successfully');
      
      return (typeof generatedCode === 'string' ? generatedCode : generatedCode.join(''))
        .replace(/```(astro)?/g, '')
        .trim();

    } catch (error) {
      console.error('[LLMRequirementsParser] Error generating component code:', error);
      throw new Error('Failed to generate component code from requirements');
    }
  }

  /**
   * Validate parsed requirements
   */
  static validateRequirements(requirements: ComponentRequirement[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    requirements.forEach((req, index) => {
      // Check for required fields
      if (!req.componentName) {
        errors.push(`Requirement ${index}: Missing component name`);
      }

      // Check layout consistency
      if (req.layout) {
        if (req.layout.contentPosition && req.layout.imagePosition) {
          if (req.layout.contentPosition === req.layout.imagePosition) {
            warnings.push(`Requirement ${index}: Content and image have same position`);
          }
        }
      }

      // Check content requirements
      if (req.content) {
        if (req.content.elements.length === 0) {
          warnings.push(`Requirement ${index}: No content elements specified`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 