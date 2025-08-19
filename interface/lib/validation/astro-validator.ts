import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Mistral } from '@mistralai/mistralai';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

const MAX_RETRIES = 2; // Maximum number of times to try and fix the code.

/**
 * A self-contained service to validate and attempt to auto-correct generated Astro code.
 */
export class AstroValidator {

  /**
   * Validates a string of Astro code by attempting to compile it.
   * If it fails, it uses an AI to try and fix the error, then re-validates.
   *
   * @param code The raw Astro code string to validate.
   * @param renderingDir The absolute path to the '/rendering' directory.
   * @returns The validated and potentially corrected code.
   * @throws An error if the code is invalid and cannot be fixed within the retry limit.
   */
  static async validateAndFix(code: string, renderingDir: string): Promise<string> {
    let currentCode = code;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);

      if (isValid) {
        console.log('✅ Astro code validation successful.');
        return currentCode; // Success
      }

      console.warn(`⚠️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying with AI-powered correction...`);
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error(`❌ AI failed to fix the Astro code after ${MAX_RETRIES} attempts.`);
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    // This line should be unreachable, but it satisfies TypeScript's need for a return path.
    throw new Error('Exited validation loop unexpectedly.');
  }

  /**
   * Writes code to a temporary file and runs `astro check` to validate it.
   * This is the most reliable way to check for syntax and import errors.
   */
  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `validation-test-${Date.now()}.astro`);

    try {
      await fs.writeFile(tmpFile, code);

      // Execute `astro check` from within the /rendering directory.
      const command = `npx --no-install astro check`;
      
      return await new Promise((resolve) => {
        exec(command, { cwd: renderingDir }, (err, stdout, stderr) => {
          if (err || stderr) {
            // Astro check found an error.
            const errorMessage = (stderr || stdout).trim();
            resolve({ isValid: false, error: errorMessage });
          } else {
            // Success, no errors.
            resolve({ isValid: true, error: null });
          }
        });
      });
    } finally {
      // Clean up the temporary file.
      await fs.unlink(tmpFile).catch(() => console.error(`Failed to delete temp file: ${tmpFile}`));
    }
  }

  /**
   * Sends the broken code and error message to an AI to get a fix.
   */
  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer. You will be given a piece of Astro code that has an error, along with the error message from the compiler. Your ONLY job is to fix the code to resolve the error. Respond with ONLY the corrected, complete Astro code. Do not add any explanations, markdown, or apologies.`;

    const userMessage = `The following Astro code produced an error. Please fix it.

Error Message:
---
${error}
---

Broken Code:
---
${code}
---
`;
    
    const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
      });
      
      const fixedCode = response.choices[0].message.content;

      if (!fixedCode) {
        throw new Error('AI failed to return any code for the fix.');
      }
      
      // Clean the response to ensure it's just raw code
      return fixedCode.replace(/```(astro)?/g, '').trim();
  }
} 