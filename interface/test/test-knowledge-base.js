const axios = require('axios');

async function testKnowledgeBase() {
  const baseUrl = 'http://localhost:3000/api/debug-knowledge-base';
  
  console.log('🧠 [KNOWLEDGE BASE TEST] Starting knowledge base tests...\n');

  const tests = [
    { name: 'Basic Functionality', type: 'basic' },
    { name: 'Fashion Salon Request', type: 'fashion-salon' },
    { name: 'Car Dealership Request', type: 'car-dealership' },
    { name: 'Integration Test', type: 'integration' }
  ];

  for (const test of tests) {
    console.log(`🧠 [KNOWLEDGE BASE TEST] Running: ${test.name}`);
    
    try {
      const response = await axios.post(baseUrl, { testType: test.type });
      
      if (response.data.success) {
        const summary = response.data.summary;
        console.log('✅ Test completed successfully');
        console.log(`  - Knowledge Base Initialized: ${summary.knowledgeBaseInitialized}`);
        console.log(`  - Patterns Count: ${summary.patternsCount}`);
        console.log(`  - Embeddings Generated: ${summary.embeddingsGenerated}`);
        console.log(`  - Pattern Storage Success: ${summary.patternStorageSuccess}`);
        console.log(`  - Patterns Added: ${summary.patternsAdded}`);
        console.log(`  - Patterns Retrieved: ${summary.patternsRetrieved}`);
        console.log(`  - Similarity Search Success: ${summary.similaritySearchSuccess}`);
        console.log(`  - Patterns Found: ${summary.patternsFound}`);
        console.log(`  - Embedding Generation Success: ${summary.embeddingGenerationSuccess}`);
        console.log(`  - Embedding Length: ${summary.embeddingLength}`);
        console.log(`  - Error Count: ${summary.errorCount}`);
        
        if (summary.errors.length > 0) {
          console.log('  - Errors:', summary.errors);
        }
      } else {
        console.log('❌ Test failed:', response.data.error);
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🧠 [KNOWLEDGE BASE TEST] All tests completed');
}

// Run the tests
testKnowledgeBase().catch(console.error); 