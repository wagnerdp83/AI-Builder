import { TestRequest, TestResult, TestSuiteResult } from './types';
import { TestExecutor } from './test-executor';
import { logTestActivity, saveTestSuiteResult, generateTestSummary } from './logger';
import { TEST_SUGGESTIONS, EXTENDED_TEST_SUGGESTIONS } from './suggestions';
import { generateImprovementSuggestions } from './cursor-integration';
import { TEST_CONFIG } from './config';
import { colorize } from './colors';

export class TestSuite {
  private executor: TestExecutor;
  private suiteId: string;
  private isRunning: boolean = false;
  private currentTestIndex: number = 0;
  private results: TestResult[] = [];

  constructor(suiteId?: string) {
    this.executor = new TestExecutor();
    this.suiteId = suiteId || `suite-${Date.now()}`;
  }

  // Run all default test suggestions
  async runDefaultTests(): Promise<TestSuiteResult> {
    return this.runTests(TEST_SUGGESTIONS);
  }

  // Run extended test suite
  async runExtendedTests(): Promise<TestSuiteResult> {
    const allTests = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS];
    return this.runTests(allTests);
  }

  // Run specific tests
  async runTests(tests: TestRequest[]): Promise<TestSuiteResult> {
    this.isRunning = true;
    this.currentTestIndex = 0;
    this.results = [];

    const startTime = Date.now();
    
    console.log(`\n🚀 STARTING TEST SUITE: ${this.suiteId}`);
    console.log(`📋 Total tests to run: ${tests.length}`);
    console.log(`⚙️  Configuration: ${JSON.stringify(this.getTestConfig(), null, 2)}`);

    try {
      // Execute tests sequentially
      for (let i = 0; i < tests.length; i++) {
        if (!this.isRunning) {
          console.log('❌ Test suite stopped by user');
          break;
        }

        this.currentTestIndex = i;
        const test = tests[i];
        
        console.log(`\n--- Test ${i + 1}/${tests.length}: ${test.id} ---`);
        console.log(`📝 ${test.description}`);
        console.log(`🎯 Component: ${test.component} | Operation: ${test.operation}`);

        const result = await this.executor.executeTest(test);
        this.results.push(result);

        // Log immediate result
        if (result.success) {
          console.log(`✅ PASSED (${result.duration}ms)`);
        } else {
          console.log(`❌ FAILED (${result.duration}ms): ${result.error}`);
        }

        // Add delay between tests to avoid overwhelming the system
        if (i < tests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Generate suite results
      const suiteResult = this.generateSuiteResult(totalDuration);
      
      // Save results
      await saveTestSuiteResult(suiteResult);
      
      // Display summary
      this.displaySummary(suiteResult);

      return suiteResult;

    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Run tests by component
  async runTestsForComponent(componentName: string): Promise<TestSuiteResult> {
    const componentTests = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS]
      .filter(test => test.component === componentName);
    
    if (componentTests.length === 0) {
      throw new Error(`No tests found for component: ${componentName}`);
    }

    console.log(`🎯 Running ${componentTests.length} tests for component: ${componentName}`);
    return this.runTests(componentTests);
  }

  // Run tests by operation type
  async runTestsByOperation(operation: string): Promise<TestSuiteResult> {
    const operationTests = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS]
      .filter(test => test.operation === operation);
    
    if (operationTests.length === 0) {
      throw new Error(`No tests found for operation: ${operation}`);
    }

    console.log(`⚙️  Running ${operationTests.length} tests for operation: ${operation}`);
    return this.runTests(operationTests);
  }

  // Run priority tests only
  async runPriorityTests(maxPriority: number = 5): Promise<TestSuiteResult> {
    const priorityTests = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS]
      .filter(test => test.priority <= maxPriority)
      .sort((a, b) => a.priority - b.priority);
    
    console.log(`⭐ Running ${priorityTests.length} priority tests (priority <= ${maxPriority})`);
    return this.runTests(priorityTests);
  }

  // Run a single test by ID
  async runSingleTest(testId: string): Promise<TestResult> {
    const test = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS]
      .find(t => t.id === testId);
    
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    console.log(`🎯 Running single test: ${testId}`);
    return this.executor.executeTest(test);
  }

  // Stop the test suite
  stopSuite(): void {
    this.isRunning = false;
    console.log('🛑 Stopping test suite...');
  }

  // Generate suite results
  private generateSuiteResult(totalDuration: number): TestSuiteResult {
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;
    
    const summary = generateTestSummary(this.results);
    const recommendations = this.generateRecommendations();

    return {
      suiteId: this.suiteId,
      testCount: this.results.length,
      successCount,
      failureCount,
      totalDuration,
      results: this.results,
      summary,
      recommendations
    };
  }

  // Generate recommendations based on results
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => !r.success);
    
    if (failedTests.length === 0) {
      recommendations.push('🎉 All tests passed! The system is working correctly.');
      recommendations.push('✨ Consider adding more complex test scenarios.');
    } else {
      recommendations.push(`❌ ${failedTests.length} tests failed. Review failed tests for patterns.`);
      
      // Analyze failure patterns
      const failuresByComponent = failedTests.reduce((acc, test) => {
        acc[test.component] = (acc[test.component] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const failuresByOperation = failedTests.reduce((acc, test) => {
        acc[test.operation] = (acc[test.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Component-specific recommendations
      Object.entries(failuresByComponent).forEach(([component, count]) => {
        if (count > 1) {
          recommendations.push(`🔧 Component ${component} has ${count} failed tests - review component structure`);
          recommendations.push(...generateImprovementSuggestions(failedTests, component as any));
        }
      });

      // Operation-specific recommendations
      Object.entries(failuresByOperation).forEach(([operation, count]) => {
        if (count > 1) {
          recommendations.push(`⚙️  Operation ${operation} has ${count} failures - review operation logic`);
        }
      });

      // Retry recommendations
      const retriedTests = this.results.filter(r => r.retryCount > 0);
      if (retriedTests.length > 0) {
        recommendations.push(`🔄 ${retriedTests.length} tests required retries - consider improving reliability`);
      }

      // Cursor prompt recommendations
      const testsWithCursorPrompts = this.results.filter(r => r.cursorPrompts && r.cursorPrompts.length > 0);
      if (testsWithCursorPrompts.length > 0) {
        recommendations.push(`📋 ${testsWithCursorPrompts.length} tests generated Cursor prompts - manual review needed`);
      }
    }

    return recommendations;
  }

  // Display summary
  private displaySummary(suiteResult: TestSuiteResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(colorize.header('TEST SUITE COMPLETE'));
    console.log('='.repeat(60));
    
    console.log(colorize.info(`Suite ID: ${suiteResult.suiteId}`));
    console.log(colorize.info(`Total Tests: ${suiteResult.testCount}`));
    console.log(colorize.testPass(`Passed: ${suiteResult.successCount}`));
    console.log(colorize.testFail(`Failed: ${suiteResult.failureCount}`));
    
    const successRate = Math.round((suiteResult.successCount / suiteResult.testCount) * 100);
    const successRateText = `Success Rate: ${successRate}%`;
    console.log(successRate >= 80 
      ? colorize.success(successRateText)
      : successRate >= 50 
        ? colorize.warning(successRateText)
        : colorize.error(successRateText)
    );
    
    console.log(colorize.info(`⏱️  Total Duration: ${Math.round(suiteResult.totalDuration / 1000)}s`));
    console.log(colorize.info(`📊 Average Test Duration: ${Math.round(suiteResult.totalDuration / suiteResult.testCount)}ms`));

    console.log('\n' + colorize.subHeader('RECOMMENDATIONS'));
    suiteResult.recommendations.forEach(rec => console.log(colorize.info(`  ${rec}`)));

    if (suiteResult.failureCount > 0) {
      console.log('\n' + colorize.subHeader('FAILED TESTS'));
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(colorize.error(`  ${r.testId}: ${r.error}`));
          if (r.cursorPrompts && r.cursorPrompts.length > 0) {
            console.log(colorize.warning(`    📋 Cursor prompts generated: ${r.cursorPrompts.length}`));
          }
        });
    }

    console.log('\n' + colorize.subHeader('NEXT STEPS'));
    console.log(colorize.info('  1. Review failed tests and fix component issues'));
    console.log(colorize.info('  2. Check generated Cursor prompts for manual fixes'));
    console.log(colorize.info('  3. Re-run failed tests after fixes'));
    console.log(colorize.info('  4. Consider expanding test coverage'));
    console.log('='.repeat(60));
  }

  // Get current status
  getStatus(): object {
    return {
      suiteId: this.suiteId,
      isRunning: this.isRunning,
      currentTestIndex: this.currentTestIndex,
      totalTests: this.results.length + (this.isRunning ? 1 : 0),
      completedTests: this.results.length,
      successfulTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      currentTest: this.executor.getCurrentTest()?.testId || null
    };
  }

  // Get test configuration
  private getTestConfig(): object {
    return {
      maxRetries: TEST_CONFIG.test.maxRetries,
      retryDelay: TEST_CONFIG.test.retryDelay,
      errorRecovery: TEST_CONFIG.test.enableErrorRecovery,
      cursorPrompts: TEST_CONFIG.test.enableCursorPrompts
    };
  }

  // Get all results
  getResults(): TestResult[] {
    return [...this.results];
  }

  // Get failed tests
  getFailedTests(): TestResult[] {
    return this.results.filter(r => !r.success);
  }

  // Get successful tests
  getSuccessfulTests(): TestResult[] {
    return this.results.filter(r => r.success);
  }
} 