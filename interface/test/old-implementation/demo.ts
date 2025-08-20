#!/usr/bin/env node

/**
 * Demo Script for AI Style Change Testing System
 * 
 * This script demonstrates the testing system with a simple example.
 * It runs a single test to show how the system works.
 */

import { TestRunner } from './test-runner';
import { TestExecutor } from './test-executor';
import { TEST_SUGGESTIONS } from './suggestions';
import { logTestActivity } from './logger';

async function runDemo(): Promise<void> {
  console.log('🎬 AI Style Change Testing System - DEMO');
  console.log('=' .repeat(50));
  console.log('This demo will show you how the testing system works');
  console.log('by running a single test scenario.\n');

  try {
    // Initialize the test runner
    const runner = new TestRunner();
    await runner.initialize();

    console.log('🎯 DEMO: Running Hero Headline Update Test');
    console.log('This test will:');
    console.log('1. Connect to Mistral API');
    console.log('2. Analyze the Hero component');
    console.log('3. Generate tool decision for text update');
    console.log('4. Execute the change via the main system');
    console.log('5. Handle any errors with recovery\n');

    // Get the first test (Hero headline update)
    const demoTest = TEST_SUGGESTIONS[0];
    console.log(`📝 Test: ${demoTest.description}`);
    console.log(`🎯 Component: ${demoTest.component}`);
    console.log(`⚙️  Operation: ${demoTest.operation}`);
    console.log(`🔧 Instructions: ${JSON.stringify(demoTest.instructions, null, 2)}\n`);

    // Run the demo test
    console.log('🚀 Executing demo test...\n');
    const executor = new TestExecutor();
    const result = await executor.executeTest(demoTest);

    // Display results
    console.log('\n' + '='.repeat(50));
    console.log('📊 DEMO RESULTS');
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('✅ DEMO TEST PASSED!');
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`🎯 Component: ${result.component}`);
      console.log(`⚙️  Operation: ${result.operation}`);
      
      if (result.mistralDecision) {
        console.log(`🤖 Mistral Confidence: ${result.mistralDecision.confidence}`);
        console.log(`💭 Reasoning: ${result.mistralDecision.reasoning}`);
      }
      
      console.log('\n🎉 The system successfully:');
      console.log('  ✓ Connected to Mistral API');
      console.log('  ✓ Analyzed the component structure');
      console.log('  ✓ Generated appropriate tool decision');
      console.log('  ✓ Executed the style change');
      console.log('  ✓ Completed without errors');
      
    } else {
      console.log('❌ DEMO TEST FAILED');
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`🚫 Error: ${result.error}`);
      console.log(`🔄 Retry Count: ${result.retryCount}`);
      
      if (result.cursorPrompts && result.cursorPrompts.length > 0) {
        console.log('\n📋 CURSOR PROMPTS GENERATED:');
        console.log('The system generated manual fix instructions:');
        result.cursorPrompts.forEach((prompt, index) => {
          console.log(`\n--- Cursor Prompt ${index + 1} ---`);
          console.log(prompt.substring(0, 200) + '...');
        });
        console.log('\n💡 Check the full prompts in the logs for detailed fix instructions.');
      }
      
      console.log('\n🔧 This demonstrates the error recovery system:');
      console.log('  ✓ Automatic retry attempts');
      console.log('  ✓ Error analysis and recovery');
      console.log('  ✓ Cursor prompt generation for manual fixes');
    }

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Run full test suite: npm test');
    console.log('2. Run specific component tests: node test-runner.js component Hero');
    console.log('3. Run all tests: npm run test:all');
    console.log('4. View available tests: npm run list');
    console.log('5. Export results: npm run test:export');

    console.log('\n📚 For more information, see README.md');
    console.log('🎯 Ready to automate your style testing!');

  } catch (error) {
    console.error('\n❌ DEMO FAILED:', error);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check your Mistral API key is configured');
    console.log('2. Ensure the Astro dev server is running (localhost:4321)');
    console.log('3. Verify component files exist in rendering/src/components/');
    console.log('4. Check network connectivity');
    
    process.exit(1);
  }
}

// Quick system check demo
async function runSystemCheck(): Promise<void> {
  console.log('🔍 SYSTEM CHECK DEMO');
  console.log('=' .repeat(30));
  
  try {
    const runner = new TestRunner();
    const status = runner.getStatus();
    
    console.log('📊 System Status:');
    console.log(JSON.stringify(status, null, 2));
    
    console.log('\n✅ System check completed');
    console.log('The testing system is ready to use!');
    
  } catch (error) {
    console.error('❌ System check failed:', error);
  }
}

// Show available test scenarios
function showTestScenarios(): void {
  console.log('📋 DEMO: Available Test Scenarios');
  console.log('=' .repeat(40));
  
  console.log('\n🎯 Default Test Suite (5 scenarios):');
  TEST_SUGGESTIONS.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.id}`);
    console.log(`   📝 ${test.description}`);
    console.log(`   🎯 Component: ${test.component}`);
    console.log(`   ⚙️  Operation: ${test.operation}`);
    console.log(`   ⭐ Priority: ${test.priority}`);
  });
  
  console.log('\n💡 These tests demonstrate:');
  console.log('  • Text content updates (headlines, titles)');
  console.log('  • Style modifications (colors, backgrounds)');
  console.log('  • Component-specific changes');
  console.log('  • Error handling and recovery');
  console.log('  • Cursor integration for manual fixes');
}

// Main demo function
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const demoType = args[0] || 'full';
  
  switch (demoType) {
    case 'check':
      await runSystemCheck();
      break;
    case 'scenarios':
      showTestScenarios();
      break;
    case 'full':
    default:
      await runDemo();
      break;
  }
}

// CLI help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🎬 AI Style Testing System Demo');
  console.log('\nUsage: node demo.js [type]');
  console.log('\nDemo Types:');
  console.log('  full (default)  - Run complete demo with test execution');
  console.log('  check          - Quick system status check');
  console.log('  scenarios      - Show available test scenarios');
  console.log('\nExamples:');
  console.log('  node demo.js');
  console.log('  node demo.js check');
  console.log('  node demo.js scenarios');
  process.exit(0);
}

// Run the demo
if (require.main === module) {
  main().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo, runSystemCheck, showTestScenarios }; 