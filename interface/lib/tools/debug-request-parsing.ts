import { IntentDetectionService } from '../services/intent-detection';
import { IRLService } from '../services/irl-service';
import { ComponentKnowledgeBase } from '../services/component-knowledge-base';
import { RAGAgent } from '../agents/rag-agent';
import { DynamicPromptGenerator } from '../services/dynamic-prompt-generator';
import { UserIntent } from '../types/intent-types';

interface DebugResult {
  originalRequest: string;
  intentDetection: {
    intent: string;
    confidence: number;
    sections: string[];
    sectionDescriptions: Record<string, string>;
    businessType: string | undefined;
    colors: string[];
    theme: string;
    rawLLMResponse?: any;
  };
  irlStructure: {
    components: any[];
    isValid: boolean;
    errors: number;
    warnings: number;
    suggestions: number;
  };
  ragAnalysis: {
    patternsFound: number;
    confidence: number;
    recommendations: string[];
    similarPatterns: any[];
  };
  businessContext: {
    businessType: string;
    industry: string;
    targetAudience: string;
    valueProposition: string;
    colorScheme: string[];
    designStyle: string;
    keyFeatures: string[];
  };
  componentRequirements: {
    sections: string[];
    functionality: string[];
    interactions: string[];
    accessibility: string[];
    content: string[];
  };
  dynamicPrompts: {
    systemPrompt: string;
    userPrompt: string;
  };
}

export class DebugRequestParsing {
  private irlService: IRLService;
  private knowledgeBase: ComponentKnowledgeBase;
  private ragAgent: RAGAgent;
  private dynamicPromptGenerator: DynamicPromptGenerator;

  constructor() {
    this.irlService = new IRLService();
    this.knowledgeBase = new ComponentKnowledgeBase();
    this.ragAgent = new RAGAgent();
    this.dynamicPromptGenerator = new DynamicPromptGenerator();
  }

