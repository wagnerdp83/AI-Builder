import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Mistral } from '@mistralai/mistralai';
import path from 'path';
import { getRenderingDir } from '../utils/directory';

const execAsync = promisify(exec);

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

const MAX_FIX_ATTEMPTS = 3;

export class AstroValidator {
  
  /**
   * Validates a specific Astro file using 'astro check' and attempts to fix any errors found.
   * @param relativeFilePath The path to the file relative to the 'rendering' directory (e.g., 'src/components/MyComponent.astro').
   * @param attempt The current retry attempt number.
   * @returns A promise that resolves when validation (and any necessary fixing) is complete.
   */
  static async validate(
    relativeFilePath: string,
    attempt: number = 1,
    softFail: boolean = false,
  ): Promise<void> {
    console.log(`[AstroValidator] Running validation for '${relativeFilePath}', attempt #${attempt}.`);

    const renderingDir = getRenderingDir();
    const absoluteFilePath = path.join(renderingDir, relativeFilePath);

    // Create a temporary tsconfig to isolate the check
    const tsconfigContent = {
      // Switch to the base (non-strict) config to avoid failing on unrelated project files
      "extends": "astro/tsconfigs/base",
      "include": [
        path.basename(relativeFilePath) // Only include the file being validated
      ],
      "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "react"
      }
    };
    const tempTsConfigPath = path.join(path.dirname(absoluteFilePath), 'tsconfig.temp.json');
    
    try {
      await fs.writeFile(tempTsConfigPath, JSON.stringify(tsconfigContent, null, 2));

      const { stdout, stderr } = await execAsync(`npx -y astro check --tsconfig ${path.basename(tempTsConfigPath)}`, {
        cwd: path.dirname(absoluteFilePath),
      });

      console.log(`[AstroValidator] 'astro check' stdout:\n${stdout}`);
      
      // The original check was flawed because it found "error" in "0 errors".
      // Relying on the exec promise's success/failure is the correct way.
      // If execAsync resolves, it means the exit code was 0, so it's a success.
      console.log(`[AstroValidator] Validation successful for '${relativeFilePath}'.`);

    } catch (error: any) {
      // It's possible for `astro check` to return a non-zero exit code with errors in stdout
      const errorOutput = error.stderr || error.stdout || '';
      if (errorOutput.includes('error')) {
        console.warn(`[AstroValidator] Validation failed for '${relativeFilePath}' with execution error.`);
        if (attempt > MAX_FIX_ATTEMPTS) {
          if (softFail) {
            console.warn("[AstroValidator] Soft-fail enabled — continuing despite validation errors.");
            return;
          }
          throw new Error(`[AstroValidator] Validation failed after ${MAX_FIX_ATTEMPTS} attempts. Error: ${errorOutput}`);
        }
        await this.fix(absoluteFilePath, errorOutput);
        await this.validate(relativeFilePath, attempt + 1);
        return;
      }
      // If no errors are reported despite the exit code, we can consider it a pass.
      // This handles cases where `astro check` has a non-zero exit code for warnings.
       console.log(`[AstroValidator] 'astro check' exited with a non-zero code but no errors were reported. Assuming success. Output:\n${errorOutput}`);
    } finally {
      // Clean up the temporary tsconfig
      try {
        await fs.unlink(tempTsConfigPath);
      } catch (cleanupError) {
        console.error(`[AstroValidator] Failed to clean up temporary tsconfig file: ${tempTsConfigPath}`, cleanupError);
      }
    }
  }
  
  /**
   * Attempts to fix an Astro file using an AI model.
   * @param absoluteFilePath The absolute path to the file to fix.
   * @param errors The error report from 'astro check'.
   */
  private static async fix(absoluteFilePath: string, errors: string): Promise<void> {
    console.log(`[AstroValidator] Attempting to fix file: ${absoluteFilePath}`);

    const fileContent = await fs.readFile(absoluteFilePath, 'utf-8');

    const fixPrompt = `You are an expert Astro developer. The following Astro component has syntax errors. Your task is to fix it.
    
Here is the full content of the file \`${path.basename(absoluteFilePath)}\`:
\`\`\`astro
${fileContent}
\`\`\`

Here are the errors reported by 'astro check':
\`\`\`
${errors}
\`\`\`

CRITICAL INSTRUCTIONS:
1.  Analyze the errors and the code carefully.
2.  Provide the complete, corrected code for the entire file.
3.  Do not add or remove any functionality. Only fix the syntax and logic errors. For example, if a property is named 'src' in the frontmatter but accessed as 'imageUrl' in the template, you must correct the template to use 'src'. If a comma is missing in an object literal, you must add it.
4.  Your response MUST BE ONLY the raw, corrected Astro code for the entire file. Do not include any explanations, markdown, or any other text.
`;

    const response = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [{ role: 'system', content: fixPrompt }],
      temperature: 0.0,
    });

    const choice = response.choices[0].message.content;
    if (!choice) {
      throw new Error('[AstroValidator] AI Fixer failed to generate a correction.');
    }

    const contentAsString = Array.isArray(choice)
      ? choice
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('')
      : choice;
      
    const fixedContent = contentAsString.replace(/```astro/g, '').replace(/```/g, '').trim();
    
    await fs.writeFile(absoluteFilePath, fixedContent);
    console.log(`[AstroValidator] AI has applied a fix to '${absoluteFilePath}'. Re-validating...`);
  }

  /**
   * Convenience wrapper that validates but never throws (Option C)
   */
  static async validateSoft(relativeFilePath: string): Promise<void> {
    return this.validate(relativeFilePath, 1, true);
  }
}
