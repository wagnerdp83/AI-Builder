import { UserIntent, IntentSlots } from '../lib/types/intent-types';

/**
 * Mock Test Suite for Intent Detection Service
 * Tests the ability to detect sections, extract details, and handle complex requests
 */

// Mock the intent detection service for testing
class MockIntentDetectionService {
  static async detectIntent(prompt: string): Promise<{
    success: boolean;
    intent?: UserIntent;
    confidence: number;
    error?: string;
  }> {
    console.log('[MockIntentDetection] Analyzing prompt:', prompt.substring(0, 100) + '...');
    
    // Simulate the current intent detection logic
    const sections = this.extractSections(prompt);
    const descriptions = this.extractDescriptions(prompt);
    const businessType = this.extractBusinessType(prompt);
    
    return {
      success: true,
      intent: {
        intent: 'create_website',
        slots: {
          site_type: 'landing_page',
          sections: sections,
          section_descriptions: descriptions,
          business_type: businessType,
          theme: 'modern',
          colors: []
        },
        confidence: 0.85,
        raw_prompt: prompt,
        extracted_sections: sections
      },
      confidence: 0.85
    };
  }
  
  private static extractSections(prompt: string): string[] {
    const sectionPatterns = [
      /Menu/g,
      /Hero/g,
      /Our Partners/g,
      /Benefits/g,
      /Features/g,
      /Newsletter/g,
      /FAQ/g,
      /Testimonials/g,
      /Footer/g,
      /Contact/g,
      /About/g
    ];
    
    const sections: string[] = [];
    sectionPatterns.forEach(pattern => {
      if (pattern.test(prompt)) {
        const match = pattern.source.replace(/[\/g]/g, '');
        sections.push(match);
      }
    });
    
    return sections;
  }
  
  private static extractDescriptions(prompt: string): Record<string, string> {
    const descriptions: Record<string, string> = {};
    
    // Extract Hero details
    const heroMatch = prompt.match(/Hero\s*\(([^)]+)\)/);
    if (heroMatch) {
      descriptions.hero = heroMatch[1];
    }
    
    // Extract other section descriptions
    const sectionMatches = prompt.match(/(\w+)\s*\(([^)]+)\)/g);
    if (sectionMatches) {
      sectionMatches.forEach(match => {
        const sectionMatch = match.match(/(\w+)\s*\(([^)]+)\)/);
        if (sectionMatch) {
          const section = sectionMatch[1];
          const description = sectionMatch[2];
          descriptions[section.toLowerCase()] = description;
        }
      });
    }
    
    return descriptions;
  }
  
  private static extractBusinessType(prompt: string): string {
    if (prompt.includes('fashion salon')) return 'fashion_salon';
    if (prompt.includes('real estate')) return 'real_estate';
    if (prompt.includes('restaurant')) return 'restaurant';
    return 'general';
  }
}

const testCases = [
  {
    name: "Fashion Salon Complex Request",
    prompt: `Create a landing page for my fashion salon with the following sections:

Menu with all sections

Hero (left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene)

Our Partners section (logos of 4–6 fashion brands or beauty partners)

Benefits (include 5 benefits of choosing the salon, e.g., personalized styling, expert staff)

Features (include 5 features with icons and images, such as hair styling, makeup, skincare, manicure, consultation)

Newsletter with an email form, a sign-up button, and a title image (preferably from Freepik)

FAQ (include 10 common FAQ related to salon services, appointments, pricing, or hygiene practices)

Testimonials (client quotes with names and profile pictures)

Footer with navigation links, Privacy Policy, and Cookies`,
    expectedSections: [
      'Menu', 'Hero', 'Our Partners', 'Benefits', 'Features', 
      'Newsletter', 'FAQ', 'Testimonials', 'Footer'
    ],
    expectedDetails: {
      hero: 'left side: headline, sub headline, star ratings, 1.5k Reviews, 5 avatars and an image on the right side showing a fashion model or salon scene',
      partners: 'logos of 4–6 fashion brands or beauty partners',
      benefits: 'include 5 benefits of choosing the salon, e.g., personalized styling, expert staff',
      features: 'include 5 features with icons and images, such as hair styling, makeup, skincare, manicure, consultation',
      newsletter: 'with an email form, a sign-up button, and a title image (preferably from Freepik)',
      faq: 'include 10 common FAQ related to salon services, appointments, pricing, or hygiene practices',
      testimonials: 'client quotes with names and profile pictures',
      footer: 'with navigation links, Privacy Policy, and Cookies'
    }
  },
  {
    name: "Real Estate Simple Request",
    prompt: "Create a real estate landing page with Hero, Features, Testimonials, and Contact sections",
    expectedSections: ['Hero', 'Features', 'Testimonials', 'Contact'],
    expectedDetails: {}
  },
  {
    name: "Restaurant with Specific Details",
    prompt: "Create a restaurant website with Hero (headline, subheadline, CTA button), Menu (food items with prices), About (story and team), and Contact (phone, email, address)",
    expectedSections: ['Hero', 'Menu', 'About', 'Contact'],
    expectedDetails: {
      hero: 'headline, subheadline, CTA button',
      menu: 'food items with prices',
      about: 'story and team',
      contact: 'phone, email, address'
    }
  }
];

async function runIntentDetectionTests() {
  console.log('🧪 Starting Mock Intent Detection Tests...\n');

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`📝 Prompt: ${testCase.prompt.substring(0, 100)}...`);
    
    try {
      const result = await MockIntentDetectionService.detectIntent(testCase.prompt);
      
      if (result.success && result.intent) {
        console.log('✅ Intent Detection Successful');
        console.log(`🎯 Intent: ${result.intent.intent}`);
        console.log(`📊 Confidence: ${result.confidence}`);
        
        // Test section detection
        const detectedSections = result.intent.slots?.sections || [];
        const missingSections = testCase.expectedSections.filter(
          section => !detectedSections.some(detected => 
            detected.toLowerCase().includes(section.toLowerCase())
          )
        );
        
        if (missingSections.length > 0) {
          console.log(`❌ Missing Sections: ${missingSections.join(', ')}`);
        } else {
          console.log('✅ All Expected Sections Detected');
        }
        
        // Test section descriptions
        const descriptions = result.intent.slots?.section_descriptions || {};
        console.log('📄 Section Descriptions:');
        Object.entries(descriptions).forEach(([section, description]) => {
          console.log(`  - ${section}: ${description}`);
        });
        
        // Test business type detection
        const businessType = result.intent.slots?.business_type;
        console.log(`🏢 Business Type: ${businessType}`);
        
      } else {
        console.log('❌ Intent Detection Failed');
        console.log(`Error: ${result.error}`);
      }
      
    } catch (error) {
      console.log('❌ Test Failed with Exception');
      console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// Run the tests
runIntentDetectionTests().catch(console.error); 