const fetch = require('node-fetch');

async function testExpertComparison() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 [EXPERT TEST] === COMPREHENSIVE FRAMEWORK CAPABILITY TEST ===');
  
  const tests = [
    { name: 'Fashion Salon', type: 'fashion-salon', expectedSections: 10, expectedBusiness: 'fashion_salon' },
    { name: 'Car Dealership (Basic)', type: 'car-dealership', expectedSections: 8, expectedBusiness: 'car_dealership' },
    { name: 'Car Dealership (Expert)', type: 'expert-car-dealership', expectedSections: 11, expectedBusiness: 'car_dealership' }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n🔍 [EXPERT TEST] === TESTING: ${test.name} ===`);
    
    try {
      const response = await fetch(`${baseUrl}/api/debug-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: test.type
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Test - SUCCESS');
        console.log('📊 Results:');
        console.log(`  - Intent Detected: ${result.summary.intentDetected}`);
        console.log(`  - Confidence: ${result.summary.confidence}`);
        console.log(`  - Sections Detected: ${result.summary.sectionsDetected}`);
        console.log(`  - Business Type: ${result.summary.businessType}`);
        console.log(`  - IRL Components: ${result.summary.irlComponents}`);
        console.log(`  - RAG Patterns Found: ${result.summary.ragPatternsFound}`);
        console.log(`  - RAG Confidence: ${result.summary.ragConfidence}`);
        
        // Analysis
        console.log('\n🔍 [EXPERT TEST] Analysis:');
        
        // Business Type Analysis
        if (result.summary.businessType === test.expectedBusiness) {
          console.log(`✅ Business type correctly detected: ${result.summary.businessType}`);
        } else {
          console.log(`❌ Business type incorrectly detected: ${result.summary.businessType} (expected: ${test.expectedBusiness})`);
        }
        
        // Section Detection Analysis
        if (result.summary.sectionsDetected >= test.expectedSections) {
          console.log(`✅ Good section detection: ${result.summary.sectionsDetected} sections`);
        } else {
          console.log(`❌ Poor section detection: ${result.summary.sectionsDetected} sections (expected: ${test.expectedSections}+)`);
        }
        
        // Intent Detection Analysis
        if (result.summary.confidence >= 0.7) {
          console.log(`✅ High confidence intent detection: ${result.summary.confidence}`);
        } else {
          console.log(`❌ Low confidence intent detection: ${result.summary.confidence}`);
        }
        
        // RAG Analysis
        if (result.summary.ragPatternsFound > 0) {
          console.log(`✅ RAG patterns found: ${result.summary.ragPatternsFound} patterns`);
        } else {
          console.log(`❌ No RAG patterns found`);
        }
        
        // IRL Structure Analysis
        if (result.summary.irlComponents > 0) {
          console.log(`✅ IRL structure created: ${result.summary.irlComponents} components`);
        } else {
          console.log(`❌ No IRL components created`);
        }
        
        results.push({
          name: test.name,
          success: true,
          summary: result.summary,
          analysis: {
            businessTypeCorrect: result.summary.businessType === test.expectedBusiness,
            sectionDetectionGood: result.summary.sectionsDetected >= test.expectedSections,
            confidenceHigh: result.summary.confidence >= 0.7,
            ragWorking: result.summary.ragPatternsFound > 0,
            irlWorking: result.summary.irlComponents > 0
          }
        });
        
      } else {
        console.log('❌ Test - FAILED');
        console.log('Error:', result.error);
        results.push({
          name: test.name,
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.log('❌ Test - ERROR:', error.message);
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Final Analysis
  console.log('\n🔍 [EXPERT TEST] === FINAL ANALYSIS ===');
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`📊 Overall Results:`);
  console.log(`  - Total Tests: ${results.length}`);
  console.log(`  - Successful: ${successfulTests.length}`);
  console.log(`  - Failed: ${failedTests.length}`);
  console.log(`  - Success Rate: ${((successfulTests.length / results.length) * 100).toFixed(1)}%`);
  
  if (successfulTests.length > 0) {
    console.log('\n📊 Capability Analysis:');
    
    // Business Type Detection
    const businessTypeCorrect = successfulTests.filter(r => r.analysis.businessTypeCorrect).length;
    console.log(`  - Business Type Detection: ${businessTypeCorrect}/${successfulTests.length} (${((businessTypeCorrect / successfulTests.length) * 100).toFixed(1)}%)`);
    
    // Section Detection
    const sectionDetectionGood = successfulTests.filter(r => r.analysis.sectionDetectionGood).length;
    console.log(`  - Section Detection: ${sectionDetectionGood}/${successfulTests.length} (${((sectionDetectionGood / successfulTests.length) * 100).toFixed(1)}%)`);
    
    // Intent Confidence
    const confidenceHigh = successfulTests.filter(r => r.analysis.confidenceHigh).length;
    console.log(`  - Intent Confidence: ${confidenceHigh}/${successfulTests.length} (${((confidenceHigh / successfulTests.length) * 100).toFixed(1)}%)`);
    
    // RAG System
    const ragWorking = successfulTests.filter(r => r.analysis.ragWorking).length;
    console.log(`  - RAG System: ${ragWorking}/${successfulTests.length} (${((ragWorking / successfulTests.length) * 100).toFixed(1)}%)`);
    
    // IRL Structure
    const irlWorking = successfulTests.filter(r => r.analysis.irlWorking).length;
    console.log(`  - IRL Structure: ${irlWorking}/${successfulTests.length} (${((irlWorking / successfulTests.length) * 100).toFixed(1)}%)`);
  }
  
  console.log('\n🔍 [EXPERT TEST] === TESTING COMPLETE ===');
}

// Run the expert comparison test
testExpertComparison().catch(console.error); 