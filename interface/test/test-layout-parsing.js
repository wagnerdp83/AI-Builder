// Test layout parsing functionality
console.log('🧪 Testing Layout Parsing...');

// Test the user's exact request
const userPrompt = "Create a landing page for my real estate business with the following sections: menu with all sections, Hero ( right side: headline, sub headline, reviews stars, 1.5k Reviews, 5 avatars and an image on the left side) partners, benefits ( include 5 benefits), features (include 5 features with icon and images), newsletter with email form and signup button, faq (include 10 common FAQ in real estate website issues), testimonials and footer with Privacy policy and Cookies.";

// Simulate the component requirements extraction
function extractHeroRequirements(prompt) {
  const requirements = [];
  
  // Extract Hero-specific details with precise layout parsing
  if (prompt.includes('right side:') && prompt.includes('image on the left side')) {
    requirements.push('- Layout: Content on RIGHT side, image on LEFT side');
  } else if (prompt.includes('left side:') && prompt.includes('image on the right side')) {
    requirements.push('- Layout: Content on LEFT side, image on RIGHT side');
  } else if (prompt.includes('right side:')) {
    requirements.push('- Layout: Content on RIGHT side');
  } else if (prompt.includes('left side:')) {
    requirements.push('- Layout: Content on LEFT side');
  }
  
  // Content specifications
  if (prompt.includes('headline')) {
    requirements.push('- Content: Include main headline');
  }
  if (prompt.includes('sub headline')) {
    requirements.push('- Content: Include sub headline');
  }
  if (prompt.includes('reviews stars')) {
    requirements.push('- Content: Include review stars');
  }
  if (prompt.includes('1.5k Reviews')) {
    requirements.push('- Content: Include "1.5k Reviews" text');
  }
  if (prompt.includes('5 avatars')) {
    requirements.push('- Content: Include 5 avatar images');
  }
  if (prompt.includes('avatars')) {
    const avatarMatch = prompt.match(/(\d+)\s+avatars?/);
    if (avatarMatch) {
      requirements.push(`- Content: Include ${avatarMatch[1]} avatar images`);
    }
  }
  
  return requirements;
}

console.log('🧪 Test: Hero component requirements extraction');
const heroRequirements = extractHeroRequirements(userPrompt);

console.log('📋 Extracted Hero Requirements:');
heroRequirements.forEach(req => console.log(`  ${req}`));

// Check if layout is correctly parsed
const hasLayoutSpec = heroRequirements.some(req => req.includes('Layout:'));
const hasRightContent = heroRequirements.some(req => req.includes('RIGHT side'));
const hasLeftImage = heroRequirements.some(req => req.includes('LEFT side'));

console.log('\n✅ Layout Parsing Results:');
console.log(`  Has layout specification: ${hasLayoutSpec}`);
console.log(`  Content on RIGHT side: ${hasRightContent}`);
console.log(`  Image on LEFT side: ${hasLeftImage}`);

if (hasLayoutSpec && hasRightContent && hasLeftImage) {
  console.log('✅ SUCCESS: Layout requirements correctly parsed!');
} else {
  console.log('❌ FAILED: Layout requirements not correctly parsed');
}

console.log('\n🎯 Expected Layout:');
console.log('  - Content (headline, sub headline, reviews stars, 1.5k Reviews, 5 avatars) on RIGHT side');
console.log('  - Image on LEFT side');
console.log('  - Use flexbox with flex-row-reverse to achieve this layout');

console.log('\n🎉 Layout parsing test completed!'); 