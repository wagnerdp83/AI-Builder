import { generateRandomTestSuite } from './random-test-generator';
import { TestCase, TestResult, TestSuiteResult } from './types';
import { logTestActivity } from './logger';
import { processMistralUpdate } from './mistral-integration';

export async function runRandomTests(): Promise<TestSuiteResult> {
  const suiteId = `random-suite-${Date.now()}`;
  const startTime = Date.now();
  const results: TestResult[] = [];

  try {
    // Generate exactly 2 random test cases
    const testCases = await generateRandomTestSuite(2);
    
    // Run each test case
    for (const testCase of testCases) {
      logTestActivity(testCase.id, 'info', `Running random test with prompt: ${testCase.prompt}`);
      
      try {
        // Process the test case through Mistral
        const success = await processMistralUpdate(testCase);
        
        results.push({
          testId: testCase.id,
          success,
          duration: Date.now() - startTime,
          details: {
            prompt: testCase.prompt,
            expectedResult: testCase.expectedResult
          }
        });

        if (success) {
          logTestActivity(testCase.id, 'info', 'Test completed successfully');
        } else {
          logTestActivity(testCase.id, 'warn', 'Test completed with warnings');
        }
      } catch (err) {
        const error = err as Error;
        results.push({
          testId: testCase.id,
          success: false,
          duration: Date.now() - startTime,
          error: error.message || 'Unknown error occurred',
          details: {
            prompt: testCase.prompt,
            expectedResult: testCase.expectedResult
          }
        });

        logTestActivity(testCase.id, 'error', `Test failed: ${error.message || 'Unknown error occurred'}`);
      }
    }

    const suiteResult: TestSuiteResult = {
      suiteId,
      results,
      timestamp: new Date(),
      totalDuration: Date.now() - startTime
    };

    return suiteResult;
  } catch (err) {
    const error = err as Error;
    logTestActivity(suiteId, 'error', `Suite execution failed: ${error.message || 'Unknown error occurred'}`);
    throw error;
  }
}

// Simulate test execution (placeholder for actual implementation)
async function simulateTestExecution(testCase: TestCase): Promise<void> {
  // This is where you would integrate with your actual test execution logic
  // For now, we'll just simulate success
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  
  // Simulate random failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Random test failure for simulation purposes');
  }
} 