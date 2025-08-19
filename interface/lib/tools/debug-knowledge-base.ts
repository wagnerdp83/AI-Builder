import { ComponentKnowledgeBase } from '../services/component-knowledge-base';
import { IntentDetectionService } from '../services/intent-detection';

interface KnowledgeBaseTestResult {
  testName: string;
  originalRequest: string;
  knowledgeBaseStatus: {
    isInitialized: boolean;
    patternsCount: number;
    embeddingsGenerated: boolean;
  };
  patternStorage: {
    patternsAdded: number;
    patternsRetrieved: number;
    storageSuccess: boolean;
  };
  similaritySearch: {
    query: string;
    patternsFound: number;
    topMatches: any[];
    confidence: number;
    searchSuccess: boolean;
  };
  embeddingGeneration: {
    textProcessed: string;
    embeddingGenerated: boolean;
    embeddingLength: number;
    generationSuccess: boolean;
  };
  errorLog: string[];
}

export class DebugKnowledgeBase {
  private knowledgeBase: ComponentKnowledgeBase;

  constructor() {
    this.knowledgeBase = new ComponentKnowledgeBase();
  }

  async testKnowledgeBaseFunctionality(): Promise<KnowledgeBaseTestResult> {
    console.log('🧠 [KNOWLEDGE BASE DEBUG] === STARTING KNOWLEDGE BASE TEST ===');
    
    const result: KnowledgeBaseTestResult = {
      testName: 'Knowledge Base Functionality Test',
      originalRequest: 'Create a modern landing page for my fashion salon brand with navigation, hero, and testimonials sections',
      knowledgeBaseStatus: {
        isInitialized: false,
        patternsCount: 0,
        embeddingsGenerated: false
      },
      patternStorage: {
        patternsAdded: 0,
        patternsRetrieved: 0,
        storageSuccess: false
      },
      similaritySearch: {
        query: '',
        patternsFound: 0,
        topMatches: [],
        confidence: 0,
        searchSuccess: false
      },
      embeddingGeneration: {
        textProcessed: '',
        embeddingGenerated: false,
        embeddingLength: 0,
        generationSuccess: false
      },
      errorLog: []
    };

    try {
      // === STEP 1: KNOWLEDGE BASE STATUS CHECK ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 1: KNOWLEDGE BASE STATUS CHECK ===');
      
      try {
        const stats = this.knowledgeBase.getStats();
        result.knowledgeBaseStatus.isInitialized = true;
        result.knowledgeBaseStatus.patternsCount = stats.totalPatterns;
        console.log('✅ Knowledge base status checked successfully');
        console.log('  - Total Patterns:', stats.totalPatterns);
        console.log('  - Successful Patterns:', stats.successfulPatterns);
        console.log('  - Failed Patterns:', stats.failedPatterns);
        console.log('  - Components:', stats.components);
      } catch (error) {
        result.errorLog.push(`Knowledge base status check failed: ${error}`);
        console.error('❌ Knowledge base status check failed:', error);
      }

      // === STEP 2: PATTERN STORAGE TEST ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 2: PATTERN STORAGE TEST ===');
      
      const testPattern = {
        userRequest: 'Create a modern landing page for my fashion salon brand',
        requirements: 'Generate a Menu component for a fashion salon landing page',
        generatedCode: '---\n// Menu.astro\nconst { logoSrc, navItems } = Astro.props;\n---\n<header>...</header>',
        success: true,
        similarity: 0.95,
        relevance: 0.98
      };

      try {
        await this.knowledgeBase.addPattern(testPattern);
        result.patternStorage.patternsAdded = 1;
        result.patternStorage.storageSuccess = true;
        console.log('✅ Pattern stored successfully');
      } catch (error) {
        result.errorLog.push(`Pattern storage failed: ${error}`);
        console.error('❌ Pattern storage failed:', error);
      }

      // === STEP 3: EMBEDDING GENERATION TEST ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 3: EMBEDDING GENERATION TEST ===');
      
      const testText = 'Create a modern landing page for my fashion salon brand';
      result.embeddingGeneration.textProcessed = testText;
      
      try {
        const embedding = await this.knowledgeBase.generateEmbedding(testText);
        result.embeddingGeneration.embeddingGenerated = true;
        result.embeddingGeneration.embeddingLength = embedding.length;
        result.embeddingGeneration.generationSuccess = true;
        console.log('✅ Embedding generated successfully, length:', embedding.length);
      } catch (error) {
        result.errorLog.push(`Embedding generation failed: ${error}`);
        console.error('❌ Embedding generation failed:', error);
      }

      // === STEP 4: SIMILARITY SEARCH TEST ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 4: SIMILARITY SEARCH TEST ===');
      
      const searchQuery = 'fashion salon landing page with navigation';
      result.similaritySearch.query = searchQuery;
      
      try {
        const searchResult = await this.knowledgeBase.findSimilarPatterns(searchQuery, 5);
        result.similaritySearch.patternsFound = searchResult.length;
        result.similaritySearch.topMatches = searchResult.slice(0, 3);
        result.similaritySearch.confidence = searchResult.length > 0 ? searchResult[0].similarity || 0 : 0;
        result.similaritySearch.searchSuccess = true;
        console.log('✅ Similarity search completed, found patterns:', searchResult.length);
      } catch (error) {
        result.errorLog.push(`Similarity search failed: ${error}`);
        console.error('❌ Similarity search failed:', error);
      }

      // === STEP 5: PATTERN RETRIEVAL TEST ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 5: PATTERN RETRIEVAL TEST ===');
      
      try {
        const stats = this.knowledgeBase.getStats();
        result.patternStorage.patternsRetrieved = stats.totalPatterns;
        result.knowledgeBaseStatus.patternsCount = stats.totalPatterns;
        console.log('✅ Patterns retrieved successfully, count:', stats.totalPatterns);
      } catch (error) {
        result.errorLog.push(`Pattern retrieval failed: ${error}`);
        console.error('❌ Pattern retrieval failed:', error);
      }

      // === STEP 6: KNOWLEDGE BASE STATUS ===
      console.log('🧠 [KNOWLEDGE BASE DEBUG] === STEP 6: KNOWLEDGE BASE STATUS ===');
      
      result.knowledgeBaseStatus.embeddingsGenerated = result.embeddingGeneration.generationSuccess;
      
      console.log('🧠 [KNOWLEDGE BASE DEBUG] Final Status:');
      console.log('  - Initialized:', result.knowledgeBaseStatus.isInitialized);
      console.log('  - Patterns Count:', result.knowledgeBaseStatus.patternsCount);
      console.log('  - Embeddings Generated:', result.knowledgeBaseStatus.embeddingsGenerated);
      console.log('  - Pattern Storage Success:', result.patternStorage.storageSuccess);
      console.log('  - Similarity Search Success:', result.similaritySearch.searchSuccess);
      console.log('  - Embedding Generation Success:', result.embeddingGeneration.generationSuccess);

    } catch (error) {
      result.errorLog.push(`General knowledge base test error: ${error}`);
      console.error('❌ General knowledge base test error:', error);
    }

    console.log('🧠 [KNOWLEDGE BASE DEBUG] === KNOWLEDGE BASE TEST COMPLETE ===');
    return result;
  }

