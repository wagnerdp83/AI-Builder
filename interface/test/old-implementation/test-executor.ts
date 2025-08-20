import { TestRequest, TestResult, ToolDecision, RecoveryAction } from './types';
import { TestMistralClient } from './mistral-client';
import { logTestActivity, saveTestResult } from './logger';
import { readComponentContent, createComponentBackup, restoreComponentFromBackup } from './component-reader';
import { generateCursorPrompt } from './cursor-integration';
import { TEST_CONFIG } from './config';
import { RefinementLoop } from './refinement-loop';
import { ApiEndpoints } from './api-endpoints';
import { colorize } from './colors';

export class TestExecutor {
  private mistralClient: TestMistralClient;
  private currentTest?: TestResult;
  private refinementLoop: RefinementLoop;
  private apiEndpoints: ApiEndpoints;

  constructor() {
    this.mistralClient = new TestMistralClient();
    this.refinementLoop = new RefinementLoop();
    this.apiEndpoints = new ApiEndpoints();
  }

  // Execute a single test
  async executeTest(testRequest: TestRequest): Promise<TestResult> {
    if (!this.validateTest(testRequest)) {
      console.log(colorize.error(`Invalid test request: ${testRequest.id}`));
      const now = new Date();
      return {
      testId: testRequest.id,
      success: false,
        error: 'Invalid test configuration',
      duration: 0,
        startTime: now,
        endTime: now,
      operation: testRequest.operation,
      component: testRequest.component,
      originalRequest: testRequest,
      retryCount: 0,
        logs: [],
        cursorPrompts: []
      };
    }

    console.log(colorize.header(`EXECUTING TEST: ${testRequest.id}`));
    console.log(colorize.info(`Component: ${testRequest.component}`));
    console.log(colorize.info(`Operation: ${testRequest.operation}`));
    console.log(colorize.info(`Description: ${testRequest.description}`));
    console.log('-'.repeat(40));

    const startTime = new Date();
    
    try {
      this.currentTest = {
        testId: testRequest.id,
        success: false,
        startTime,
        endTime: startTime,
        duration: 0,
        operation: testRequest.operation,
        component: testRequest.component,
        originalRequest: testRequest,
        retryCount: 0,
        logs: [],
        cursorPrompts: []
      };

      logTestActivity(testRequest.id, 'info', `Starting test: ${testRequest.description}`);
      logTestActivity(testRequest.id, 'info', 'Test configuration', testRequest);

      // Step 1: Test Mistral connection
      const isConnected = await this.mistralClient.testConnection(testRequest.id);
      if (!isConnected) {
        throw new Error('Mistral API connection failed');
      }

      // Step 2: Read component content
      const componentContent = await readComponentContent(
        testRequest.component, 
        testRequest.id
      );

      // Step 3: Create backup
      const backupPath = await createComponentBackup(testRequest.component, testRequest.id);
      logTestActivity(testRequest.id, 'info', `Backup created: ${backupPath}`);

      // Step 4: Generate tool decision from Mistral
      const toolDecision = await this.mistralClient.generateToolDecision(
        testRequest.description,
        componentContent,
        testRequest.id
      );

      this.currentTest.mistralDecision = toolDecision;
      logTestActivity(testRequest.id, 'info', 'Tool decision generated', toolDecision);

      // Step 5: Execute the tool decision
      const executionResult = await this.executeToolDecision(
        toolDecision,
        testRequest.id
      );

      this.currentTest.executionResult = executionResult;

      if (executionResult.success) {
        this.currentTest.success = true;
        logTestActivity(testRequest.id, 'info', 'Test completed successfully');
        console.log(colorize.testPass(`Test ${testRequest.id} completed successfully`));
        console.log(colorize.success(`Duration: ${Date.now() - startTime.getTime()}ms`));
      } else {
        // Instead of throwing error, enter refinement loop
        const refinedResult = await this.refinementLoop.refineAndRetry(
          testRequest,
          {
            ...this.currentTest,
            error: executionResult.error,
            executionResult
          }
        );

        // Merge refined result with original test result
        Object.assign(this.currentTest, refinedResult);
        console.log(colorize.testFail(`Test ${testRequest.id} failed`));
        console.log(colorize.error(`Error: ${executionResult.error}`));
        console.log(colorize.warning(`Duration: ${Date.now() - startTime.getTime()}ms`));
        }

      // Finalize test result
      this.currentTest.endTime = new Date();
      this.currentTest.duration = this.currentTest.endTime.getTime() - this.currentTest.startTime.getTime();
      this.currentTest.logs = this.currentTest.logs.concat(this.getTestLogs(testRequest.id));

      // Save test result
      await saveTestResult(this.currentTest);
      
      const result = { ...this.currentTest };
      this.currentTest = undefined;
      return result;
    } catch (error: unknown) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(colorize.testFail(`Test ${testRequest.id} failed with exception`));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(colorize.error(`Error: ${errorMessage}`));
      console.log(colorize.warning(`Duration: ${duration}ms`));
      
      const failedResult: TestResult = {
        testId: testRequest.id,
        success: false,
        error: errorMessage,
        duration,
        startTime,
        endTime,
        operation: testRequest.operation,
        component: testRequest.component,
        originalRequest: testRequest,
        retryCount: 0,
        logs: this.getTestLogs(testRequest.id),
        cursorPrompts: []
      };

      // Save test result
      await saveTestResult(failedResult);
      
      // Log final outcome
      const outcomeMessage = this.generateOutcomeMessage(failedResult);
      logTestActivity(
        testRequest.id, 
        'error',
        outcomeMessage,
        undefined
      );

      this.currentTest = undefined;
      return failedResult;
    }
  }

  // Execute tool decision by calling the appropriate API endpoint
  private async executeToolDecision(decision: ToolDecision, testId: string): Promise<any> {
    logTestActivity(testId, 'info', 'Executing tool decision', decision);

    try {
      // Handle prop-based updates
      if (decision.instructions.usePropUpdate) {
        return this.apiEndpoints.updateProp(
          decision.instructions.component as any,
          decision.instructions.propName || '',
          decision.instructions.newContent,
          testId
        );
      }

      // Handle state-based updates
      if (decision.instructions.useStateUpdate) {
        return this.apiEndpoints.updateState(
          decision.instructions.component as any,
          decision.instructions.stateName || '',
          decision.instructions.newContent,
          testId
        );
      }

      // Handle partial matches
      if (decision.instructions.usePartialMatch) {
        return this.apiEndpoints.updateWithPartialMatch(
          decision.instructions.component as any,
          decision.instructions.elementSelector || '',
          decision.instructions.newContent || '',
          decision.instructions.similarityThreshold || 0.8,
          testId
        );
      }

      // Convert test prompt to the format expected by the main system
      const prompt = this.buildPromptFromDecision(decision);
      
      // Call the main system's edit API
      const response = await fetch(`http://localhost:3000/api/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'Tool execution result', result);

      return result;
    } catch (error) {
      logTestActivity(testId, 'error', 'Tool execution failed', error);
      throw error;
    }
  }

  // Build prompt from tool decision
  private buildPromptFromDecision(decision: ToolDecision): string {
    const { instructions } = decision;
    
    // Format the prompt similar to user requests
    if (decision.tool === 'style-update') {
      return `${instructions.component}: change ${instructions.elementSelector} to ${instructions.newContent}`;
    } else if (decision.tool === 'text-edit') {
      return `${instructions.component}: update ${instructions.elementSelector} to "${instructions.newContent}"`;
    } else if (decision.tool === 'component-edit') {
      return `${instructions.component}: ${instructions.operation} ${instructions.elementSelector} with ${instructions.newContent}`;
    }

    // Fallback
    return `${instructions.component}: ${instructions.newContent}`;
  }

  // Attempt error recovery
  private async attemptErrorRecovery(
    testRequest: TestRequest,
    testResult: TestResult
  ): Promise<any> {
    testResult.retryCount++;
    logTestActivity(testRequest.id, 'info', `Attempting error recovery (retry ${testResult.retryCount})`);

    try {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.test.retryDelay));

      // Get fresh component content
      const componentContent = await readComponentContent(
        testRequest.component,
        testRequest.id,
        false // Don't use cache
      );

      // Request error recovery from Mistral
      const recoveryDecision = await this.mistralClient.requestErrorRecovery(
        testRequest.description,
        testResult.error || 'Unknown error',
        componentContent,
        testRequest.id
      );

      // Execute recovery decision
      const recoveryResult = await this.executeToolDecision(
        recoveryDecision,
        testRequest.id
      );

      // Generate cursor prompt if recovery fails and cursor prompts are enabled
      if (!recoveryResult.success && TEST_CONFIG.test.enableCursorPrompts) {
        const cursorPrompt = generateCursorPrompt(
          testRequest,
          testResult.error || 'Unknown error',
          componentContent
        );
        
        testResult.cursorPrompts = testResult.cursorPrompts || [];
        testResult.cursorPrompts.push(cursorPrompt);
        
        logTestActivity(testRequest.id, 'info', 'Cursor prompt generated', cursorPrompt);
      }

      return recoveryResult;
    } catch (recoveryError) {
      logTestActivity(testRequest.id, 'error', 'Error recovery failed', recoveryError);
      return { success: false, error: recoveryError };
    }
  }

  // Get test logs
  private getTestLogs(testId: string): string[] {
    // This would integrate with the logger to get specific test logs
    return [`Test ${testId} execution completed`];
  }

  // Validate test before execution
  private validateTest(testRequest: TestRequest): boolean {
    if (!testRequest.id || !testRequest.component || !testRequest.operation) {
      return false;
    }

    if (!TEST_CONFIG.components.includes(testRequest.component)) {
      return false;
    }

    if (!['style-update', 'text-edit', 'component-edit'].includes(testRequest.operation)) {
      return false;
    }

    return true;
  }

  // Get current test status
  getCurrentTest(): TestResult | undefined {
    return this.currentTest;
  }

  // Force stop current test
  async stopCurrentTest(): Promise<void> {
    if (this.currentTest) {
      this.currentTest.error = 'Test stopped by user';
      this.currentTest.endTime = new Date();
      this.currentTest.duration = this.currentTest.endTime.getTime() - this.currentTest.startTime.getTime();
      
      logTestActivity(this.currentTest.testId, 'warn', 'Test stopped by user');
      await saveTestResult(this.currentTest);
      
      this.currentTest = undefined;
    }
  }

  // Get executor statistics
  getStats(): object {
    return {
      mistralApiStats: this.mistralClient.getApiStats(),
      currentTest: this.currentTest?.testId || null,
      config: {
        maxRetries: TEST_CONFIG.test.maxRetries,
        retryDelay: TEST_CONFIG.test.retryDelay,
        errorRecoveryEnabled: TEST_CONFIG.test.enableErrorRecovery,
        cursorPromptsEnabled: TEST_CONFIG.test.enableCursorPrompts
      }
    };
  }

  private generateOutcomeMessage(result: TestResult): string {
    if (result.success) {
      if (result.executionResult?.type === 'alternatives') {
        return 'Alternative suggestions generated successfully';
      }
      return 'Test completed successfully';
    }

    const baseMessage = result.error || 'Test encountered issues';
    if (result.retryCount > 0) {
      return `${baseMessage} (after ${result.retryCount} refinement attempts)`;
    }
    return baseMessage;
  }
} 