import { UserIntent, IntentSlots } from '../lib/types/intent-types';

/**
 * Enhanced Mock Test Suite for Intent Detection Service
 * Tests the enhanced ability to detect sections, extract details, and handle complex requests
 */

// Enhanced mock intent detection service
class EnhancedMockIntentDetectionService {
  static async detectIntent(prompt: string): Promise<{
    success: boolean;
    intent?: UserIntent;
    confidence: number;
    error?: string;
  }> {
    console.log('[EnhancedMockIntentDetection] Analyzing prompt:', prompt.substring(0, 100) + '...');
    
    // Enhanced section extraction
    const sections = this.extractAllSections(prompt);
    const descriptions = this.extractDetailedDescriptions(prompt);
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
        confidence: 0.95,
        raw_prompt: prompt,
        extracted_sections: sections
      },
      confidence: 0.95
    };
  }
  
  private static extractAllSections(prompt: string): string[] {
    const sectionPatterns = [
      { pattern: /Menu\s+with\s+all\s+sections/g, name: 'Menu' },
      { pattern: /Hero\s*\(/g, name: 'Hero' },
      { pattern: /Our\s+Partners\s+section/g, name: 'Our Partners' },
      { pattern: /Benefits\s*\(/g, name: 'Benefits' },
      { pattern: /Features\s*\(/g, name: 'Features' },
      { pattern: /Newsletter\s+with/g, name: 'Newsletter' },
      { pattern: /FAQ\s*\(/g, name: 'FAQ' },
      { pattern: /Testimonials\s*\(/g, name: 'Testimonials' },
      { pattern: /Footer\s+with/g, name: 'Footer' },
      { pattern: /Contact\s+section/g, name: 'Contact' },
      { pattern: /About\s+section/g, name: 'About' }
    ];
    
    const sections: string[] = [];
    sectionPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(prompt)) {
        sections.push(name);
      }
    });
    
    return sections;
  }
  
  private static extractDetailedDescriptions(prompt: string): Record<string, string> {
    const descriptions: Record<string, string> = {};
    
    // Enhanced pattern matching for detailed descriptions
    const descriptionPatterns = [
      {
        pattern: /Hero\s*\(([^)]+)\)/,
        key: 'hero'
      },
      {
        pattern: /Our\s+Partners\s+section\s*\(([^)]+)\)/,
        key: 'our_partners'
      },
      {
        pattern: /Benefits\s*\(([^)]+)\)/,
        key: 'benefits'
      },
      {
        pattern: /Features\s*\(([^)]+)\)/,
        key: 'features'
      },
      {
        pattern: /Newsletter\s+with\s+([^)]+)\)/,
        key: 'newsletter'
      },
      {
        pattern: /FAQ\s*\(([^)]+)\)/,
        key: 'faq'
      },
      {
        pattern: /Testimonials\s*\(([^)]+)\)/,
        key: 'testimonials'
      },
      {
        pattern: /Footer\s+with\s+([^)]+)\)/,
        key: 'footer'
      }
    ];
    
    descriptionPatterns.forEach(({ pattern, key }) => {
      const match = prompt.match(pattern);
      if (match) {
        descriptions[key] = match[1].trim();
      }
    });
    
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
      our_partners: 'logos of 4–6 fashion brands or beauty partners',
      benefits: 'include 5 benefits of choosing the salon, e.g., personalized styling, expert staff',
      features: 'include 5 features with icons and images, such as hair styling, makeup, skincare, manicure, consultation',
      newsletter: 'an email form, a sign-up button, and a title image (preferably from Freepik)',
      faq: 'include 10 common FAQ related to salon services, appointments, pricing, or hygiene practices',
      testimonials: 'client quotes with names and profile pictures',
      footer: 'navigation links, Privacy Policy, and Cookies'
    }
  }
];

async function runEnhancedIntentDetectionTests() {
  console.log('🧪 Starting Enhanced Intent Detection Tests...\n');

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`📝 Prompt: ${testCase.prompt.substring(0, 100)}...`);
    
    try {
      const result = await EnhancedMockIntentDetectionService.detectIntent(testCase.prompt);
      
      if (result.success && result.intent) {
        console.log('✅ Enhanced Intent Detection Successful');
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
        console.log('📄 Enhanced Section Descriptions:');
        Object.entries(descriptions).forEach(([section, description]) => {
          console.log(`  - ${section}: ${description}`);
        });
        
        // Test business type detection
        const businessType = result.intent.slots?.business_type;
        console.log(`🏢 Business Type: ${businessType}`);
        
        // Test specific details extraction
        console.log('🔍 Specific Details Test:');
        const heroDesc = descriptions.hero || descriptions.hero;
        if (heroDesc) {
          const hasStarRatings = heroDesc.includes('star ratings');
          const hasAvatars = heroDesc.includes('avatars');
          const hasReviews = heroDesc.includes('Reviews');
          const hasImage = heroDesc.includes('image');
          
          console.log(`  - Star Ratings: ${hasStarRatings ? '✅' : '❌'}`);
          console.log(`  - Avatars: ${hasAvatars ? '✅' : '❌'}`);
          console.log(`  - Reviews Count: ${hasReviews ? '✅' : '❌'}`);
          console.log(`  - Image Description: ${hasImage ? '✅' : '❌'}`);
        }
        
      } else {
        console.log('❌ Enhanced Intent Detection Failed');
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
runEnhancedIntentDetectionTests().catch(console.error); 