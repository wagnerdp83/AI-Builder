import { TestLog, TestResult } from './types';

// In-memory log storage
const logs: TestLog[] = [];

// Log test activities
export function logTestActivity(
  testId: string,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
): void {
  const log: TestLog = {
    timestamp: new Date(),
    level,
    testId,
    message,
    data
  };

  logs.push(log);
  
  // Console output with simplified formatting
  switch (level) {
    case 'error':
      console.error(`🔴 ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`🟡 ${message}`, data || '');
      break;
    case 'info':
      console.log(`🔵 ${message}`, data || '');
      break;
    case 'debug':
      console.debug(`⚪ ${message}`, data || '');
      break;
  }
}

// Generate test summary report
export function generateTestSummary(results: TestResult[]): string {
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  
  // Handle optional duration
  const testsWithDuration = results.filter(r => typeof r.duration === 'number');
  const avgDuration = testsWithDuration.length > 0
    ? testsWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / testsWithDuration.length
    : 0;
  
  const successRate = Math.round((successfulTests / totalTests) * 100);

  return `
TEST SUMMARY
------------
Total Tests: ${totalTests}
Successful: ${successfulTests}
Failed: ${failedTests}
Success Rate: ${successRate}%
Average Duration: ${Math.round(avgDuration)}ms

FAILED TESTS
-----------
${results
  .filter(r => !r.success)
  .map(r => `❌ ${r.error}`)
  .join('\n') || 'None'}

TOP PERFORMING TESTS
------------------
${results
  .filter(r => r.success && typeof r.duration === 'number')
  .sort((a, b) => (a.duration || 0) - (b.duration || 0))
  .slice(0, 3)
  .map(r => `✅ Test completed in ${r.duration}ms`)
  .join('\n') || 'None'}
`;
} 