  async debugRequestParsing(userRequest: string): Promise<DebugResult> {
    console.log('🔍 [DEBUG] === STARTING REQUEST PARSING DEBUG ===');
    console.log('🔍 [DEBUG] Original Request:', userRequest.substring(0, 200) + '...');

    const result: DebugResult = {
      originalRequest: userRequest,
      intentDetection: {
        intent: '',
        confidence: 0,
        sections: [],
        sectionDescriptions: {},
        businessType: undefined,
        colors: [],
        theme: '',
        rawLLMResponse: undefined
      },
      irlStructure: {
        components: [],
        isValid: false,
        errors: 0,
        warnings: 0,
        suggestions: 0
      },
      ragAnalysis: {
        patternsFound: 0,
        confidence: 0,
        recommendations: [],
        similarPatterns: []
      },
      businessContext: {
        businessType: '',
        industry: '',
        targetAudience: '',
        valueProposition: '',
        colorScheme: [],
        designStyle: '',
        keyFeatures: []
      },
      componentRequirements: {
        sections: [],
        functionality: [],
        interactions: [],
        accessibility: [],
        content: []
      },
      dynamicPrompts: {
        systemPrompt: '',
        userPrompt: ''
      }
    };

    try {
      // === STEP 1: INTENT DETECTION ===
      console.log('🔍 [DEBUG] === STEP 1: INTENT DETECTION ===');
      const intentResult = await IntentDetectionService.detectIntent(userRequest);
      result.intentDetection = {
        intent: intentResult.intent?.intent || '',
        confidence: intentResult.confidence || 0,
        sections: intentResult.intent?.slots?.sections || [],
        sectionDescriptions: intentResult.intent?.slots?.section_descriptions || {},
        businessType: intentResult.intent?.slots?.business_type,
        colors: intentResult.intent?.slots?.colors || [],
        theme: intentResult.intent?.slots?.theme || '',
        rawLLMResponse: intentResult
      };

      console.log('🔍 [DEBUG] Intent Detection Result:');
      console.log('  - Intent:', result.intentDetection.intent);
      console.log('  - Confidence:', result.intentDetection.confidence);
      console.log('  - Sections:', result.intentDetection.sections);
      console.log('  - Section Descriptions:', result.intentDetection.sectionDescriptions);
      console.log('  - Business Type:', result.intentDetection.businessType);
      console.log('  - Colors:', result.intentDetection.colors);
      console.log('  - Theme:', result.intentDetection.theme);
      console.log('  - Raw Sections from LLM:', intentResult.intent?.slots?.sections);
      console.log('  - Extracted Sections:', intentResult.intent?.extracted_sections);

      // === STEP 2: IRL STRUCTURE CREATION ===
      console.log('🔍 [DEBUG] === STEP 2: IRL STRUCTURE CREATION ===');
      
      // Create a mock intent structure for IRL processing
      const mockIntent: UserIntent = {
        intent: 'create_website',
        slots: {
          sections: intentResult.intent?.slots?.sections || [],
          business_type: intentResult.intent?.slots?.business_type,
          colors: intentResult.intent?.slots?.colors || [],
          theme: intentResult.intent?.slots?.theme || '',
          site_type: 'landing_page'
        },
        confidence: intentResult.confidence || 0,
        raw_prompt: userRequest
      };
      
      const irlStructure = this.irlService.fromUserIntent(mockIntent);
      const irlValidation = this.irlService.validateStructure(irlStructure);
      
      result.irlStructure = {
        components: irlStructure.pages[0]?.components || [],
        isValid: irlValidation.isValid,
        errors: irlValidation.errors?.length || 0,
        warnings: irlValidation.warnings?.length || 0,
        suggestions: irlValidation.suggestions?.length || 0
      };

      console.log('🔍 [DEBUG] IRL Structure Result:');
      console.log('  - Components:', result.irlStructure.components.length);
      console.log('  - Is Valid:', result.irlStructure.isValid);
      console.log('  - Errors:', result.irlStructure.errors);
      console.log('  - Warnings:', result.irlStructure.warnings);
      console.log('  - Suggestions:', result.irlStructure.suggestions);
      console.log('  - Component Names:', result.irlStructure.components.map(c => c.name));

      // === STEP 3: RAG ANALYSIS ===
      console.log('🔍 [DEBUG] === STEP 3: RAG ANALYSIS ===');
      const ragResult = await this.ragAgent.retrieveRelevantPatterns(userRequest, 'Menu');
      
      result.ragAnalysis = {
        patternsFound: ragResult.patterns.length,
        confidence: ragResult.confidence,
        recommendations: ragResult.recommendations,
        similarPatterns: ragResult.patterns
      };

      console.log('🔍 [DEBUG] RAG Analysis Result:');
      console.log('  - Patterns Found:', result.ragAnalysis.patternsFound);
      console.log('  - Confidence:', result.ragAnalysis.confidence);
      console.log('  - Recommendations:', result.ragAnalysis.recommendations.length);
      console.log('  - Similar Patterns:', result.ragAnalysis.similarPatterns.length);

      // === STEP 4: BUSINESS CONTEXT ANALYSIS ===
      console.log('🔍 [DEBUG] === STEP 4: BUSINESS CONTEXT ANALYSIS ===');
      
      // For now, let's extract business context from the intent detection result
      const businessContext = {
        businessType: intentResult.intent?.slots?.business_type || '',
        industry: '',
        targetAudience: '',
        valueProposition: '',
        colorScheme: intentResult.intent?.slots?.colors || [],
        designStyle: intentResult.intent?.slots?.theme || '',
        keyFeatures: []
      };
      
      result.businessContext = businessContext;

      console.log('🔍 [DEBUG] Business Context Result:');
      console.log('  - Business Type:', result.businessContext.businessType);
      console.log('  - Industry:', result.businessContext.industry);
      console.log('  - Target Audience:', result.businessContext.targetAudience);
      console.log('  - Value Proposition:', result.businessContext.valueProposition);
      console.log('  - Color Scheme:', result.businessContext.colorScheme);
      console.log('  - Design Style:', result.businessContext.designStyle);
      console.log('  - Key Features:', result.businessContext.keyFeatures);

      // === STEP 5: COMPONENT REQUIREMENTS ANALYSIS ===
      console.log('🔍 [DEBUG] === STEP 5: COMPONENT REQUIREMENTS ANALYSIS ===');
      
      // Extract component requirements from the IRL structure
      const componentRequirements = {
        sections: intentResult.intent?.slots?.sections || [],
        functionality: [],
        interactions: [],
        accessibility: [],
        content: []
      };
      
      result.componentRequirements = componentRequirements;

      console.log('🔍 [DEBUG] Component Requirements Result:');
      console.log('  - Sections:', result.componentRequirements.sections);
      console.log('  - Functionality:', result.componentRequirements.functionality);
      console.log('  - Interactions:', result.componentRequirements.interactions);
      console.log('  - Accessibility:', result.componentRequirements.accessibility);
      console.log('  - Content:', result.componentRequirements.content);

      // === STEP 6: DYNAMIC PROMPT GENERATION ===
      console.log('🔍 [DEBUG] === STEP 6: DYNAMIC PROMPT GENERATION ===');
      
      // Use the actual public methods from dynamic prompt generator
      const systemPrompt = await this.dynamicPromptGenerator.generateSystemPrompt('Menu', userRequest);
      const userPrompt = await this.dynamicPromptGenerator.generateUserPrompt('Menu', userRequest, 'Menu component requirements');
      
      result.dynamicPrompts = {
        systemPrompt: systemPrompt.substring(0, 500) + '...',
        userPrompt: userPrompt.substring(0, 500) + '...'
      };

      console.log('🔍 [DEBUG] Dynamic Prompts Result:');
      console.log('  - System Prompt Length:', systemPrompt.length);
      console.log('  - User Prompt Length:', userPrompt.length);
      console.log('  - System Prompt Preview:', result.dynamicPrompts.systemPrompt);
      console.log('  - User Prompt Preview:', result.dynamicPrompts.userPrompt);

    } catch (error) {
      console.error('🔍 [DEBUG] Error during request parsing debug:', error);
    }

    console.log('🔍 [DEBUG] === REQUEST PARSING DEBUG COMPLETE ===');
    return result;
  }

