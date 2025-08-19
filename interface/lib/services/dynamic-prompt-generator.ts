import { promises as fs } from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface BusinessContext {
  businessType: string;
  industry: string;
  targetAudience: string;
  brandVoice: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    fontFamily: string;
    fontWeights: string[];
    style: string; // modern, classic, elegant, bold, etc.
  };
  navigation: string[];
  content: {
    hero: string;
    cta: string;
    services: string[];
    tone: string; // professional, friendly, luxurious, etc.
  };
  functionality: string[];
  designNotes: string[];
}

interface ComponentRequirements {
  componentName: string;
  purpose: string;
  content: string[];
  functionality: string[];
  styling: {
    layout: string;
    colors: string[];
    typography: string;
    spacing: string;
  };
  interactions: string[];
  accessibility: string[];
}

export class DynamicPromptGenerator {
  private astroInstructions: string = '';
  // Declare helper to satisfy type checking; implemented via prototype below for minimal diff
  private filterDesignNotesForComponent!: (componentName: string, designNotes: string[] | string) => Promise<string[]>;
  private extractInterRowVideoHint!: (componentName: string, userPrompt: string) => Promise<string | null>;

  constructor() {
    this.loadAstroInstructions();
  }

  private async loadAstroInstructions(): Promise<void> {
    try {
      const instructionsPath = path.join(process.cwd(), 'lib', 'context', 'astro-instructions.context');
      this.astroInstructions = await fs.readFile(instructionsPath, 'utf-8');
    } catch (error) {
      console.warn('[DynamicPromptGenerator] Could not load Astro instructions, using fallback');
      this.astroInstructions = '# ASTRO COMPONENT GENERATION BEST PRACTICES\n\n## CORE PRINCIPLES\n- Use frontmatter (---) for JavaScript logic\n- Use JSX-like syntax for HTML structure\n- Access props via Astro.props\n- Use TypeScript interfaces for type safety';
    }
  }

