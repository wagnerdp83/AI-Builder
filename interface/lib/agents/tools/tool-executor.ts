import { AgentResponse, ToolDecision, Instruction } from '../types/agent.types';
import { executeGenerateFile, GenerateFileInstructions } from '../../tools/generateFileHandler';
import { executeFrontmatterUpdate, FrontmatterUpdateInstructions } from '../../tools/frontmatter-updater';
import { AstroValidator } from '../../validation/AstroValidator';
import { promises as fs } from 'fs';
import { getComponentsDir, getRelativeComponentPath } from '../../utils/directory';
import path from 'path';

export class ToolExecutor {
  static async executeDecision(decision: ToolDecision, prompt?: string): Promise<AgentResponse> {
    const { tool, instructions } = decision;
    console.log(`\n⚙️ [DEBUG] ToolExecutor: Attempting to execute tool: ${tool}`);
    console.log('[DEBUG] ToolExecutor: Received instructions:', instructions);

    try {
      let result;
      const instructionsArray = Array.isArray(instructions) ? instructions : [instructions];

      // console.log(`[DEBUG] BREAKPOINT: Bypassing execution for tool: '${tool}'.`);
      // return {
      //   success: true,
      //   tool,
      //   reasoning: `[DEBUG] SKIPPED EXECUTION of ${tool}. Reasoning: ${decision.reasoning}`,
      //   confidence: decision.confidence,
      //   result: { "status": "Execution skipped for debugging" }
      // };

      
      switch (tool) {
        case 'frontmatter-update':
          result = [];
          for (const instruction of instructionsArray) {
            // @ts-ignore - The validator ensures this is the correct type
            const res = await this.executeFrontmatterUpdate(instruction as FrontmatterUpdateInstructions);
            result.push(res);
          }
          break;
        case 'file-patch':
          result = [];
          for (const instruction of instructionsArray) {
            const res = await this.executeFilePatch(instruction);
            result.push(res);
          }
          break;
        case 'generate-file':
           // generate-file typically receives a single instruction object, but this handles it either way
          result = [];
          for (const instruction of instructionsArray) {
            const res = await this.executeFileGeneration(instruction);
            (result as any[]).push(res);
          }
          break;
        default:
          throw new Error(`Unknown tool selected: '${tool}'`);
      }

      return {
        success: true,
        tool,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        result,
      };
      

    } catch (error) {
      console.error(`❌ Error executing tool '${tool}':`, error);
      return {
        success: false,
        tool,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        error: error instanceof Error ? error.message : 'Unknown execution error',
      };
    }
  }