  async testWithFashionSalonRequest(): Promise<DebugResult> {
    const fashionSalonRequest = `Create a modern landing page for my fashion salon brand. The page should include the following sections and components: Top Navigation Bar with logo on the left and menu links on the right (Home, Services, Stylists, Booking, Contact) Hero Section with a full-screen background video of a salon experience, overlaid with a slogan, headline, and a "Book Appointment" button About Us Block featuring a short story about the salon's history, mission, and an image collage Stylist Showcase with profile cards for 4 featured stylists (each with name, role, Instagram link, and portrait photo) Service Menu in a 3-column layout, grouping offerings like Hair, Makeup, and Nails, each with pricing and duration Client Gallery — a horizontal scroll section with before/after transformation images Interactive Booking Widget — with dropdowns for service, stylist, date, and time, and a "Confirm Booking" button Video Testimonial Carousel with short clips from satisfied clients Instagram Feed Grid showing the latest 6 posts with hover effects (connect to @mysalon handle) Newsletter Signup with bold title, a short incentive message (e.g., "Get 15% off your first visit"), email input, and subscribe button Footer with logo, contact info, opening hours, and social icons Design Notes: Use a blush pink and deep mauve color palette with elegant serif fonts`;

    return this.debugRequestParsing(fashionSalonRequest);
  }

  async testWithCarDealershipRequest(): Promise<DebugResult> {
    const carDealershipRequest = `Create a visually stunning, responsive landing page for my florist business. The page should include the following sections and components:

Top Navigation Bar with logo on the left, menu links (Home, Shop, Occasions, About Us, Contact), and a cart icon on the right

Hero Section with a full-width background image of a flower arrangement, overlaid with a seasonal tagline (e.g., “Summer Blooms Are Here”), a headline, subheadline, and a “Shop Now” CTA button

Best Sellers section — display 6 featured bouquets or floral arrangements with name, price, and “Add to Cart” button

Shop by Occasion grid — 4 category cards for events like Birthdays, Weddings, Anniversaries, and Sympathy, each with an image and link

How It Works — 3-step visual explanation (Choose Flowers → Add a Message → Deliver Same-Day) with icons

Client Testimonials — 3–5 quotes with client names, star ratings, and optionally an image of the arrangement they ordered

Florist’s Picks / Seasonal Collection — carousel slider showcasing 4–5 editor’s choice arrangements

Sustainability Badge — small banner highlighting eco-friendly packaging or local sourcing with an icon and short message

Newsletter Signup — include a title like “Bloom With Us”, short text (“Get 10% off your first bouquet”), email input, and subscribe button

Contact & Store Info — include store address, embedded map, business hours, and phone number

Footer with navigation links, social media icons, privacy policy, terms of service, and flower delivery coverage area`;

    return this.debugRequestParsing(carDealershipRequest);
  }

  async testWithExpertCarDealershipRequest(): Promise<DebugResult> {
    const expertCarDealershipRequest = `Create a visually stunning, responsive landing page for my florist business. The page should include the following sections and components:

Top Navigation Bar with logo on the left, menu links (Home, Shop, Occasions, About Us, Contact), and a cart icon on the right

Hero Section with a full-width background image of a flower arrangement, overlaid with a seasonal tagline (e.g., “Summer Blooms Are Here”), a headline, subheadline, and a “Shop Now” CTA button

Best Sellers section — display 6 featured bouquets or floral arrangements with name, price, and “Add to Cart” button

Shop by Occasion grid — 4 category cards for events like Birthdays, Weddings, Anniversaries, and Sympathy, each with an image and link

How It Works — 3-step visual explanation (Choose Flowers → Add a Message → Deliver Same-Day) with icons

Client Testimonials — 3–5 quotes with client names, star ratings, and optionally an image of the arrangement they ordered

Florist’s Picks / Seasonal Collection — carousel slider showcasing 4–5 editor’s choice arrangements

Sustainability Badge — small banner highlighting eco-friendly packaging or local sourcing with an icon and short message

Newsletter Signup — include a title like “Bloom With Us”, short text (“Get 10% off your first bouquet”), email input, and subscribe button

Contact & Store Info — include store address, embedded map, business hours, and phone number

Footer with navigation links, social media icons, privacy policy, terms of service, and flower delivery coverage area`;

    return this.debugRequestParsing(expertCarDealershipRequest);
  }
} 