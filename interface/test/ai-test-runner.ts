import { TestCase, TestResult, TestSuiteResult } from './types';
import { logTestActivity } from './logger';
import { validateWithLLM } from './llm-validator';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import * as colors from './colors';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

interface ComponentUpdate {
  originalCode: string;
  updatedCode: string;
  path: string;
}

interface MistralError extends Error {
  message: string;
}

/**
 * Creates a backup of a component file with timestamp
 */
async function backupComponent(componentPath: string, testId: string): Promise<string> {
  const timestamp = Date.now();
  const backupPath = `${componentPath}.backup-${testId}-${timestamp}`;
  
  try {
    await fs.copyFile(componentPath, backupPath);
    logTestActivity(testId, 'info', `Created backup at ${backupPath}`);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create backup: ${error}`);
  }
}

/**
 * Restores a component from its backup
 */
async function restoreFromBackup(backupPath: string, componentPath: string, testId: string): Promise<void> {
  try {
    await fs.copyFile(backupPath, componentPath);
    logTestActivity(testId, 'info', `Restored from backup ${backupPath}`);
  } catch (error) {
    throw new Error(`Failed to restore from backup: ${error}`);
  }
}

/**
 * Runs an AI-driven test case
 */
export async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  let backupPath: string | null = null;
  
  try {
    // Step 1: Log test start
    logTestActivity(testCase.id, 'info', `Running test with prompt: ${testCase.prompt}`);
    logTestActivity(testCase.id, 'info', `Processing test case: ${testCase.prompt}`);
    
    // Step 2: Get component code and create backup
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', `${testCase.expectedResult.section}.astro`);
    const componentCode = await fs.readFile(componentPath, 'utf-8');
    
    // Create backup before making any changes
    backupPath = await backupComponent(componentPath, testCase.id);
    logTestActivity(testCase.id, 'info', `Created backup at ${backupPath}`);
    
    // Step 3: Call Codestral to update the code
    const updatedCode = await callCodestral(`Update this component according to the following request: ${testCase.prompt}\n\nCurrent code:\n${componentCode}`);
    
    if (!updatedCode) {
      throw new Error('Failed to get updated code from Codestral');
    }

    // Step 4: Validate the changes
    const validation = await validateChanges(testCase, componentCode, updatedCode);
    if (!validation.isValid) {
      throw new Error(`Invalid changes: ${validation.reason}`);
    }

    // Step 5: Show code differences
    logTestActivity(testCase.id, 'info', '\nCode changes:');
    showCodeDifferences(componentCode, updatedCode);

    // Step 6: Apply changes
    await fs.writeFile(componentPath, updatedCode);
    logTestActivity(testCase.id, 'info', `Changes applied to ${componentPath}`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log success
    logTestActivity(testCase.id, 'info', 'Test completed successfully', {
      id: testCase.id,
      success: true,
      duration,
      expectedResult: testCase.expectedResult
    });

    return {
      success: true,
      duration,
      changes: [{
        type: testCase.expectedResult.type,
        property: testCase.expectedResult.changes[0].property,
        oldValue: componentCode,
        newValue: updatedCode,
        selector: testCase.expectedResult.changes[0].selector,
        appliedAt: new Date().toISOString()
      }],
      validation: {
        passed: true,
        issues: []
      }
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log error
    if (error instanceof Error) {
      logTestActivity(testCase.id, 'error', `Test failed: ${error.message}`);
    } else {
      logTestActivity(testCase.id, 'error', 'Test failed with unknown error');
    }

    // Try to restore from backup if available
    if (backupPath) {
      try {
        const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', `${testCase.expectedResult.section}.astro`);
        await restoreFromBackup(backupPath, componentPath, testCase.id);
        logTestActivity(testCase.id, 'info', 'Successfully restored from backup');
      } catch (restoreError) {
        logTestActivity(testCase.id, 'error', `Failed to restore from backup: ${restoreError}`);
      }
    }

    return {
      success: false,
      duration,
      error: {
        code: 'TEST_FAILURE',
        message: error instanceof Error ? error.message : 'Unknown error',
        context: { testId: testCase.id }
      },
      validation: {
        passed: false,
        issues: [error instanceof Error ? error.message : 'Unknown error']
      }
    };
  }
}

async function callCodestral(prompt: string): Promise<string | null> {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not found in environment variables');
    }

    const mistral = new Mistral({ apiKey });
    console.log('\n🤖 Calling Codestral API...');
    console.log('Prompt:', prompt);

    const response = await mistral.chat.complete({
      model: 'codestral-2405',
      messages: [
        {
          role: 'system',
          content: `You are an expert code editor. Your task is to update the provided code according to the user's request.

IMPORTANT RULES:
1. Return ONLY the complete updated code
2. Do not include any explanations or comments
3. Make sure to preserve all imports, types, and structure
4. Only change what was specifically requested
5. Return the ENTIRE file content, not just the changed parts
6. Make sure to include ALL original code that wasn't changed
7. The response should be valid TypeScript/JavaScript/Astro code that can be saved directly to a file
8. DO NOT add any additional text before or after the code
9. The response should start with "---" and end with "</div>"

Example request: "update button text from 'Submit' to 'Send'"
Example response:
---
interface Props {
  buttonText: string;
}

const {
  buttonText = "Send"  // Changed from "Submit"
} = Astro.props;
---

<div>
  <button>{buttonText}</button>
</div>`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.0,
      maxTokens: 4096
    });

    console.log('\n📝 Received response from Codestral');
    
    const updatedCode = response.choices[0]?.message?.content;
    if (!updatedCode || typeof updatedCode !== 'string') {
      throw new Error('No code received from Codestral');
    }

    // Verify the response is actual code
    if (!updatedCode.includes('---') || !updatedCode.includes('</div>')) {
      throw new Error('Invalid code received from Codestral');
    }

    return updatedCode;
  } catch (error) {
    const e = error as MistralError;
    console.error('Codestral API error:', e.message);
    return null;
  }
}

function showCodeDifferences(originalCode: string, updatedCode: string) {
  const originalLines = originalCode.split('\n');
  const updatedLines = updatedCode.split('\n');
  
  let changes = false;
  console.log('\nChanges detected:');
  console.log('================\n');
  
  for (let i = 0; i < Math.max(originalLines.length, updatedLines.length); i++) {
    const originalLine = originalLines[i] || '';
    const updatedLine = updatedLines[i] || '';
    
    if (originalLine !== updatedLine) {
      changes = true;
      console.log(`Line ${i + 1}:`);
      console.log(colors.removed(`  - ${originalLine}`));
      console.log(colors.added(`  + ${updatedLine}\n`));
    }
  }
  
  if (!changes) {
    console.log('No changes were detected in the code.');
  }
}

async function validateChanges(testCase: TestCase, originalCode: string, updatedCode: string) {
  // Compare the changes against the expected result
  const { section, type, changes } = testCase.expectedResult;
  const expectedChange = changes[0]; // Get the first change
  
  // Basic validation - check if the code actually changed
  if (originalCode === updatedCode) {
    return {
      isValid: false,
      reason: 'No changes were made to the code.'
    };
  }

  // For content changes, check if the new value is present
  if (type === 'content' && expectedChange.value) {
    if (!updatedCode.includes(expectedChange.value)) {
      return {
        isValid: false,
        reason: `Expected value "${expectedChange.value}" not found in updated code.`
      };
    }
  }

  return {
    isValid: true,
    reason: 'Changes match the requested update.'
  };
}

export async function runAITestSuite(testCases: TestCase[]): Promise<TestSuiteResult> {
  const suiteId = `ai-suite-${Date.now()}`;
  const startTime = Date.now();
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);

    // Print test summary
    console.log('\n\nTEST SUMMARY');
    console.log('============');
    console.log('Test ID:', testCase.id);
    console.log('Success:', result.success ? '✅' : '❌');
    console.log('Duration:', result.duration + 'ms');
    console.log('Component:', testCase.expectedResult.section);
    console.log('Type:', testCase.expectedResult.type);
    
    if (testCase.expectedResult.changes.length > 0) {
      const change = testCase.expectedResult.changes[0];
      console.log('Property:', change.property);
      console.log('Value:', change.value);
    }
    
    if (!result.success && result.error) {
      console.log('Error:', colors.error(result.error.message));
    }
  }

  return {
    suiteId,
    results,
    startTime: new Date(startTime),
    endTime: new Date(),
    totalDuration: Date.now() - startTime
  };
} 