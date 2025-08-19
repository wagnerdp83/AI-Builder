import { parsePrompt } from './prompt-processor';
import { buildPrompt } from './prompt-builder';
import { generateDiff, colors } from './diff-generator';
import * as fs from 'fs/promises';
import * as path from 'path';
import MistralClient from '@mistralai/mistralai';
import * as dotenv from 'dotenv';

// Load environment variables and initialize API client
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
  throw new Error('MISTRAL_API_KEY is not set in the .env file.');
}
const client = new MistralClient(apiKey);

// Path to the components directory
const componentsDir = path.resolve(__dirname, '../../rendering/src/components');

// Log file to store test results
const logFile = path.resolve(__dirname, 'edit-test-log.json');

interface TestLog {
  timestamp: string;
  prompt: string;
  parsed: ReturnType<typeof parsePrompt>;
  fullPrompt: string | null;
  diff: string | null;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Fetches the source code of a component.
 * @param componentName - The name of the component (e.g., "Hero").
 * @returns The source code as a string.
 */
async function getComponentCode(componentName: string): Promise<string> {
  const componentFile = `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}.astro`;
  const componentPath = path.join(componentsDir, componentFile);
  try {
    return await fs.readFile(componentPath, 'utf-8');
  } catch (error) {
    throw new Error(`Component not found at ${componentPath}`);
  }
}

/**
 * Runs a single edit test.
 * @param prompt - The user prompt to test.
 */
export async function runEditTest(prompt: string): Promise<void> {
  const log: TestLog = {
    timestamp: new Date().toISOString(),
    prompt,
    parsed: null,
    fullPrompt: null,
    diff: null,
    status: 'success',
  };

  try {
    const parsed = parsePrompt(prompt);
    log.parsed = parsed;

    if (!parsed) {
      throw new Error('Failed to parse the prompt.');
    }

    const originalCode = await getComponentCode(parsed.component);
    const fullPrompt = buildPrompt(parsed.action, originalCode);
    log.fullPrompt = fullPrompt;
    
    // 4. Call the real Codestral API
    console.log('Calling Codestral API... (This may take a moment)');
    const updatedCode = await client.chat({
      model: 'codestral-latest',
      messages: [{ role: 'user', content: fullPrompt }],
    }).then((response: any) => {
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content.replace(/```(astro|html|javascript)?\\n?/g, '').replace(/\\n?```/g, '').trim();
      }
      throw new Error('Received an empty response from Codestral.');
    });

    const diff = generateDiff(originalCode, updatedCode);
    log.diff = diff;

    logTestResult(prompt, parsed, fullPrompt, diff);

  } catch (error) {
    log.status = 'error';
    log.error = error instanceof Error ? error.message : String(error);
    console.error(`Error during test for prompt: "${prompt}"`, error);
  }

  const logs = await fs.readFile(logFile, 'utf-8').then(JSON.parse).catch(() => []);
  logs.push(log);
  await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
}

function logTestResult(prompt: string, parsed: any, fullPrompt: string, diff: string) {
  console.log('='.repeat(50));
  console.log(`Test Run for: "${prompt}"`);
  console.log('-'.repeat(50));
  
  console.log('--- Code Diff ---');
  if (diff.includes(colors.added) || diff.includes(colors.removed)) {
    console.log(diff);
  } else {
    console.log('No changes detected.');
  }
  console.log('-'.repeat(50) + '\\n');
}

// Example usage:
// runEditTest('edit hero headline to The new era of web design');
// runEditTest('update contact button background colour to theme colour'); 