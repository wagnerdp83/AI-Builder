import { uiDatasetService } from '../lib/services/ui-dataset-service';
import { PromptEnhancer } from '../lib/services/prompt-enhancer';

async function testDatasetIntegration() {
  console.log('🧪 Testing Dataset Integration...\n');

  try {
    // Test 1: Load dataset
    console.log('1. Testing dataset loading...');
    const dataset = await uiDatasetService.loadDataset();
    console.log(`✅ Dataset loaded with ${dataset.length} examples\n`);

    // Test 2: Find similar examples
    console.log('2. Testing similar examples search...');
    const heroExamples = await uiDatasetService.findSimilarExamples('Create a hero section', 'Hero');
    console.log(`✅ Found ${heroExamples.length} similar examples for Hero component\n`);

    // Test 3: Get random examples
    console.log('3. Testing random examples...');
    const randomExamples = await uiDatasetService.getRandomExamples(2);
    console.log(`✅ Retrieved ${randomExamples.length} random examples\n`);

    // Test 4: Test prompt enhancement
    console.log('4. Testing prompt enhancement...');
    const originalPrompt = 'Create a modern hero section for a tech company';
    const enhanced = await PromptEnhancer.enhanceComponentPrompt('Hero', originalPrompt);
    console.log(`✅ Enhanced prompt with ${enhanced.examplesUsed} examples`);
    console.log(`Original: ${originalPrompt}`);
    console.log(`Enhanced length: ${enhanced.enhancedPrompt.length} characters\n`);

    // Test 5: Test different component types
    console.log('5. Testing different component types...');
    const componentTypes = ['Menu', 'Footer', 'Testimonials', 'Features'];
    
    for (const componentType of componentTypes) {
      const examples = await uiDatasetService.findSimilarExamples(`Create a ${componentType.toLowerCase()}`, componentType);
      console.log(`   ${componentType}: ${examples.length} examples found`);
    }

    console.log('\n🎉 All tests passed! Dataset integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDatasetIntegration();
}

export { testDatasetIntegration }; 