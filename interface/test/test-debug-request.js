const fetch = require('node-fetch');

async function testDebugRequest() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 [TEST] === TESTING REQUEST PARSING DEBUG ===');
  
  // Test 1: Fashion Salon Request
  console.log('\n🔍 [TEST] === TEST 1: FASHION SALON REQUEST ===');
  try {
    const fashionSalonResponse = await fetch(`${baseUrl}/api/debug-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testType: 'fashion-salon'
      })
    });
    
    const fashionSalonResult = await fashionSalonResponse.json();
    
    if (fashionSalonResult.success) {
      console.log('✅ Fashion Salon Test - SUCCESS');
      console.log('📊 Summary:');
      console.log('  - Intent Detected:', fashionSalonResult.summary.intentDetected);
      console.log('  - Confidence:', fashionSalonResult.summary.confidence);
      console.log('  - Sections Detected:', fashionSalonResult.summary.sectionsDetected);
      console.log('  - Business Type:', fashionSalonResult.summary.businessType);
      console.log('  - IRL Components:', fashionSalonResult.summary.irlComponents);
      console.log('  - RAG Patterns Found:', fashionSalonResult.summary.ragPatternsFound);
      console.log('  - RAG Confidence:', fashionSalonResult.summary.ragConfidence);
      
      // Check for issues
      console.log('\n🔍 [TEST] Analysis:');
      if (fashionSalonResult.summary.businessType !== 'fashion salon') {
        console.log('❌ ISSUE: Business type incorrectly detected as:', fashionSalonResult.summary.businessType);
      } else {
        console.log('✅ Business type correctly detected as fashion salon');
      }
      
      if (fashionSalonResult.summary.sectionsDetected < 5) {
        console.log('❌ ISSUE: Too few sections detected:', fashionSalonResult.summary.sectionsDetected);
      } else {
        console.log('✅ Good number of sections detected');
      }
      
      if (fashionSalonResult.summary.confidence < 0.7) {
        console.log('❌ ISSUE: Low confidence in intent detection:', fashionSalonResult.summary.confidence);
      } else {
        console.log('✅ High confidence in intent detection');
      }
      
    } else {
      console.log('❌ Fashion Salon Test - FAILED');
      console.log('Error:', fashionSalonResult.error);
    }
  } catch (error) {
    console.log('❌ Fashion Salon Test - ERROR:', error.message);
  }
  
  // Test 2: Car Dealership Request
  console.log('\n🔍 [TEST] === TEST 2: CAR DEALERSHIP REQUEST ===');
  try {
    const carDealershipResponse = await fetch(`${baseUrl}/api/debug-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testType: 'car-dealership'
      })
    });
    
    const carDealershipResult = await carDealershipResponse.json();
    
    if (carDealershipResult.success) {
      console.log('✅ Car Dealership Test - SUCCESS');
      console.log('📊 Summary:');
      console.log('  - Intent Detected:', carDealershipResult.summary.intentDetected);
      console.log('  - Confidence:', carDealershipResult.summary.confidence);
      console.log('  - Sections Detected:', carDealershipResult.summary.sectionsDetected);
      console.log('  - Business Type:', carDealershipResult.summary.businessType);
      console.log('  - IRL Components:', carDealershipResult.summary.irlComponents);
      console.log('  - RAG Patterns Found:', carDealershipResult.summary.ragPatternsFound);
      console.log('  - RAG Confidence:', carDealershipResult.summary.ragConfidence);
      
      // Check for issues
      console.log('\n🔍 [TEST] Analysis:');
      if (carDealershipResult.summary.businessType !== 'car dealership') {
        console.log('❌ ISSUE: Business type incorrectly detected as:', carDealershipResult.summary.businessType);
      } else {
        console.log('✅ Business type correctly detected as car dealership');
      }
      
      if (carDealershipResult.summary.sectionsDetected < 8) {
        console.log('❌ ISSUE: Too few sections detected:', carDealershipResult.summary.sectionsDetected);
      } else {
        console.log('✅ Good number of sections detected');
      }
      
      if (carDealershipResult.summary.confidence < 0.7) {
        console.log('❌ ISSUE: Low confidence in intent detection:', carDealershipResult.summary.confidence);
      } else {
        console.log('✅ High confidence in intent detection');
      }
      
    } else {
      console.log('❌ Car Dealership Test - FAILED');
      console.log('Error:', carDealershipResult.error);
    }
  } catch (error) {
    console.log('❌ Car Dealership Test - ERROR:', error.message);
  }
  
  console.log('\n🔍 [TEST] === DEBUG TESTING COMPLETE ===');
}

// Run the test
testDebugRequest().catch(console.error); 