  async testWithFashionSalonRequest(): Promise<KnowledgeBaseTestResult> {
    const fashionSalonRequest = `Create a modern landing page for my fashion salon brand. The page should include the following sections and components: Top Navigation Bar with logo on the left and menu links on the right (Home, Services, Stylists, Booking, Contact) Hero Section with a full-screen background video of a salon experience, overlaid with a slogan, headline, and a "Book Appointment" button About Us Block featuring a short story about the salon's history, mission, and an image collage Stylist Showcase with profile cards for 4 featured stylists (each with name, role, Instagram link, and portrait photo) Service Menu in a 3-column layout, grouping offerings like Hair, Makeup, and Nails, each with pricing and duration Client Gallery — a horizontal scroll section with before/after transformation images Interactive Booking Widget — with dropdowns for service, stylist, date, and time, and a "Confirm Booking" button Video Testimonial Carousel with short clips from satisfied clients Instagram Feed Grid showing the latest 6 posts with hover effects (connect to @mysalon handle) Newsletter Signup with bold title, a short incentive message (e.g., "Get 15% off your first visit"), email input, and subscribe button Footer with logo, contact info, opening hours, and social icons Design Notes: Use a blush pink and deep mauve color palette with elegant serif fonts`;

    console.log('🧠 [KNOWLEDGE BASE DEBUG] Testing with Fashion Salon Request');
    return this.testKnowledgeBaseFunctionality();
  }

