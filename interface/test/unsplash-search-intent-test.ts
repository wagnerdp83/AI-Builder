import { describe, it, expect } from 'vitest';

// Test for Issue 2: Unsplash Image Search Not Matching User Intent
describe('Unsplash Search Intent Test', () => {
  
  // Mock the current image service logic
  function mockCurrentImageService(prompt: string, componentName?: string): string {
    // Current logic - too generic
    const promptWords = prompt.toLowerCase().split(/\s+/);
    const businessKeywords = promptWords.filter(word => 
      word.length > 3 && 
      !['with', 'the', 'and', 'for', 'that', 'this', 'have', 'will', 'from', 'your', 'page', 'landing', 'website', 'create', 'sections', 'include'].includes(word)
    );
    
    if (businessKeywords.length > 0) {
      const primaryKeyword = businessKeywords[0];
      return `${primaryKeyword} product`;
    } else {
      return 'general product';
    }
  }

  // Mock the enhanced image service logic
  function mockEnhancedImageService(prompt: string, componentName?: string, requirements?: any): string {
    // Enhanced logic - uses specific requirements
    if (requirements && requirements.content && requirements.content.elements) {
      // Extract specific image descriptions from requirements
      const imageElements = requirements.content.elements.filter((element: string) => 
        element.toLowerCase().includes('image') || 
        element.toLowerCase().includes('photo') ||
        element.toLowerCase().includes('picture')
      );
      
      if (imageElements.length > 0) {
        // Use the specific image description
        return imageElements[0];
      }
    }
    
    // Fallback to component-specific search
    const componentMap: Record<string, string[]> = {
      'hero': ['hero image', 'main banner', 'landing page hero'],
      'gallery': ['product gallery', 'image collection', 'photo showcase'],
      'testimonials': ['customer testimonials', 'reviews image', 'feedback illustration'],
      'services': ['service illustration', 'product features', 'service highlights'],
      'about': ['about us', 'company story', 'team image'],
      'contact': ['contact form', 'communication', 'support image']
    };
    
    const normalizedComponentName = componentName?.toLowerCase().replace(/[^a-z]/g, '') || 'hero';
    const searchTerms = componentMap[normalizedComponentName] || componentMap['hero'];
    
    return searchTerms[Math.floor(Math.random() * searchTerms.length)];
  }

  it('should demonstrate the current generic search issue', () => {
    console.log('🧪 [Intent Test] Testing current generic search issue...');
    
    const testCases = [
      {
        prompt: "Create a modern landing page for my Natural & Organic Shop with organic products",
        expectedIntent: "organic products",
        currentResult: mockCurrentImageService("Create a modern landing page for my Natural & Organic Shop with organic products")
      },
      {
        prompt: "Create a fashion salon website with hair styling services",
        expectedIntent: "hair styling services", 
        currentResult: mockCurrentImageService("Create a fashion salon website with hair styling services")
      },
      {
        prompt: "Create a real estate website with luxury properties",
        expectedIntent: "luxury properties",
        currentResult: mockCurrentImageService("Create a real estate website with luxury properties")
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`🧪 [Intent Test] Test case ${i + 1}:`);
      console.log(`🧪 [Intent Test] Prompt: ${testCase.prompt}`);
      console.log(`🧪 [Intent Test] Expected intent: ${testCase.expectedIntent}`);
      console.log(`🧪 [Intent Test] Current result: ${testCase.currentResult}`);
      
      // The current logic is too generic - it just takes the first business keyword
      expect(testCase.currentResult).not.toContain(testCase.expectedIntent);
      console.log(`✅ [Intent Test] Test case ${i + 1} demonstrates the issue`);
    }
  });

  it('should demonstrate enhanced search with specific requirements', () => {
    console.log('🧪 [Intent Test] Testing enhanced search with specific requirements...');
    
    const testCases = [
      {
        prompt: "Create a modern landing page for my Natural & Organic Shop with organic products",
        requirements: {
          content: {
            elements: [
              "organic honey in glass jar",
              "handmade organic soap", 
              "fresh herbs and spices",
              "natural skincare products"
            ]
          }
        },
        componentName: "Gallery",
        expectedIntent: "organic honey in glass jar"
      },
      {
        prompt: "Create a fashion salon website with hair styling services",
        requirements: {
          content: {
            elements: [
              "professional hair styling",
              "beauty salon interior",
              "hair cutting tools",
              "stylist at work"
            ]
          }
        },
        componentName: "Services",
        expectedIntent: "professional hair styling"
      },
      {
        prompt: "Create a real estate website with luxury properties",
        requirements: {
          content: {
            elements: [
              "luxury home exterior",
              "modern kitchen design",
              "spacious living room",
              "beautiful garden"
            ]
          }
        },
        componentName: "Hero",
        expectedIntent: "luxury home exterior"
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`🧪 [Intent Test] Enhanced test case ${i + 1}:`);
      console.log(`🧪 [Intent Test] Prompt: ${testCase.prompt}`);
      console.log(`🧪 [Intent Test] Component: ${testCase.componentName}`);
      console.log(`🧪 [Intent Test] Requirements: ${JSON.stringify(testCase.requirements.content.elements)}`);
      
      const enhancedResult = mockEnhancedImageService(
        testCase.prompt, 
        testCase.componentName, 
        testCase.requirements
      );
      
      console.log(`🧪 [Intent Test] Enhanced result: ${enhancedResult}`);
      console.log(`🧪 [Intent Test] Expected intent: ${testCase.expectedIntent}`);
      
      // The enhanced logic should use specific requirements
      expect(enhancedResult).toContain(testCase.expectedIntent.split(' ')[0]); // At least the first word
      console.log(`✅ [Intent Test] Enhanced test case ${i + 1} works correctly`);
    }
  });

  it('should handle cases where requirements are not available', () => {
    console.log('🧪 [Intent Test] Testing fallback behavior...');
    
    const testCases = [
      {
        prompt: "Create a modern landing page for my Natural & Organic Shop",
        componentName: "Hero",
        expectedFallback: "hero image"
      },
      {
        prompt: "Create a fashion salon website",
        componentName: "Gallery", 
        expectedFallback: "product gallery"
      },
      {
        prompt: "Create a real estate website",
        componentName: "Testimonials",
        expectedFallback: "customer testimonials"
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`🧪 [Intent Test] Fallback test case ${i + 1}:`);
      console.log(`🧪 [Intent Test] Prompt: ${testCase.prompt}`);
      console.log(`🧪 [Intent Test] Component: ${testCase.componentName}`);
      
      const fallbackResult = mockEnhancedImageService(
        testCase.prompt,
        testCase.componentName,
        undefined // No requirements
      );
      
      console.log(`🧪 [Intent Test] Fallback result: ${fallbackResult}`);
      console.log(`🧪 [Intent Test] Expected fallback: ${testCase.expectedFallback}`);
      
      // Should fall back to component-specific search
      expect(fallbackResult).toContain(testCase.expectedFallback.split(' ')[0]);
      console.log(`✅ [Intent Test] Fallback test case ${i + 1} works correctly`);
    }
  });
}); 