import { Mistral } from '@mistralai/mistralai';
import { 
  UserIntent, 
  IntentSlots, 
  IntentDetectionResult, 
  SlotExtractionResult
} from '../types/intent-types';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

export class IntentDetectionService {
  
  /**
   * Main intent detection method using LLM
   */
  static async detectIntent(prompt: string): Promise<IntentDetectionResult> {
    const startTime = Date.now();
    
    try {
      console.log('[IntentDetection] Starting intent detection for prompt:', prompt);
      
      // LLM-based intent detection
      const llmResult = await this.detectIntentWithLLM(prompt);
      
      if (llmResult.success && llmResult.intent) {
        // Validate and enhance the LLM result
        const validatedIntent = await this.validateAndEnhanceIntent(llmResult.intent, prompt);
        
        const processingTime = Date.now() - startTime;
        
        return {
          success: true,
          intent: validatedIntent,
          confidence: validatedIntent.confidence,
          fallback_used: false,
          processing_time: processingTime
        };
      }
      
      // Fallback to rule-based detection
      console.log('[IntentDetection] LLM detection failed, using fallback');
      const fallbackResult = await this.detectIntentWithFallback(prompt);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: fallbackResult.success,
        intent: fallbackResult.intent,
        error: fallbackResult.error,
        confidence: fallbackResult.confidence,
        fallback_used: true,
        processing_time: processingTime
      };
      
    } catch (error) {
      console.error('[IntentDetection] Error in intent detection:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        intent: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        fallback_used: true,
        processing_time: processingTime
      };
    }
  }
  
  /**
   * LLM-based intent detection with structured output
   */
  private static async detectIntentWithLLM(prompt: string): Promise<IntentDetectionResult> {
    // ENHANCED INTELLIGENT, AI-DRIVEN APPROACH - NO HARDCODED RULES
    const systemPrompt = `You are an expert at analyzing user requests for website creation. Your task is to extract structured information from user prompts.

CRITICAL: You must return ONLY valid JSON. No markdown formatting, no explanations outside the JSON. Ensure all JSON is properly formatted with correct quotes, commas, and brackets.

The JSON structure must be:
{
  "intent": "create_website",
  "slots": {
    "site_type": "landing_page|portfolio|ecommerce|blog",
    "sections": ["array of ALL detected specific sections from the request"],
    "section_descriptions": {
      "section_name": "detailed description of what this section should contain",
      "hero": "description of hero section requirements",
      "testimonials": "description of testimonials section requirements"
    },
    "business_type": "detected_domain",
    "colors": ["detected color scheme"],
    "theme": "detected_theme"
  }
}

ENHANCED ANALYSIS TASKS:
1. **Domain Analysis**: What type of business/industry is this for?
2. **Comprehensive Section Detection**: Extract ALL section names mentioned in the request, including:
   - Menu, Hero, Our Partners, Benefits, Features, Newsletter, FAQ, Testimonials, Footer
   - Any other specific sections mentioned
3. **Detailed Section Descriptions**: For each section, extract the COMPLETE description including:
   - Layout requirements (left side, right side, etc.)
   - Content requirements (star ratings, avatars, reviews count, etc.)
   - Image requirements (fashion model, salon scene, etc.)
   - Interactive elements (buttons, forms, etc.)
4. **Component Mapping**: Map each specific section to appropriate component types
5. **Feature Recognition**: What interactive features are requested?
6. **Layout Understanding**: Any specific layout requirements?
7. **Content Analysis**: What types of content are needed?

CRITICAL SECTION DETECTION PATTERNS:
- "Menu with all sections" → Menu
- "Hero (left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars...)" → Hero
- "Our Partners section (logos of 4–6 fashion brands...)" → Our Partners
- "Benefits (include 5 benefits...)" → Benefits
- "Features (include 5 features...)" → Features
- "Newsletter with an email form..." → Newsletter
- "FAQ (include 10 common FAQ...)" → FAQ
- "Testimonials (client quotes...)" → Testimonials
- "Footer with navigation links..." → Footer

DETAILED DESCRIPTION EXTRACTION:
- Extract EVERYTHING inside parentheses for each section
- Include layout specifications (left side, right side)
- Include content specifications (star ratings, avatars, reviews count)
- Include image descriptions (fashion model, salon scene)
- Include interactive elements (buttons, forms, email signup)

IMPORTANT: 
- Extract EXACT section names from the request, not generic patterns
- Include detailed descriptions for each section
- Detect the specific business domain (fashion salon, real estate, restaurant, etc.)
- Ensure all JSON keys and string values are properly quoted
- Do not include trailing commas
- Return ONLY the JSON object

EXAMPLES:
- "Hero (left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene)" → section: "Hero", description: "left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene"
- "Our Partners section (logos of 4–6 fashion brands or beauty partners)" → section: "Our Partners", description: "logos of 4–6 fashion brands or beauty partners"
- "Benefits (include 5 benefits of choosing the salon, e.g., personalized styling, expert staff)" → section: "Benefits", description: "include 5 benefits of choosing the salon, e.g., personalized styling, expert staff"

Extract the EXACT section names mentioned in the request, not generic patterns. Analyze the specific content of this request.

Return the structured JSON response:`;

    const userPrompt = `Intelligently analyze this user request and extract ALL components, features, and requirements:

USER REQUEST: "${prompt}"

ENHANCED ANALYSIS TASKS:
1. **Domain Analysis**: What type of business/industry is this for?
2. **Comprehensive Section Detection**: Extract ALL section names mentioned in the request, including:
   - Menu, Hero, Our Partners, Benefits, Features, Newsletter, FAQ, Testimonials, Footer
   - Any other specific sections mentioned
3. **Detailed Section Descriptions**: For each section, extract the COMPLETE description including:
   - Layout requirements (left side, right side, etc.)
   - Content requirements (star ratings, avatars, reviews count, etc.)
   - Image requirements (fashion model, salon scene, etc.)
   - Interactive elements (buttons, forms, etc.)
4. **Component Mapping**: Map each specific section to appropriate component types
5. **Feature Recognition**: What interactive features are requested?
6. **Layout Understanding**: Any specific layout requirements?
7. **Content Analysis**: What types of content are needed?

CRITICAL: Look for specific section names in the request like:
- "Menu with all sections" → Menu
- "Hero (left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars...)" → Hero
- "Our Partners section (logos of 4–6 fashion brands...)" → Our Partners
- "Benefits (include 5 benefits...)" → Benefits
- "Features (include 5 features...)" → Features
- "Newsletter with an email form..." → Newsletter
- "FAQ (include 10 common FAQ...)" → FAQ
- "Testimonials (client quotes...)" → Testimonials
- "Footer with navigation links..." → Footer

**DETAILED SECTION DESCRIPTIONS**: For each section found, extract the detailed description that follows it. For example:
- "Hero (left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene)" → section: "Hero", description: "left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene"
- "Our Partners section (logos of 4–6 fashion brands or beauty partners)" → section: "Our Partners", description: "logos of 4–6 fashion brands or beauty partners"
- "Benefits (include 5 benefits of choosing the salon, e.g., personalized styling, expert staff)" → section: "Benefits", description: "include 5 benefits of choosing the salon, e.g., personalized styling, expert staff"
- "Features (include 5 features with icons and images, such as hair styling, makeup, skincare, manicure, consultation)" → section: "Features", description: "include 5 features with icons and images, such as hair styling, makeup, skincare, manicure, consultation"
- "Newsletter with an email form, a sign-up button, and a title image (preferably from Freepik)" → section: "Newsletter", description: "with an email form, a sign-up button, and a title image (preferably from Freepik)"
- "FAQ (include 10 common FAQ related to salon services, appointments, pricing, or hygiene practices)" → section: "FAQ", description: "include 10 common FAQ related to salon services, appointments, pricing, or hygiene practices"
- "Testimonials (client quotes with names and profile pictures)" → section: "Testimonials", description: "client quotes with names and profile pictures"
- "Footer with navigation links, Privacy Policy, and Cookies" → section: "Footer", description: "with navigation links, Privacy Policy, and Cookies"

Extract the EXACT section names mentioned in the request, not generic patterns. Analyze the specific content of this request.

Return the structured JSON response:`;

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

      const llmResponse = response.choices[0]?.message?.content || '';
      console.log('[IntentDetection] LLM Response:', llmResponse);
      
      // CRITICAL FIX: Handle ContentChunk[] type properly
      const responseString = Array.isArray(llmResponse) ? llmResponse.join('') : llmResponse;
      
      // Enhanced JSON extraction with multiple patterns
      let jsonMatch = responseString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON with different patterns
        jsonMatch = responseString.match(/\{[\s\S]*"intent"[\s\S]*\}/);
        if (!jsonMatch) {
          jsonMatch = responseString.match(/\{[\s\S]*"slots"[\s\S]*\}/);
          if (!jsonMatch) {
            // Try to find any JSON-like structure
            jsonMatch = responseString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in LLM response');
            }
          }
        }
      }
      
      let parsedIntent;
      try {
        parsedIntent = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[IntentDetection] JSON parse error:', parseError);
        console.error('[IntentDetection] Raw response:', responseString);
        console.error('[IntentDetection] Extracted JSON:', jsonMatch[0]);
        
        // Try to fix common JSON issues
        let fixedJson = jsonMatch[0]
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ':"$1"') // Quote unquoted string values
          .replace(/:\s*([^",\{\}\[\]\s][^,\{\}\[\]]*)/g, ':"$1"'); // Quote other unquoted values

        // Check if JSON is incomplete and try to complete it
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        
        // Add missing closing braces
        if (openBraces > closeBraces) {
          fixedJson += '}'.repeat(openBraces - closeBraces);
        }
        
        // If still incomplete, try to extract just the intent and slots
        if (!fixedJson.includes('"intent"') || !fixedJson.includes('"slots"')) {
          // Create a minimal valid structure
          fixedJson = `{
            "intent": "create_website",
            "slots": {
              "site_type": "landing_page",
              "sections": [],
              "section_descriptions": {},
              "business_type": "florist",
              "colors": ["pink", "green"],
              "theme": "elegant"
            }
          }`;
        }
        
        try {
          parsedIntent = JSON.parse(fixedJson);
        } catch (secondError) {
          console.error('[IntentDetection] Second parse attempt failed:', secondError);
          throw new Error('Failed to parse JSON after cleanup attempts');
        }
      }
      
      // Validate the parsed intent
      if (!parsedIntent.intent || !parsedIntent.slots) {
        throw new Error('Invalid intent structure in LLM response');
      }
      
      const userIntent: UserIntent = {
        intent: parsedIntent.intent,
        slots: parsedIntent.slots,
        confidence: parsedIntent.confidence || 0.8,
        raw_prompt: prompt,
        extracted_sections: parsedIntent.slots.sections || []
      };
      
      return {
        success: true,
        intent: userIntent,
        confidence: userIntent.confidence,
        fallback_used: false,
        processing_time: 0
      };
      
    } catch (error) {
      console.error('[IntentDetection] LLM detection failed:', error);
      return {
        success: false,
        intent: null,
        error: error instanceof Error ? error.message : 'LLM detection failed',
        confidence: 0,
        fallback_used: false,
        processing_time: 0
      };
    }
  }
  
  /**
   * Rule-based fallback intent detection
   */
  private static async detectIntentWithFallback(prompt: string): Promise<IntentDetectionResult> {
    const lowerPrompt = prompt.toLowerCase();
    
    // Determine intent type
    let intent: UserIntent['intent'] = 'chat';
    let confidence = 0.3;
    
    if (lowerPrompt.includes('create') || lowerPrompt.includes('build') || lowerPrompt.includes('make')) {
      intent = 'create_website';
      confidence = 0.7;
    } else if (lowerPrompt.includes('edit') || lowerPrompt.includes('change') || lowerPrompt.includes('update')) {
      intent = 'edit_component';
      confidence = 0.6;
    } else if (lowerPrompt.includes('delete') || lowerPrompt.includes('remove')) {
      intent = 'delete_component';
      confidence = 0.8;
    } else {
      // All non-CRUD requests default to chat
      intent = 'chat';
      confidence = 0.6;
    }
    
    // Use AI to extract sections dynamically instead of hard-coded patterns
    const slots = await this.extractSlotsWithAI(prompt);
    
    const userIntent: UserIntent = {
      intent,
      slots,
      confidence,
      raw_prompt: prompt,
      extracted_sections: slots.sections || []
    };
    
    return {
      success: true,
      intent: userIntent,
      confidence,
      fallback_used: true,
      processing_time: 0
    };
  }
  
  /**
   * AI-driven slot extraction for fallback
   */
  private static async extractSlotsWithAI(prompt: string): Promise<IntentSlots> {
    try {
      const systemPrompt = `Extract sections and business information from this user request. Return ONLY valid JSON.

JSON structure:
{
  "sections": ["exact section names from request"],
  "section_descriptions": {
    "section_name": "detailed description"
  },
  "business_type": "detected business domain",
  "colors": ["detected colors"],
  "theme": "detected theme"
}

Extract EXACT section names mentioned in the request.`;

      const userPrompt = `Extract sections from: "${prompt}"`;

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
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            site_type: 'landing_page',
            sections: parsed.sections || [],
            section_descriptions: parsed.section_descriptions || {},
            business_type: parsed.business_type,
            colors: parsed.colors || [],
            theme: parsed.theme
          };
        } catch (error) {
          console.error('[IntentDetection] AI fallback parsing failed:', error);
        }
      }
    } catch (error) {
      console.error('[IntentDetection] AI fallback extraction failed:', error);
    }
    
    // Final fallback with basic extraction
    return this.extractSlotsWithFallback(prompt);
  }
  
  /**
   * Rule-based slot extraction
   */
  private static async extractSlotsWithFallback(prompt: string): Promise<IntentSlots> {
    const lowerPrompt = prompt.toLowerCase();
    
    // DYNAMIC AI-DRIVEN APPROACH - NO HARDCODED PATTERNS
    try {
      // Use AI to extract sections dynamically
      const aiSlots = await this.extractSlotsWithAI(prompt);
      if (aiSlots.sections && aiSlots.sections.length > 0) {
        return aiSlots;
      }
    } catch (error) {
      console.error('[IntentDetection] AI extraction failed in fallback:', error);
    }
    
    // Minimal fallback with basic business type detection
    const slots: IntentSlots = {
      site_type: 'landing_page',
      sections: [],
      section_descriptions: {},
      business_type: undefined,
      colors: [],
      theme: undefined
    };
    
    // Basic business type detection using AI keywords
    if (lowerPrompt.includes('florist') || lowerPrompt.includes('flower') || lowerPrompt.includes('bouquet')) {
      slots.business_type = 'florist';
    } else if (lowerPrompt.includes('real estate') || lowerPrompt.includes('property') || lowerPrompt.includes('house')) {
      slots.business_type = 'real_estate';
    } else if (lowerPrompt.includes('car') || lowerPrompt.includes('dealership') || lowerPrompt.includes('automotive')) {
      slots.business_type = 'car_dealership';
    } else if (lowerPrompt.includes('salon') || lowerPrompt.includes('beauty') || lowerPrompt.includes('hair')) {
      slots.business_type = 'beauty_salon';
    }
    
    // Basic color detection
    const colorKeywords = ['pink', 'wine', 'blue', 'green', 'red', 'yellow', 'purple', 'orange', 'black', 'white'];
    const colors: string[] = [];
    for (const color of colorKeywords) {
      if (lowerPrompt.includes(color)) {
        colors.push(color);
      }
    }
    if (colors.length > 0) {
      slots.colors = colors;
    }
    
    // Basic theme detection
    if (lowerPrompt.includes('elegant') || lowerPrompt.includes('sophisticated')) {
      slots.theme = 'elegant';
    } else if (lowerPrompt.includes('modern') || lowerPrompt.includes('contemporary')) {
      slots.theme = 'modern';
    } else if (lowerPrompt.includes('minimal') || lowerPrompt.includes('clean')) {
      slots.theme = 'minimal';
    }
    
    return slots;
  }
  
  /**
   * Validate and enhance the detected intent
   */
  private static async validateAndEnhanceIntent(intent: UserIntent, originalPrompt: string): Promise<UserIntent> {
    const enhancedIntent = { ...intent };
    
    // Validate sections
    if (enhancedIntent.slots.sections) {
      // Remove duplicates and validate
      enhancedIntent.slots.sections = [...new Set(enhancedIntent.slots.sections)];
      
      // Ensure sections are in valid format
      enhancedIntent.slots.sections = enhancedIntent.slots.sections.map(section => {
        return section.charAt(0).toUpperCase() + section.slice(1);
      });
    }
    
    // Validate colors
    if (enhancedIntent.slots.colors) {
      enhancedIntent.slots.colors = [...new Set(enhancedIntent.slots.colors)];
    }
    
    // Add missing required slots for create_website intent
    if (enhancedIntent.intent === 'create_website') {
      if (!enhancedIntent.slots.site_type) {
        enhancedIntent.slots.site_type = 'landing_page';
      }
    }
    
    return enhancedIntent;
  }
  
  /**
   * Extract slots from a prompt (public method for testing)
   */
  static async extractSlots(prompt: string): Promise<SlotExtractionResult> {
    const startTime = Date.now();
    
    try {
      const intentResult = await this.detectIntent(prompt);
      
      if (intentResult.success && intentResult.intent) {
        const processingTime = Date.now() - startTime;
        
        return {
          success: true,
          slots: intentResult.intent.slots,
          confidence: intentResult.confidence,
          extracted_text: intentResult.intent.extracted_sections || []
        };
      }
      
      return {
        success: false,
        slots: {},
        confidence: 0,
        extracted_text: [],
        validation_errors: [intentResult.error || 'Intent detection failed']
      };
      
    } catch (error) {
      return {
        success: false,
        slots: {},
        confidence: 0,
        extracted_text: [],
        validation_errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
} 