  async testWithCarDealershipRequest(): Promise<KnowledgeBaseTestResult> {
    const carDealershipRequest = `Create a responsive, high-converting landing page for my car dealership business. The page should include the following sections: Sticky Top Menu with logo, navigation links (Home, Inventory, Trade-In, Financing, Contact), and a "Schedule Test Drive" CTA button Hero Section featuring a rotating carousel of featured cars (with name, price, CTA to "View Details") and a tagline overlay like "Find Your Perfect Ride" Why Choose Us section with 4 feature highlights (e.g., Certified Pre-Owned, 24/7 Support, Easy Financing, 7-Day Return Guarantee) — each with icons Inventory Highlights — grid of 6 featured cars with image, make/model, year, mileage, price, and "See Details" button Trade-In Estimator block with a form asking for current car details (make, model, year, condition) and a "Get Estimate" button Financing Options section explaining payment plans, credit check options, and a "Apply Now" button linking to a form Customer Reviews — 3 to 5 testimonials with star ratings, car purchased, and buyer name/location FAQs section with 8 common questions about car buying, trade-ins, warranties, or financing Newsletter Signup — simple email field with the message "Get our latest deals and new arrivals" Location Map & Contact Info — embed a map and include dealership address, phone, hours, and contact form Footer with quick links (About, Inventory, Privacy Policy, Terms), social media icons, and dealership license info Design Notes: Use a clean and bold color scheme (black, white, and electric blue)`;

    console.log('🧠 [KNOWLEDGE BASE DEBUG] Testing with Car Dealership Request');
    return this.testKnowledgeBaseFunctionality();
  }

  async testKnowledgeBaseIntegration(): Promise<KnowledgeBaseTestResult> {
    console.log('🧠 [KNOWLEDGE BASE DEBUG] === TESTING KNOWLEDGE BASE INTEGRATION ===');
    
    const result: KnowledgeBaseTestResult = {
      testName: 'Knowledge Base Integration Test',
      originalRequest: 'Integration test for knowledge base with intent detection',
      knowledgeBaseStatus: {
        isInitialized: false,
        patternsCount: 0,
        embeddingsGenerated: false
      },
      patternStorage: {
        patternsAdded: 0,
        patternsRetrieved: 0,
        storageSuccess: false
      },
      similaritySearch: {
        query: '',
        patternsFound: 0,
        topMatches: [],
        confidence: 0,
        searchSuccess: false
      },
      embeddingGeneration: {
        textProcessed: '',
        embeddingGenerated: false,
        embeddingLength: 0,
        generationSuccess: false
      },
      errorLog: []
    };

    try {
      // Test knowledge base with intent detection integration
      const testRequest = 'Create a modern landing page for my fashion salon brand';
      
      // Step 1: Intent Detection
      console.log('🧠 [KNOWLEDGE BASE DEBUG] Step 1: Intent Detection');
      const intentResult = await IntentDetectionService.detectIntent(testRequest);
      
      // Step 2: Knowledge Base Search
      console.log('🧠 [KNOWLEDGE BASE DEBUG] Step 2: Knowledge Base Search');
      const searchResult = await this.knowledgeBase.findSimilarPatterns(testRequest, 3);
      
      result.similaritySearch.query = testRequest;
      result.similaritySearch.patternsFound = searchResult.length;
      result.similaritySearch.topMatches = searchResult.slice(0, 3);
      result.similaritySearch.searchSuccess = searchResult.length > 0;
      
      console.log('✅ Integration test completed');
      console.log('  - Intent detected:', intentResult.intent?.intent);
      console.log('  - Patterns found:', searchResult.length);
      
    } catch (error) {
      result.errorLog.push(`Integration test failed: ${error}`);
      console.error('❌ Integration test failed:', error);
    }

    return result;
  }
} 