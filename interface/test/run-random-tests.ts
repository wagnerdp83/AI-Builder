import { generateAITestSuite } from './ai-test-generator';
import { runAITestSuite } from './ai-test-runner';

async function main() {
  try {
    // Generate AI-driven test cases
    const testCases = await generateAITestSuite(1);
    
    // Run the test suite
    await runAITestSuite(testCases);
    
    console.log('\n✨ Random test completed!');
  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

main(); 