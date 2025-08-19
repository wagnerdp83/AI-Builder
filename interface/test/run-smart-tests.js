#!/usr/bin/env node

// Test runner for smart functionality tests
const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Smart Functionality Tests...\n');

const tests = [
  {
    name: 'Smart Image Extractor',
    file: 'test-smart-image-extractor.js',
    description: 'Tests image field detection vs text content'
  },
  {
    name: 'Avatar Replacement',
    file: 'test-avatar-replacement.js', 
    description: 'Tests Unsplash avatar URL replacement with local avatars'
  },
  {
    name: 'Layout Parsing',
    file: 'test-layout-parsing.js',
    description: 'Tests user layout requirement parsing'
  },
  {
    name: 'Generic No Vision',
    file: 'test-generic-no-vision.js',
    description: 'Tests that Generic pipeline never calls vision models'
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log('─'.repeat(50));
    
    try {
      const testPath = path.join(__dirname, test.file);
      execSync(`node "${testPath}"`, { 
        stdio: 'inherit',
        cwd: __dirname 
      });
      console.log(`✅ ${test.name}: PASSED`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Smart functionality is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
}

runTests().catch(console.error); 