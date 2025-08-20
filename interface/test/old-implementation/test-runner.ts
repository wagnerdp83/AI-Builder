#!/usr/bin/env node

import { TestSuite } from './test-suite';
import { TestExecutor } from './test-executor';
import { TEST_SUGGESTIONS, EXTENDED_TEST_SUGGESTIONS, getRandomTestSuggestion } from './suggestions';
import { logTestActivity, exportLogs, clearLogs } from './logger';
import { clearComponentCache } from './component-reader';
import { TEST_CONFIG } from './config';
import { ComponentName } from './types';

export class TestRunner {
  private testSuite: TestSuite;
  private isInitialized: boolean = false;

  constructor() {
    this.testSuite = new TestSuite();
  }

  // Initialize the test runner
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing AI Style Change Test System');
    console.log('='.repeat(50));
    
    // Check environment
    this.checkEnvironment();
    
    // Clear previous logs and cache
    clearLogs();
    clearComponentCache();
    
    this.isInitialized = true;
    console.log('✅ Test runner initialized successfully\n');
  }

  // Check environment configuration
  private checkEnvironment(): void {
    console.log('🔍 Checking environment configuration...');
    
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  MISTRAL_API_KEY not found in environment variables');
      console.warn('   Using default API key from config');
    } else {
      console.log(`✅ Mistral API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    }

    const agentId = process.env.MISTRAL_AGENT_ID;
    if (agentId) {
      console.log(`✅ Agent ID: ${agentId}`);
    } else {
      console.log(`✅ Using default Agent ID: ${TEST_CONFIG.mistral.agentId}`);
    }

    console.log(`✅ Model: ${TEST_CONFIG.mistral.model}`);
    console.log(`✅ Available Components: ${TEST_CONFIG.components.length}`);
    console.log(`✅ Default Tests: ${TEST_SUGGESTIONS.length}`);
    console.log(`✅ Extended Tests: ${EXTENDED_TEST_SUGGESTIONS.length}`);
  }

  // Run all default tests (5 main suggestions)
  async runDefaultTests(): Promise<void> {
    await this.initialize();
    
    console.log('🎯 Running Default Test Suite (5 main tests)');
    console.log('This will test the core style change functionality\n');
    
    try {
      const results = await this.testSuite.runDefaultTests();
      this.displayResults(results);
    } catch (error) {
      console.error('❌ Default test suite failed:', error);
      throw error;
    }
  }

  // Run extended test suite
  async runExtendedTests(): Promise<void> {
    await this.initialize();
    
    console.log('🎯 Running Extended Test Suite (all tests)');
    console.log('This will run comprehensive tests across all components\n');
    
    try {
      const results = await this.testSuite.runExtendedTests();
      this.displayResults(results);
    } catch (error) {
      console.error('❌ Extended test suite failed:', error);
      throw error;
    }
  }

  // Run tests for specific component
  async runComponentTests(component: ComponentName): Promise<void> {
    await this.initialize();
    
    console.log(`🎯 Running Tests for Component: ${component}`);
    
    try {
      const results = await this.testSuite.runTestsForComponent(component);
      this.displayResults(results);
    } catch (error) {
      console.error(`❌ Component tests failed for ${component}:`, error);
      throw error;
    }
  }

  // Run tests by operation type
  async runOperationTests(operation: 'style-update' | 'text-edit' | 'component-edit'): Promise<void> {
    await this.initialize();
    
    console.log(`🎯 Running Tests for Operation: ${operation}`);
    
    try {
      const results = await this.testSuite.runTestsByOperation(operation);
      this.displayResults(results);
    } catch (error) {
      console.error(`❌ Operation tests failed for ${operation}:`, error);
      throw error;
    }
  }

  // Run a single random test
  async runRandomTest(): Promise<void> {
    await this.initialize();
    
    const randomTest = getRandomTestSuggestion();
    console.log(`🎲 Running Random Test: ${randomTest.id}`);
    console.log(`📝 ${randomTest.description}\n`);
    
    try {
      const executor = new TestExecutor();
      const result = await executor.executeTest(randomTest);
      
      if (result.success) {
        console.log(`✅ Random test PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ Random test FAILED (${result.duration}ms): ${result.error}`);
        
        if (result.cursorPrompts && result.cursorPrompts.length > 0) {
          console.log('\n📋 Cursor prompts generated:');
          result.cursorPrompts.forEach((prompt, index) => {
            console.log(`\n--- Prompt ${index + 1} ---`);
            console.log(prompt);
          });
        }
      }
    } catch (error) {
      console.error('❌ Random test execution failed:', error);
      throw error;
    }
  }

  // Run interactive test selection
  async runInteractiveMode(): Promise<void> {
    await this.initialize();
    
    console.log('🎮 Interactive Test Mode');
    console.log('Choose from the following options:');
    console.log('1. Run default tests (5 main tests)');
    console.log('2. Run extended tests (all tests)');
    console.log('3. Run random test');
    console.log('4. Run tests by component');
    console.log('5. Run tests by operation');
    console.log('6. List available tests');
    console.log('7. Export logs');
    console.log('8. Exit');
    
    // This would integrate with a proper CLI library for interactive selection
    // For now, we'll just run default tests
    console.log('\n🎯 Running default tests...');
    await this.runDefaultTests();
  }

  // List all available tests
  listTests(): void {
    console.log('📋 Available Tests:');
    console.log('\n=== DEFAULT TESTS ===');
    TEST_SUGGESTIONS.forEach((test, index) => {
      console.log(`${index + 1}. ${test.id}: ${test.description}`);
      console.log(`   Component: ${test.component} | Operation: ${test.operation} | Priority: ${test.priority}`);
    });
    
    console.log('\n=== EXTENDED TESTS ===');
    EXTENDED_TEST_SUGGESTIONS.forEach((test, index) => {
      console.log(`${index + 1}. ${test.id}: ${test.description}`);
      console.log(`   Component: ${test.component} | Operation: ${test.operation} | Priority: ${test.priority}`);
    });
    
    console.log(`\nTotal: ${TEST_SUGGESTIONS.length + EXTENDED_TEST_SUGGESTIONS.length} tests available`);
  }

  // Export all logs
  async exportAllLogs(format: 'json' | 'csv' | 'txt' = 'json'): Promise<string> {
    await this.initialize();
    
    console.log(`📄 Exporting logs in ${format.toUpperCase()} format...`);
    try {
      const filepath = await exportLogs(format);
      console.log(`✅ Logs exported successfully to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to export logs:', error);
      throw error;
    }
  }

  // Display test results
  private displayResults(results: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(results.summary);
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.recommendations.forEach((rec: string) => console.log(`  ${rec}`));
    }
  }

  // Get system status
  getStatus(): object {
    return {
      initialized: this.isInitialized,
      testSuiteStatus: this.testSuite.getStatus(),
      config: TEST_CONFIG,
      availableTests: {
        default: TEST_SUGGESTIONS.length,
        extended: EXTENDED_TEST_SUGGESTIONS.length,
        total: TEST_SUGGESTIONS.length + EXTENDED_TEST_SUGGESTIONS.length
      }
    };
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test runner...');
    clearLogs();
    clearComponentCache();
    console.log('✅ Cleanup completed');
  }
}

