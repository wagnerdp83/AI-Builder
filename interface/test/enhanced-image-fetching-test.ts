import { enhancedImageService } from '../lib/services/image-service';

/**
 * Test Suite for Enhanced Image Fetching
 * Tests the ability to fetch unique images based on altText and component names
 */

const testCases = [
  {
    name: "Hero Component with Fashion Model AltText",
    componentName: "Hero",
    altText: "Elegant fashion model",
    expectedKeywords: ["fashion", "model", "elegant"],
    description: "Should fetch a fashion model image, not an airplane"
  },
  {
    name: "Features Component with Hair Styling AltText",
    componentName: "Features",
    altText: "Hair styling service",
    expectedKeywords: ["hair", "styling", "service"],
    description: "Should fetch a hair styling image"
  },
  {
    name: "Newsletter Component with Salon Scene AltText",
    componentName: "Newsletter",
    altText: "Salon scene with beauty products",
    expectedKeywords: ["salon", "scene", "beauty", "products"],
    description: "Should fetch a salon scene image"
  },
  {
    name: "Testimonials Component with Client Portrait AltText",
    componentName: "Testimonials",
    altText: "Client portrait with satisfied expression",
    expectedKeywords: ["client", "portrait", "satisfied"],
    description: "Should fetch a client portrait image"
  }
];

async function runEnhancedImageFetchingTests() {
  console.log('🧪 Starting Enhanced Image Fetching Tests...\n');

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🏷️ AltText: "${testCase.altText}"`);
    console.log(`🏗️ Component: ${testCase.componentName}`);
    
    try {
      // Test the enhanced getImageFromDescription method
      const imageUrl = await enhancedImageService.getImageFromDescription(
        '/images/mockups/placeholder.jpg',
        'Create a landing page for my fashion salon',
        testCase.altText,
        testCase.componentName
      );
      
      console.log('✅ Image fetched successfully');
      console.log(`🖼️ Image URL: ${imageUrl}`);
      
      // Test that the image URL is not empty
      if (imageUrl && imageUrl.length > 0) {
        console.log('✅ Image URL is valid');
      } else {
        console.log('❌ Image URL is empty');
      }
      
      // Test that different components get different images
      if (testCase.componentName === 'Hero') {
        const heroImage1 = await enhancedImageService.getImageFromDescription(
          '/images/mockups/placeholder.jpg',
          'Create a landing page for my fashion salon',
          'Elegant fashion model',
          'Hero'
        );
        
        const heroImage2 = await enhancedImageService.getImageFromDescription(
          '/images/mockups/placeholder.jpg',
          'Create a landing page for my fashion salon',
          'Elegant fashion model',
          'Hero'
        );
        
        if (heroImage1 === heroImage2) {
          console.log('✅ Same component gets consistent image (cached)');
        } else {
          console.log('⚠️ Same component got different images (should be cached)');
        }
      }
      
    } catch (error) {
      console.log('❌ Test Failed with Exception');
      console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  // Test component-specific image variety
  console.log('🔄 Testing Component-Specific Image Variety...\n');
  
  const components = ['Hero', 'Features', 'Newsletter', 'Testimonials'];
  const images: string[] = [];
  
  for (const component of components) {
    const image = await enhancedImageService.getImageFromDescription(
      '/images/mockups/placeholder.jpg',
      'Create a landing page for my fashion salon',
      'Fashion model',
      component
    );
    images.push(image);
    console.log(`${component}: ${image}`);
  }
  
  // Check if we have variety in images
  const uniqueImages = new Set(images);
  if (uniqueImages.size > 1) {
    console.log(`✅ Component-specific images are unique (${uniqueImages.size} unique images)`);
  } else {
    console.log('⚠️ All components got the same image (may be cached)');
  }
}

// Run the tests
runEnhancedImageFetchingTests().catch(console.error); 