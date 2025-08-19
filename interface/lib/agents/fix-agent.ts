import { promises as fs } from 'fs';
import { AstroValidator } from '../validation/astro-validator';
import { getRenderingDir } from '../utils/directory';

/**
 * A dedicated agent for fixing errors in existing files.
 */
export class FixAgent {
  /**
   * Reads a file, validates and fixes its content, and writes it back.
   * @param relativeFilePath The path to the file relative to the project root (e.g., 'rendering/src/components/Footer.astro').
   * @returns A success or error message.
   */
  static async fixFile(relativeFilePath: string): Promise<{ success: boolean; message: string }> {
    console.log(`[FixAgent] Initiating fix for: ${relativeFilePath}`);
    const absolutePath = getRenderingDir(relativeFilePath.replace('rendering/', ''));

    try {
      // 1. Read the broken file content
      const originalCode = await fs.readFile(absolutePath, 'utf-8');

      // 2. Use the AstroValidator to get the corrected code
      // The validator will handle the entire "validate -> fix -> re-validate" loop.
      const fixedCode = await AstroValidator.validateAndFix(originalCode);

      // 3. Write the corrected code back to the file
      await fs.writeFile(absolutePath, fixedCode, 'utf-8');

      const successMsg = `Successfully validated and fixed ${relativeFilePath}`;
      console.log(`[FixAgent] ${successMsg}`);
      return { success: true, message: successMsg };

    } catch (error) {
      const errorMsg = `[FixAgent] Failed to fix ${relativeFilePath}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }
} 