  private static async executeFilePatch(instructions: Instruction) {
    const { filePath, originalContent, newContent } = instructions;
    
    if (!filePath || originalContent == null || newContent == null) {
      throw new Error("Invalid instructions for 'file-patch' tool. Requires 'filePath', 'originalContent', and 'newContent'.");
    }

    // A.I. sometimes returns a full path, sometimes just the filename.
    // This logic handles both cases to create a valid, absolute path.
    let componentPath;
    if (filePath.includes('src/components')) {
      componentPath = path.join(process.cwd(), 'rendering', filePath);
    } else {
      componentPath = getComponentsDir(filePath);
    }

    console.log(`[DEBUG] Constructed path for file patch: ${componentPath}`);

    const fileContent = await fs.readFile(componentPath, 'utf-8');
    let patchedContent: string;

    // Smart fix for the specific lazy class-add pattern from the AI.
    // This is safer than changing the AI prompt and isolates the fix to this tool.
    if (originalContent === 'class="' && newContent.startsWith('class="')) {
      console.log('[DEBUG] Applying smart fix for class attribute patch.');
      const classToAdd = newContent.substring('class="'.length).replace(/"/g, ''); // Get just the class, e.g., 'bg-blue-100'
      
      // Replace the first occurrence of `class="` with `class="new-class ` ensuring a space.
      patchedContent = fileContent.replace('class="', `class="${classToAdd} `);
    } else {
      // Fallback to the original, simple replacement logic for all other cases.
      if (fileContent.includes(originalContent)) {
        patchedContent = fileContent.replaceAll(originalContent, newContent);
      } else {
        throw new Error(`Simple patch failed for ${filePath}. The 'originalContent' provided by the AI was not found in the file.`);
      }
    }

    // ALWAYS validate the component after any modification.
    await fs.writeFile(componentPath, patchedContent);
    const relativePath = getRelativeComponentPath(componentPath);
    await AstroValidator.validate(relativePath);

    return { success: true, file: filePath, message: 'Patch applied and validated successfully.' };
  }

  private static async executeFrontmatterUpdate(instructions: FrontmatterUpdateInstructions) {
    // The validation is now handled by the tool itself, which is more robust.
    // This wrapper simply passes the instructions along.
    return executeFrontmatterUpdate(instructions);
  }

  private static async executeFileGeneration(instructions: Instruction) {
    const { componentName, prompt, mode } = instructions;
    
    if (!componentName || !prompt) {
      throw new Error("Invalid instructions for 'generate-file' tool. Requires 'componentName' and 'prompt'.");
    }

    let componentNames = (Array.isArray(componentName) ? componentName : [componentName]).map(
        name => name.charAt(0).toUpperCase() + name.slice(1)
    );

    // Sort to ensure logical page order: headers first, footers last
    componentNames.sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const isMenuA = /\b(menu|nav|header)\b/i.test(aLower);
        const isMenuB = /\b(menu|nav|header)\b/i.test(bLower);
        const isFooterA = /\b(footer)\b/i.test(aLower);
        const isFooterB = /\b(footer)\b/i.test(bLower);

        if (isMenuA && !isMenuB) return -1;
        if (!isMenuA && isMenuB) return 1;
        if (isFooterA && !isFooterB) return 1;
        if (!isFooterA && isFooterB) return -1;
        
        return 0; // maintain original relative order for other components
    });
    
    // DETERMINE PIPELINE MODE BASED ON MODE PARAMETER OR NUMBER OF COMPONENTS
    if (mode === 'generic') {
      // GENERIC PIPELINE: Multiple components without dataset examples
      console.log(`[TRACE][ToolExecutor] Generic mode detected, using GENERIC pipeline`);
      const genericInstructions: GenerateFileInstructions = {
        componentName: componentNames[0], // Keep for compatibility
        componentNames: componentNames, // Array for generic mode
        generationPrompt: prompt,
        originalPrompt: prompt,
        mode: 'generic' // CRITICAL: Set mode to generic
      };
      
      const result = await executeGenerateFile(genericInstructions);
      return result;
    } else if (componentNames.length > 1) {
      // ABSTRACT PIPELINE: Multiple components with dataset examples
      console.log(`[TRACE][ToolExecutor] Multiple components detected (${componentNames.length}), using ABSTRACT pipeline`);
      const abstractInstructions: GenerateFileInstructions = {
        componentName: componentNames[0], // Keep for compatibility
        componentNames: componentNames, // Array for abstract mode
        generationPrompt: prompt,
        originalPrompt: prompt,
        mode: 'abstract' // CRITICAL: Set mode to abstract for multiple components
      };
      
      const result = await executeGenerateFile(abstractInstructions);
      return result;
    } else {
      // GENERIC PIPELINE FOR SINGLE COMPONENTS: Use generic pipeline for single components to get post-processing
      console.log(`[TRACE][ToolExecutor] Single component detected, using GENERIC pipeline for post-processing`);
      const genericInstructions: GenerateFileInstructions = {
        componentName: componentNames[0],
        componentNames: componentNames, // Array for generic mode
        generationPrompt: prompt,
        originalPrompt: prompt,
        mode: 'generic' // Use generic mode for post-processing
      };
      
      const result = await executeGenerateFile(genericInstructions);
      return result;
    }
  }
} 