  /**
   * LLM-Driven Business Context Analysis
   */
  private async analyzeBusinessContext(userPrompt: string): Promise<BusinessContext> {
    console.log('🌸 [DynamicPromptGenerator] Starting business context analysis...');
    console.log('🌸 [DynamicPromptGenerator] User prompt preview:', userPrompt?.slice(0, 100) + '...');
    
    const businessContextPrompt = `Analyze this user request and extract comprehensive business context:

USER REQUEST:
"${userPrompt}"

Extract and return a JSON object with:
- businessType: The specific business type (e.g., "fashion salon", "tech startup", "restaurant")
- industry: The broader industry category
- targetAudience: Who the business serves
- brandVoice: The tone and personality (professional, friendly, luxurious, etc.)
- colorScheme: Suggest appropriate colors based on business type and design notes
- typography: Suggest fonts and weights based on business type
- navigation: Extract or suggest navigation items from the request
- content: Extract hero text, CTA buttons, services mentioned
- functionality: Any interactive features mentioned
- designNotes: Any specific design requirements mentioned

Return ONLY valid JSON, no explanations.`;

    try {
      console.log('🌸 [DynamicPromptGenerator] Calling LLM for business context analysis...');
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst specializing in extracting detailed business context from user requests. Return only valid JSON.'
          },
          {
            role: 'user',
            content: businessContextPrompt
          }
        ],
        temperature: 0.3,
      });

      const responseContent = response.choices?.[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      console.log('🌸 [DynamicPromptGenerator] LLM response received, length:', responseText.length);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('🌸 [DynamicPromptGenerator] JSON extracted from LLM response');
        const parsed = JSON.parse(jsonMatch[0]) as BusinessContext;
        console.log('🌸 [DynamicPromptGenerator] Business context parsed successfully:', {
          businessType: parsed.businessType,
          industry: parsed.industry,
          targetAudience: parsed.targetAudience
        });
        return parsed;
      }
      
      console.log('🌸 [DynamicPromptGenerator] No JSON found in LLM response, using fallback');
      throw new Error('Failed to parse business context JSON');
    } catch (error) {
      console.warn('🌸 [DynamicPromptGenerator] Business context analysis failed, using fallback:', error);
      return await this.getFallbackBusinessContext(userPrompt);
    }
  }

  /**
   * LLM-Driven Component Requirements Analysis
   */
  private async analyzeComponentRequirements(componentName: string, userPrompt: string, businessContext: BusinessContext): Promise<ComponentRequirements> {
    console.log('🌸 [DynamicPromptGenerator] Starting component requirements analysis...');
    console.log('🌸 [DynamicPromptGenerator] Component name:', componentName);
    console.log('🌸 [DynamicPromptGenerator] Business context type:', businessContext.businessType);
    
    const componentRequirementsPrompt = `Analyze this component request and extract detailed requirements:

COMPONENT: ${componentName}
BUSINESS CONTEXT: ${JSON.stringify(businessContext, null, 2)}
USER REQUEST: "${userPrompt}"

Extract and return a JSON object with:
- componentName: The component name
- purpose: What this component should accomplish
- content: What content should be included
- functionality: Any interactive features needed
- styling: Layout, colors, typography, spacing requirements
- interactions: User interactions and behaviors
- accessibility: Accessibility requirements

Return ONLY valid JSON, no explanations.`;

    try {
      console.log('🌸 [DynamicPromptGenerator] Calling LLM for component requirements analysis...');
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          {
            role: 'system',
            content: 'You are a UI/UX analyst specializing in component requirements. Return only valid JSON.'
          },
          {
            role: 'user',
            content: componentRequirementsPrompt
          }
        ],
        temperature: 0.3,
      });

      const responseContent = response.choices?.[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      console.log('🌸 [DynamicPromptGenerator] LLM response received for component requirements, length:', responseText.length);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('🌸 [DynamicPromptGenerator] JSON extracted from component requirements response');
        const parsed = JSON.parse(jsonMatch[0]) as ComponentRequirements;
        console.log('🌸 [DynamicPromptGenerator] Component requirements parsed successfully:', {
          purpose: parsed.purpose,
          contentCount: parsed.content?.length || 0,
          functionalityCount: parsed.functionality?.length || 0
        });
        return parsed;
      }
      
      console.log('🌸 [DynamicPromptGenerator] No JSON found in component requirements response, using fallback');
      throw new Error('Failed to parse component requirements JSON');
    } catch (error) {
      console.warn('🌸 [DynamicPromptGenerator] Component requirements analysis failed, using fallback:', error);
      return await this.getFallbackComponentRequirements(componentName, businessContext);
    }
  }

  /**
   * Generate Dynamic System Prompt
   */
  public async generateSystemPrompt(componentName: string, userPrompt: string): Promise<string> {
    console.log('🌸 [DynamicPromptGenerator] Starting generateSystemPrompt...');
    console.log('🌸 [DynamicPromptGenerator] Component:', componentName);
    console.log('🌸 [DynamicPromptGenerator] User prompt length:', userPrompt?.length || 0);
    
    console.log('🌸 [DynamicPromptGenerator] Analyzing business context...');
    const businessContext = await this.analyzeBusinessContext(userPrompt);
    console.log('🌸 [DynamicPromptGenerator] Business context extracted:', {
      businessType: businessContext.businessType,
      industry: businessContext.industry,
      targetAudience: businessContext.targetAudience
    });
    
    console.log('🌸 [DynamicPromptGenerator] Analyzing component requirements...');
    const componentRequirements = await this.analyzeComponentRequirements(componentName, userPrompt, businessContext);
    console.log('🌸 [DynamicPromptGenerator] Component requirements extracted:', {
      purpose: componentRequirements.purpose,
      contentCount: componentRequirements.content?.length || 0,
      functionalityCount: componentRequirements.functionality?.length || 0
    });
    
    console.log('🌸 [DynamicPromptGenerator] Generating dynamic system prompt...');
    const systemPrompt = this.buildSystemPrompt(businessContext, componentRequirements);
    console.log('🌸 [DynamicPromptGenerator] System prompt generated, length:', systemPrompt.length);
    
    return systemPrompt;
  }

  /**
   * Build system prompt with global standards + dynamic context
   */
  private buildSystemPrompt(businessContext: BusinessContext, componentRequirements: any): string {
    const globalStandards = this.getGlobalStandards();
    const dynamicContext = this.getDynamicContextInstructions(businessContext, componentRequirements);
    const componentSpecificInstructions = this.getComponentSpecificInstructions(componentRequirements);
    
    return `${globalStandards}

${dynamicContext}

${componentSpecificInstructions}

## BUSINESS CONTEXT (DYNAMIC)
- Business Type: ${businessContext.businessType || 'general'}
- Industry: ${businessContext.industry || 'general'}
- Target Audience: ${businessContext.targetAudience || 'general users'}
- Brand Colors: ${businessContext.colorScheme?.primary || 'default'}
- Navigation: ${Array.isArray(businessContext.navigation) ? businessContext.navigation.join(', ') : 'standard'}

## GENERATION PRIORITY
1. GLOBAL STANDARDS (non-negotiable Astro principles)
2. BUSINESS CONTEXT (user-specific requirements)
3. COMPONENT-SPECIFIC (dynamic functionality)
4. TECHNICAL IMPLEMENTATION (safety and performance)

Remember: Global standards override all other considerations, then apply dynamic context.`;
  }

  /**
   * Get global Astro standards from astro-instructions.context
   */
  private getGlobalStandards(): string {
    return `
## 🚨 CRITICAL ASTRO STANDARDS (NON-NEGOTIABLE)

### ❌ ABSOLUTELY FORBIDDEN
- NEVER create duplicate Lucide imports - Only ONE import statement per component
- NEVER use malformed URLs - Always use single quotes: "https://..." NOT ""https://...""
- NEVER repeat the same image URL - Each image should be unique
- NEVER hardcode avatar paths - Use {{AVATAR_IMAGE}} placeholder
- NEVER hardcode Unsplash URLs - Use {{MOCKUP_IMAGE}} placeholder
- NEVER use React syntax (className, key props, hooks)
- NEVER use template literals (use {variable} not \${variable})
- NEVER use static icon mappings - Framework handles all Lucide icons dynamically
- NEVER use JSX in helper functions - Astro helper functions must return data, not JSX

### ✅ ABSOLUTELY REQUIRED
- ALWAYS use {{MOCKUP_IMAGE}} for dynamic images
- ALWAYS use {{AVATAR_IMAGE}} for dynamic avatars
- ALWAYS consolidate Lucide imports into ONE statement
- ALWAYS use proper TypeScript interfaces
- ALWAYS provide default values for props
- ALWAYS use Astro syntax (class, not className)
- ALWAYS use any Lucide icon dynamically - Framework auto-detects and imports
- ALWAYS use helper functions that return data objects - Not JSX elements

### 🔧 CRITICAL ASTRO JSX RULES
- NEVER use JSX in helper functions - Causes "Expected '>' but found 'class'" errors
- Helper functions should return data objects - Let templates handle JSX rendering
- Use .map() in templates - Not in helper functions
- Keep JSX only in template sections - Not in frontmatter

### 📋 VALIDATION CHECKLIST
- [ ] Single Lucide import statement (auto-generated)
- [ ] Uses {{MOCKUP_IMAGE}} placeholders for images
- [ ] Uses {{AVATAR_IMAGE}} placeholders for avatars
- [ ] No malformed URLs with double quotes
- [ ] No duplicate image URLs in galleries
- [ ] Proper TypeScript interfaces
- [ ] Default values for all props
- [ ] Multiple contextually relevant icons (any Lucide icon)
- [ ] Responsive design with Tailwind
- [ ] Semantic HTML structure
- [ ] Accessibility attributes
- [ ] Safe DOM element access
- [ ] No lint errors
- [ ] Helper functions return data objects (not JSX)
- [ ] JSX only in template sections

### ✅ CORRECT HELPER FUNCTION PATTERN
\`\`\`astro
// ✅ CORRECT: Helper functions return data objects
const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const isFilled = i < rating;
    stars.push({
      filled: isFilled,
      index: i
    });
  }
  return stars;
};
---

<!-- ✅ CORRECT: JSX only in template sections -->
<section>
  {renderStars(rating).map(star => (
    <Star class={\`w-5 h-5 \${star.filled ? 'text-yellow-400 fill-current' : 'text-gray-300'}\`} />
  ))}
</section>
\`\`\`

### ❌ WRONG HELPER FUNCTION PATTERN
\`\`\`astro
// ❌ WRONG: JSX in helper functions (causes syntax errors)
const renderStars = (rating: number) => {
  return [<Star />, <Star />]; // WRONG! Causes "Expected '>' but found 'class'"
};
\`\`\`
`;
  }

  /**
   * Get dynamic context instructions based on business context
   */
  private getDynamicContextInstructions(businessContext: BusinessContext, componentRequirements: any): string {
    return `## DYNAMIC CONTEXT INSTRUCTIONS (USER-SPECIFIC)

### 🎯 BUSINESS CONTEXT INTEGRATION
- Apply business-specific colors: ${businessContext.colorScheme?.primary || 'default'} and ${businessContext.colorScheme?.secondary || 'default'}
- Use industry-appropriate content for: ${businessContext.industry || 'general'} industry
- Match target audience: ${businessContext.targetAudience || 'general users'}
- Follow brand voice: ${businessContext.brandVoice || 'professional'}

### 🎨 COMPONENT-SPECIFIC DESIGN
- Adapt layout to component purpose: ${componentRequirements?.purpose || 'general component'}
- Include relevant functionality: ${Array.isArray(componentRequirements?.functionality) ? componentRequirements.functionality.join(', ') : componentRequirements?.functionality || 'standard'}
- Use appropriate interactions: ${Array.isArray(componentRequirements?.interactions) ? componentRequirements.interactions.join(', ') : componentRequirements?.interactions || 'standard'}
- Ensure accessibility matches component usage

### 🔧 DYNAMIC TECHNICAL REQUIREMENTS
- Generate component-specific TypeScript interfaces
- Create appropriate default values based on context
- Include relevant Lucide icons for component purpose
- Apply responsive design patterns for component type

### 📋 CONTEXT-AWARE VALIDATION
- Verify business context integration
- Check component-specific requirements
- Ensure dynamic content matches user request
- Validate technical implementation for component type`;
  }

  /**
   * Get component-specific instructions
   */
  private getComponentSpecificInstructions(componentRequirements: any): string {
    return `## COMPONENT-SPECIFIC REQUIREMENTS:
- Purpose: ${componentRequirements?.purpose || 'general component'}
- Content: ${Array.isArray(componentRequirements?.content) ? componentRequirements.content.join(', ') : componentRequirements?.content || 'standard content'}
- Functionality: ${Array.isArray(componentRequirements?.functionality) ? componentRequirements.functionality.join(', ') : componentRequirements?.functionality || 'standard functionality'}
- Layout: ${componentRequirements?.styling?.layout || 'standard layout'}
- Interactions: ${Array.isArray(componentRequirements?.interactions) ? componentRequirements.interactions.join(', ') : componentRequirements.interactions}
- Accessibility: ${Array.isArray(componentRequirements?.accessibility) ? componentRequirements.accessibility.join(', ') : componentRequirements.accessibility}`;
  }

  /**
   * Generate Dynamic User Prompt
   */
  public async generateUserPrompt(componentName: string, userPrompt: string, extractedRequirements: string): Promise<string> {
    console.log('🌸 [DynamicPromptGenerator] Starting generateUserPrompt...');
    console.log('🌸 [DynamicPromptGenerator] Component:', componentName);
    console.log('🌸 [DynamicPromptGenerator] User prompt length:', userPrompt?.length || 0);
    console.log('🌸 [DynamicPromptGenerator] Extracted requirements length:', extractedRequirements?.length || 0);
    
    console.log('🌸 [DynamicPromptGenerator] Analyzing business context for user prompt...');
    const businessContext = await this.analyzeBusinessContext(userPrompt);
    console.log('🌸 [DynamicPromptGenerator] Business context for user prompt:', {
      businessType: businessContext.businessType,
      industry: businessContext.industry,
      brandVoice: businessContext.brandVoice
    });
    
    console.log('🌸 [DynamicPromptGenerator] Analyzing component requirements for user prompt...');
    const componentRequirements = await this.analyzeComponentRequirements(componentName, userPrompt, businessContext);
    console.log('🌸 [DynamicPromptGenerator] Component requirements for user prompt:', {
      purpose: componentRequirements.purpose,
      contentCount: componentRequirements.content?.length || 0,
      functionalityCount: componentRequirements.functionality?.length || 0
    });
    
    console.log('🌸 [DynamicPromptGenerator] Filtering design notes for component...');
    const filteredDesignNotes = await this.filterDesignNotesForComponent(componentName, businessContext.designNotes);
    console.log('🌸 [DynamicPromptGenerator] Filtered design notes count:', filteredDesignNotes.length);
    
    console.log('🌸 [DynamicPromptGenerator] Generating component checklist...');
    // Get component-specific checklist - 100% dynamic from user request
    const completenessChecklist = await this.generateComponentChecklist(componentName, userPrompt);
    console.log('🌸 [DynamicPromptGenerator] Completeness checklist generated, items:', completenessChecklist.length);
    
    console.log('🌸 [DynamicPromptGenerator] Extracting inter-row video hint...');
    const interRowVideoHint = await this.extractInterRowVideoHint(componentName, userPrompt);
    console.log('🌸 [DynamicPromptGenerator] Video hint extracted:', interRowVideoHint ? 'Yes' : 'No');
    
    // CRITICAL FIX: Add strong instructions to prevent "undefined" generation
    const imagePlaceholderInstructions = `
**CRITICAL IMAGE HANDLING INSTRUCTIONS:**
❌ ABSOLUTELY FORBIDDEN: Do NOT use "undefined", ""undefined"", or any variation of undefined for image properties
✅ REQUIRED: For all image properties (image, src, avatar, etc.), use these placeholders:
- For product images: "{{PRODUCT_IMAGE}}"
- For avatar images: "{{AVATAR_IMAGE}}"
- For hero/background images: "{{HERO_IMAGE}}"
- For gallery images: "{{GALLERY_IMAGE}}"
- For testimonial images: "{{TESTIMONIAL_IMAGE}}"
- For video sources: "{{VIDEO_URL}}"

The framework will automatically replace these placeholders with dynamic images and videos from Unsplash and Pexels.
Using "undefined" will break the build and cause errors.
`;
    
    const scopeControl = `
**STRICT SCOPE CONTROL:**
- Generate ONLY the ${componentName} component.
- Do NOT include other sections or patterns that are not explicitly requested in the "CONTENT REQUIREMENTS" above.
- Testimonials, galleries, or widgets MUST be included ONLY if present in the extracted requirements for ${componentName}.
- The output must be atomic and self-contained for ${componentName} only.`;

    console.log('🌸 [DynamicPromptGenerator] Building final user prompt...');
    const finalPrompt = `Generate a single ${componentName} component for a ${businessContext.businessType} landing page with the following specific requirements:

${extractedRequirements}

**COMPONENT DETAILS:**
- Component: ${componentName}
- Purpose: ${componentRequirements.purpose}
- Business Type: ${businessContext.businessType}
- Industry: ${businessContext.industry}
- Brand Voice: ${businessContext.brandVoice}

**DESIGN SPECIFICATIONS:**
- Primary Color: ${businessContext.colorScheme.primary}
- Secondary Color: ${businessContext.colorScheme.secondary}
- Typography: ${businessContext.typography.fontFamily} (${businessContext.typography.style})
- Layout: ${componentRequirements.styling.layout}
- Interactions: ${Array.isArray(componentRequirements.interactions) ? componentRequirements.interactions.join(', ') : componentRequirements.interactions}

**CONTENT REQUIREMENTS:**
- Content: ${Array.isArray(componentRequirements.content) ? componentRequirements.content.join(', ') : componentRequirements.content}
- Functionality: ${Array.isArray(componentRequirements.functionality) ? componentRequirements.functionality.join(', ') : componentRequirements.functionality}
- Accessibility: ${Array.isArray(componentRequirements.accessibility) ? componentRequirements.accessibility.join(', ') : componentRequirements.accessibility}

**DESIGN NOTES:**
${Array.isArray(filteredDesignNotes) && filteredDesignNotes.length
  ? filteredDesignNotes.map(note => `- ${note}`).join('\n')
  : '- Follow modern design principles for this component'
}

${imagePlaceholderInstructions}

${completenessChecklist.length ? `**STRICT CHECKLIST (MUST COMPLETE - EXTRACTED FROM USER REQUEST):**\n${completenessChecklist.map(i => `- ${i}`).join('\n')}` : ''}

${interRowVideoHint ? `\n**MEDIA INSERTION RULE:**\n- ${interRowVideoHint}` : ''}

The component should be atomic (contain only one section) and follow Astro + Tailwind CSS best practices. Include proper TypeScript types and ensure the component is self-contained.

${scopeControl}

IMPORTANT: Use the specific requirements above to create content that matches the user's request exactly. Apply the ${businessContext.businessType} theme consistently throughout the component.`;

    console.log('🌸 [DynamicPromptGenerator] User prompt generated successfully, length:', finalPrompt.length);
    return finalPrompt;
  }

  /**
   * Fallback Methods for Error Handling
   */
  private async getFallbackBusinessContext(userPrompt: string): Promise<BusinessContext> {
    // Use LLM to analyze the user prompt dynamically
    const fallbackBusinessContextPrompt = `Analyze this user request and extract business context dynamically:

USER REQUEST:
"${userPrompt}"

Extract and return a JSON object with:
- businessType: The specific business type mentioned in the request
- industry: The industry category
- targetAudience: Who the business serves
- brandVoice: The tone and personality
- colorScheme: Extract colors mentioned in the request (e.g., "blush pink and deep mauve")
- typography: Extract font requirements (e.g., "elegant serif fonts")
- navigation: Extract navigation items from the request
- content: Extract hero text, CTA buttons, services mentioned
- functionality: Any interactive features mentioned
- designNotes: Any specific design requirements mentioned

IMPORTANT: Extract EXACTLY what the user requested. If they mention "blush pink and deep mauve", use those colors. If they mention "elegant serif fonts", use that typography.

Return ONLY valid JSON, no explanations.`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst. Extract EXACTLY what the user requested. Return only valid JSON.'
          },
          {
            role: 'user',
            content: fallbackBusinessContextPrompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const responseContent = response.choices[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as BusinessContext;
      }
      
      throw new Error('Failed to parse fallback business context JSON');
    } catch (error) {
      console.error('[DynamicPromptGenerator] Fallback business context analysis failed:', error);
      // Only use minimal fallback for critical errors
      return {
        businessType: 'business',
        industry: 'general',
        targetAudience: 'customers',
        brandVoice: 'professional',
        colorScheme: {
          primary: '#3B82F6',
          secondary: '#1F2937',
          accent: '#EF4444',
          background: '#FFFFFF'
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontWeights: ['400', '500', '600'],
          style: 'modern'
        },
        navigation: ['Home', 'Services', 'About', 'Contact'],
        content: {
          hero: 'Welcome',
          cta: 'Get Started',
          services: ['Services'],
          tone: 'professional'
        },
        functionality: [],
        designNotes: []
      };
    }
  }

  private async getFallbackComponentRequirements(componentName: string, businessContext: BusinessContext): Promise<ComponentRequirements> {
    // Use LLM to analyze component requirements dynamically
    const fallbackComponentRequirementsPrompt = `Analyze this component request and extract requirements dynamically:

COMPONENT: ${componentName}
BUSINESS CONTEXT: ${JSON.stringify(businessContext, null, 2)}

Extract and return a JSON object with:
- componentName: The component name
- purpose: What this component should accomplish based on the business context
- content: What content should be included for this specific component
- functionality: Any interactive features needed for this component
- styling: Layout, colors, typography, spacing requirements
- interactions: User interactions and behaviors for this component
- accessibility: Accessibility requirements for this component

IMPORTANT: Extract EXACTLY what the user requested for this specific component. If they mention specific features, include them.

Return ONLY valid JSON, no explanations.`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          {
            role: 'system',
            content: 'You are a UI/UX analyst. Extract EXACTLY what the user requested for this component. Return only valid JSON.'
        },
          {
            role: 'user',
            content: fallbackComponentRequirementsPrompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent extraction
      });

      const responseContent = response.choices[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ComponentRequirements;
      }
      
      throw new Error('Failed to parse fallback component requirements JSON');
    } catch (error) {
      console.error('[DynamicPromptGenerator] Fallback component requirements analysis failed:', error);
      // Only use minimal fallback for critical errors
      return {
        componentName,
        purpose: `Create a ${componentName.toLowerCase()} section for ${businessContext.businessType}`,
        content: ['Content'],
        functionality: [],
        styling: {
          layout: 'responsive',
          colors: [businessContext.colorScheme.primary, businessContext.colorScheme.secondary],
          typography: businessContext.typography.fontFamily,
          spacing: 'standard'
        },
        interactions: [],
        accessibility: ['semantic HTML', 'ARIA labels']
      };
    }
  }

  /**
   * Enhanced Component Checklist Generation - 100% Dynamic from User Request
   */
  private async generateDetailedComponentChecklist(
    componentName: string, 
    userPrompt: string
  ): Promise<{
    layout: string;
    content: string[];
    structure: string;
    features: string[];
    validation: string[];
  }> {
    console.log('🌸 [DynamicPromptGenerator] Starting detailed component checklist generation...');
    console.log('🌸 [DynamicPromptGenerator] Component:', componentName);
    console.log('🌸 [DynamicPromptGenerator] User prompt preview:', userPrompt?.slice(0, 100) + '...');
    
    try {
      const detailedChecklistPrompt = `Analyze this user request and create a detailed checklist for ${componentName}:

USER REQUEST: "${userPrompt}"

Extract and return a JSON object with:
{
  "layout": "specific layout requirements extracted from user request",
  "content": ["all content elements that must be included, extracted from user request"],
  "structure": "how content should be organized based on user request",
  "features": ["all interactive features required based on user request"],
  "validation": ["checklist items to verify completion based on user request"]
}

IMPORTANT: 
- Extract ONLY what the user specifically requested
- Do NOT add generic or example content
- If user wants "split layout", specify the exact split requirements
- If user wants specific content types, extract those exact types
- If user wants specific counts (like "4-5 testimonials"), extract that exact requirement
- Return ONLY valid JSON, no explanations

Focus on EXACTLY what the user requested.`;

      console.log('🌸 [DynamicPromptGenerator] Calling LLM for detailed checklist generation...');
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          { 
            role: 'system', 
            content: 'You are a precise requirements analyzer. Extract EXACTLY what the user requested. Return only valid JSON with no explanations or generic content.' 
          },
          { role: 'user', content: detailedChecklistPrompt }
        ],
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
      console.log('🌸 [DynamicPromptGenerator] LLM response received for detailed checklist, length:', text.length);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('🌸 [DynamicPromptGenerator] JSON extracted from detailed checklist response');
        const parsed = JSON.parse(jsonMatch[0]);
        const result = {
          layout: parsed.layout || 'standard layout',
          content: Array.isArray(parsed.content) ? parsed.content : [],
          structure: parsed.structure || 'standard structure',
          features: Array.isArray(parsed.features) ? parsed.features : [],
          validation: Array.isArray(parsed.validation) ? parsed.validation : []
        };
        console.log('🌸 [DynamicPromptGenerator] Detailed checklist parsed successfully:', {
          layout: result.layout,
          contentCount: result.content.length,
          structure: result.structure,
          featuresCount: result.features.length,
          validationCount: result.validation.length
        });
        return result;
      }
      
      console.log('🌸 [DynamicPromptGenerator] No JSON found in detailed checklist response, using fallback');
    } catch (error) {
      console.warn('🌸 [DynamicPromptGenerator] Detailed checklist generation failed:', error);
    }

    console.log('🌸 [DynamicPromptGenerator] Using fallback checklist generation...');
    // Fallback: extract basic requirements dynamically
    const fallbackResult = {
      layout: 'standard layout',
      content: await this.extractContentElements(userPrompt),
      structure: 'standard structure',
      features: await this.extractFeatures(userPrompt),
      validation: await this.extractValidationRules(userPrompt)
    };
    
    console.log('🌸 [DynamicPromptGenerator] Fallback checklist generated:', {
      layout: fallbackResult.layout,
      contentCount: fallbackResult.content.length,
      structure: fallbackResult.structure,
      featuresCount: fallbackResult.features.length,
      validationCount: fallbackResult.validation.length
    });
    
    return fallbackResult;
  }

  /**
   * Dynamic Content Element Extraction - 100% from User Request
   */
  private async extractContentElements(userPrompt: string): Promise<string[]> {
    try {
      const contentElementsPrompt = `From this user request, extract ONLY the specific content elements requested:

"${userPrompt}"

Return a JSON array of strings with ONLY the content elements the user specifically mentioned. Do NOT add examples or generic content.

Example format: ["element1", "element2", "element3"]

Extract EXACTLY what they want, nothing more, nothing less.`;

      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          { role: 'system', content: 'Extract content elements from user request. Return only JSON array.' },
          { role: 'user', content: contentElementsPrompt }
        ],
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('[DynamicPromptGenerator] Content extraction failed:', error);
    }
    
    return [];
  }

  /**
   * Dynamic Feature Extraction - 100% from User Request
   */
  private async extractFeatures(userPrompt: string): Promise<string[]> {
    try {
      const featuresPrompt = `From this user request, extract ONLY the specific interactive features requested:

"${userPrompt}"

Return a JSON array of strings with ONLY the features the user specifically mentioned. Do NOT add examples or generic features.

Example format: ["feature1", "feature2", "feature3"]

Extract EXACTLY what they want, nothing more, nothing less.`;

      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          { role: 'system', content: 'Extract features from user request. Return only JSON array.' },
          { role: 'user', content: featuresPrompt }
        ],
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('[DynamicPromptGenerator] Feature extraction failed:', error);
    }
    
    return [];
  }

  /**
   * Dynamic Validation Rules Extraction - 100% from User Request
   */
  private async extractValidationRules(userPrompt: string): Promise<string[]> {
    try {
      const validationRulesPrompt = `From this user request, extract ONLY the specific validation rules needed:

"${userPrompt}"

Return a JSON array of strings with ONLY the validation rules the user specifically mentioned. Do NOT add examples or generic rules.

Example format: ["rule1", "rule2", "rule3"]

Extract EXACTLY what they want, nothing more, nothing less.`;

      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          { role: 'system', content: 'Extract validation rules from user request. Return only JSON array.' },
          { role: 'user', content: validationRulesPrompt }
        ],
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('[DynamicPromptGenerator] Validation rules extraction failed:', error);
    }
    
    return [];
  }

  /**
   * Dynamic Layout Analysis - 100% from User Request
   */
  private async analyzeLayoutRequirements(userPrompt: string): Promise<string> {
    console.log('🌸 [DynamicPromptGenerator] Starting layout requirements analysis...');
    console.log('🌸 [DynamicPromptGenerator] User prompt preview:', userPrompt?.slice(0, 100) + '...');
    
    try {
      const layoutAnalysisPrompt = `Analyze this user request and determine the layout requirements:

"${userPrompt}"

Return a JSON object with:
{
  "layoutType": "the specific layout type requested (split, grid, carousel, single, etc.)",
  "columns": "number of columns or sections needed",
  "leftContent": "what should go in left column/section (if applicable)",
  "rightContent": "what should go in right column/section (if applicable)",
  "bottomContent": "what should go at bottom (if applicable)",
  "responsive": "responsive behavior requirements"
}

Extract ONLY what the user specifically requested. Do NOT add generic layout examples.`;

      console.log('🌸 [DynamicPromptGenerator] Calling LLM for layout analysis...');
      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          { role: 'system', content: 'Analyze layout requirements from user request. Return only JSON.' },
          { role: 'user', content: layoutAnalysisPrompt }
        ],
        temperature: 0.1,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
      console.log('🌸 [DynamicPromptGenerator] LLM response received for layout analysis, length:', text.length);
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        console.log('🌸 [DynamicPromptGenerator] JSON extracted from layout analysis response');
        const parsed = JSON.parse(jsonMatch[0]);
        const formattedInstructions = this.formatLayoutInstructions(parsed);
        console.log('🌸 [DynamicPromptGenerator] Layout instructions formatted successfully');
        return formattedInstructions;
      }
      
      console.log('🌸 [DynamicPromptGenerator] No JSON found in layout analysis response, using standard layout');
    } catch (error) {
      console.warn('🌸 [DynamicPromptGenerator] Layout analysis failed:', error);
    }
    
    console.log('🌸 [DynamicPromptGenerator] Returning standard layout');
    return 'standard layout';
  }

  /**
   * Format Layout Instructions Dynamically
   */
  private formatLayoutInstructions(layoutData: any): string {
    console.log('🌸 [DynamicPromptGenerator] Formatting layout instructions...');
    console.log('🌸 [DynamicPromptGenerator] Layout data received:', {
      layoutType: layoutData.layoutType,
      columns: layoutData.columns,
      hasLeftContent: !!layoutData.leftContent,
      hasRightContent: !!layoutData.rightContent,
      hasBottomContent: !!layoutData.bottomContent,
      hasResponsive: !!layoutData.responsive
    });
    
    let instructions = `**LAYOUT REQUIREMENTS:**\n`;
    
    if (layoutData.layoutType) {
      instructions += `- Layout Type: ${layoutData.layoutType}\n`;
    }
    
    if (layoutData.columns) {
      instructions += `- Columns: ${layoutData.columns}\n`;
    }
    
    if (layoutData.leftContent) {
      instructions += `- Left Content: ${layoutData.leftContent}\n`;
    }
    
    if (layoutData.rightContent) {
      instructions += `- Right Content: ${layoutData.rightContent}\n`;
    }
    
    if (layoutData.bottomContent) {
      instructions += `- Bottom Content: ${layoutData.bottomContent}\n`;
    }
    
    if (layoutData.responsive) {
      instructions += `- Responsive: ${layoutData.responsive}\n`;
    }
    
    console.log('🌸 [DynamicPromptGenerator] Layout instructions formatted successfully, length:', instructions.length);
    return instructions;
  }

  /**
   * Enhanced Component Checklist - Now 100% Dynamic
   */
  private async generateComponentChecklist(
    componentName: string, 
    userPrompt: string
  ): Promise<string[]> {
    console.log('🌸 [DynamicPromptGenerator] Starting enhanced component checklist generation...');
    console.log('🌸 [DynamicPromptGenerator] Component:', componentName);
    
    try {
      // Get detailed checklist dynamically from user request
      console.log('🌸 [DynamicPromptGenerator] Getting detailed checklist...');
      const detailedChecklist = await this.generateDetailedComponentChecklist(componentName, userPrompt);
      
      // Get layout requirements dynamically
      console.log('🌸 [DynamicPromptGenerator] Getting layout requirements...');
      const layoutRequirements = await this.analyzeLayoutRequirements(userPrompt);
      
      // Combine all dynamic requirements
      const allRequirements: string[] = [];
      
      // Add layout requirements if specified
      if (layoutRequirements && layoutRequirements !== 'standard layout') {
        console.log('🌸 [DynamicPromptGenerator] Adding layout requirements to checklist');
        allRequirements.push(layoutRequirements);
      }
      
      // Add content requirements
      if (detailedChecklist.content.length > 0) {
        console.log('🌸 [DynamicPromptGenerator] Adding content requirements to checklist, count:', detailedChecklist.content.length);
        allRequirements.push(...detailedChecklist.content);
      }
      
      // Add structure requirements
      if (detailedChecklist.structure && detailedChecklist.structure !== 'standard structure') {
        console.log('🌸 [DynamicPromptGenerator] Adding structure requirements to checklist');
        allRequirements.push(detailedChecklist.structure);
      }
      
      // Add feature requirements
      if (detailedChecklist.features.length > 0) {
        console.log('🌸 [DynamicPromptGenerator] Adding feature requirements to checklist, count:', detailedChecklist.features.length);
        allRequirements.push(...detailedChecklist.features);
      }
      
      // Add validation requirements
      if (detailedChecklist.validation.length > 0) {
        console.log('🌸 [DynamicPromptGenerator] Adding validation requirements to checklist, count:', detailedChecklist.validation.length);
        allRequirements.push(...detailedChecklist.validation);
      }
      
      console.log('🌸 [DynamicPromptGenerator] Enhanced checklist generated successfully, total items:', allRequirements.length);
      return allRequirements;
      
    } catch (error) {
      console.warn('🌸 [DynamicPromptGenerator] Enhanced checklist generation failed:', error);
      
      console.log('🌸 [DynamicPromptGenerator] Using fallback checklist generation...');
      // Fallback: extract basic requirements dynamically
      const fallbackRequirements = [
        ...(await this.extractContentElements(userPrompt)),
        ...(await this.extractFeatures(userPrompt)),
        ...(await this.extractValidationRules(userPrompt))
      ];
      
      console.log('🌸 [DynamicPromptGenerator] Fallback checklist generated, items:', fallbackRequirements.length);
      return fallbackRequirements;
    }
  }
} 
// === Dynamic filtering helpers (kept private to this module) ===
declare global {
  interface Array<T> {
    // No global changes, placeholder to avoid TS isolatedModules complaint when no exports change
  }
}