// CLI Interface
export async function runCLI(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const runner = new TestRunner();

  try {
    switch (command) {
      case 'default':
      case 'run':
        await runner.runDefaultTests();
        break;
        
      case 'extended':
      case 'all':
        await runner.runExtendedTests();
        break;
        
      case 'random':
        await runner.runRandomTest();
        break;
        
      case 'component':
        const component = args[1] as ComponentName;
        if (!component) {
          console.error('❌ Component name required. Usage: component <ComponentName>');
          process.exit(1);
        }
        await runner.runComponentTests(component);
        break;
        
      case 'operation':
        const operation = args[1] as 'style-update' | 'text-edit' | 'component-edit';
        if (!operation) {
          console.error('❌ Operation type required. Usage: operation <style-update|text-edit|component-edit>');
          process.exit(1);
        }
        await runner.runOperationTests(operation);
        break;
        
      case 'list':
        runner.listTests();
        break;
        
      case 'export':
        const format = (args[1] as 'json' | 'csv' | 'txt') || 'json';
        await runner.exportAllLogs(format);
        break;
        
      case 'interactive':
        await runner.runInteractiveMode();
        break;
        
      case 'status':
        console.log(JSON.stringify(runner.getStatus(), null, 2));
        break;
        
      default:
        console.log('🤖 AI Style Change Testing System');
        console.log('Usage: node test-runner.js <command> [options]');
        console.log('\nCommands:');
        console.log('  default, run     - Run default test suite (5 main tests)');
        console.log('  extended, all    - Run extended test suite (all tests)');
        console.log('  random           - Run a single random test');
        console.log('  component <name> - Run tests for specific component');
        console.log('  operation <type> - Run tests for specific operation type');
        console.log('  list             - List all available tests');
        console.log('  export [format]  - Export logs (json|csv|txt)');
        console.log('  interactive      - Run in interactive mode');
        console.log('  status           - Show system status');
        console.log('\nExamples:');
        console.log('  node test-runner.js default');
        console.log('  node test-runner.js component Hero');
        console.log('  node test-runner.js operation style-update');
        console.log('  node test-runner.js export csv');
        break;
    }
  } catch (error) {
    console.error('❌ Command execution failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Auto-run if called directly
if (require.main === module) {
  runCLI();
} 