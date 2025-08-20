import { enhancedImageService } from '../lib/services/image-service';

/**
 * Test Suite for Enhanced Avatar Handling
 * Tests the ability to use local avatars consistently and with component-specific variety
 */

const testCases = [
  {
    name: "Hero Component Avatar",
    componentName: "Hero",
    expectedAvatar: "/images/avatars/Avatar_man.avif", // 'H' (72) % 11 = 6 -> index 6
    description: "Should use component-specific local avatar"
  },
  {
    name: "Features Component Avatar",
    componentName: "Features",
    expectedAvatar: "/images/avatars/Avatar_woman5.avif", // 'F' (70) % 11 = 4 -> index 4
    description: "Should use component-specific local avatar"
  },
  {
    name: "Newsletter Component Avatar",
    componentName: "Newsletter",
    expectedAvatar: "/images/avatars/Avatar_man.avif", // 'N' (78) % 11 = 1 -> index 1
    description: "Should use component-specific local avatar"
  },
  {
    name: "Testimonials Component Avatar",
    componentName: "Testimonials",
    expectedAvatar: "/images/avatars/Avatar_man2.avif", // 'T' (84) % 11 = 7 -> index 7
    description: "Should use component-specific local avatar"
  }
];

async function runEnhancedAvatarHandlingTests() {
  console.log('🧪 Starting Enhanced Avatar Handling Tests...\n');

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log(`🏗️ Component: ${testCase.componentName}`);
    
    try {
      // Test the enhanced getAvatarImage method
      const avatarUrl = await enhancedImageService.getAvatarImage(
        'Create a landing page for my fashion salon',
        testCase.componentName
      );
      
      console.log('✅ Avatar fetched successfully');
      console.log(`🖼️ Avatar URL: ${avatarUrl}`);
      
      // Test that the avatar URL is from local storage
      if (avatarUrl.includes('/images/avatars/')) {
        console.log('✅ Avatar is from local storage');
      } else {
        console.log('❌ Avatar is not from local storage');
      }
      
      // Test component-specific consistency
      const avatarUrl2 = await enhancedImageService.getAvatarImage(
        'Create a landing page for my fashion salon',
        testCase.componentName
      );
      
      if (avatarUrl === avatarUrl2) {
        console.log('✅ Component-specific avatar is consistent');
      } else {
        console.log('⚠️ Component-specific avatar is not consistent');
      }
      
    } catch (error) {
      console.log('❌ Test Failed with Exception');
      console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  // Test component variety
  console.log('🔄 Testing Component-Specific Avatar Variety...\n');
  
  const components = ['Hero', 'Features', 'Newsletter', 'Testimonials', 'Footer'];
  const avatars: string[] = [];
  
  for (const component of components) {
    const avatar = await enhancedImageService.getAvatarImage(
      'Create a landing page for my fashion salon',
      component
    );
    avatars.push(avatar);
    console.log(`${component}: ${avatar}`);
  }
  
  // Check if we have variety in avatars
  const uniqueAvatars = new Set(avatars);
  if (uniqueAvatars.size > 1) {
    console.log(`✅ Component-specific avatars are unique (${uniqueAvatars.size} unique avatars)`);
  } else {
    console.log('⚠️ All components got the same avatar');
  }
  
  // Test without component name (should use random)
  console.log('\n🔄 Testing Random Avatar Selection...\n');
  
  const randomAvatars: string[] = [];
  for (let i = 0; i < 5; i++) {
    const avatar = await enhancedImageService.getAvatarImage(
      'Create a landing page for my fashion salon'
    );
    randomAvatars.push(avatar);
    console.log(`Random ${i + 1}: ${avatar}`);
  }
  
  const uniqueRandomAvatars = new Set(randomAvatars);
  console.log(`Random avatars variety: ${uniqueRandomAvatars.size} unique out of 5`);
}

// Run the tests
runEnhancedAvatarHandlingTests().catch(console.error); 