export interface MinimalLLMArrayResponse { items: string[] }

// Add below the class to keep file organization clear
// (But methods are defined as private on the class via augmentation)

// We extend the class prototype to avoid large refactors and keep compatibility
(DynamicPromptGenerator as any).prototype.filterDesignNotesForComponent = async function filterDesignNotesForComponent(
  this: DynamicPromptGenerator,
  componentName: string,
  designNotes: string[] | string
): Promise<string[]> {
  try {
    const notesArray: string[] = Array.isArray(designNotes)
      ? designNotes
      : (designNotes ? [String(designNotes)] : []);

    if (notesArray.length === 0) {
      return [];
    }

    const analysis = `Given the component name and a list of design notes, return ONLY the notes relevant to that component.

Return a pure JSON object like: { "items": ["note1", "note2"] }

Component: ${componentName}
Design Notes: ${JSON.stringify(notesArray)}
`;

    const response = await (mistralClient as any).chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: 'You are a precise filter. Return only JSON with an "items" array of strings relevant to the specified component.' },
        { role: 'user', content: analysis }
      ],
      temperature: 0.1
    });

    const content = response.choices?.[0]?.message?.content || '';
    const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as MinimalLLMArrayResponse;
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items.filter(item => typeof item === 'string' && item.trim().length > 0);
      }
    }
  } catch (err) {
    console.warn('[DynamicPromptGenerator] Note filtering failed; proceeding with minimal notes');
  }
  return [];
};

// Old static implementation removed - now using 100% dynamic checklist generation

// Enhanced inter-row video hint extraction - 100% dynamic from user request
(DynamicPromptGenerator as any).prototype.extractInterRowVideoHint = async function extractInterRowVideoHint(
  this: DynamicPromptGenerator,
  componentName: string,
  userPrompt: string
): Promise<string | null> {
  try {
    const videoPrompt = `From this user request, determine if inter-row videos are needed:

"${userPrompt}"

Return a JSON object with:
{
  "needsInterRowVideos": true/false,
  "videoDescription": "description of what videos should show (if applicable)",
  "placement": "where videos should be placed (if applicable)"
}

Extract ONLY what the user specifically requested. Do NOT add generic examples.`;

    const response = await (mistralClient as any).chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: 'Analyze video requirements from user request. Return only JSON.' },
        { role: 'user', content: videoPrompt }
      ],
      temperature: 0.1
    });

    const content = response.choices?.[0]?.message?.content || '';
    const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join('') : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.needsInterRowVideos && parsed.videoDescription) {
        return `${parsed.videoDescription} ${parsed.placement || ''}`.trim();
      }
    }
  } catch (error) {
    console.warn('[DynamicPromptGenerator] Video hint extraction failed:', error);
  }
  
  return null;
};
