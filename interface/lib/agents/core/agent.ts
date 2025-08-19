// @ts-ignore
import { Mistral } from '@mistralai/mistralai';
import { AgentConfig, AgentResponse, MistralRequestPayload, ToolDecision } from '../types/agent.types';
import { ComponentDetector } from '../utils/component-detector';
import { getAvailableComponents, getAvailableSectionIds } from '../utils/component-utils';
import { handleMultipleImageUploads } from '../../image-handler';

const AGENT_CONFIG: AgentConfig = {
  model: 'codestral-2405',
  agentId: process.env.MISTRAL_AGENT_ID || 'ag:11271780:20250606:route-for-coding-generation:87879164',
  isSpecificAgent: !!process.env.MISTRAL_AGENT_ID,
};

const SYSTEM_PROMPT = `You are a super-fast AI assistant that functions as a project manager, selecting the right tool for the job. Your ONLY job is to analyze a user's request and decide which tool to use.

=== AVAILABLE TOOLS ===
1.  **frontmatter-update**: Use for modifying structured data (e.g., titles, subtitles, content, images) within a component's frontmatter array (like 'cards'). This is the PREFERRED tool for content updates.
    - Requires: 'filePath', 'arrayName', 'itemIndex', and an 'updates' object with the key-value pairs to change.
2.  **file-patch**: Use ONLY for simple, one-line text replacements in the HTML body of a component. Do NOT use this for frontmatter.
    - Requires: 'filePath', 'originalContent', 'newContent'.
3.  **generate-file**: Use for creating brand new components from a prompt. This is for when the user wants a new section that doesn't exist.
    - Requires: 'componentName' (can be a string for a single component or an array of strings for multiple) and a 'prompt' containing the user's instructions.

=== JSON RESPONSE STRUCTURE ===
Your response MUST be a single JSON object with a 'tool' and a nested 'instructions' object.
{
  "tool": "tool-name",
  "instructions": {
    "param1": "value1",
    "param2": "value2"
  }
}
For example, a 'file-patch' response MUST look like this:
{
  "tool": "file-patch",
  "instructions": {
    "filePath": "Component.astro",
    "originalContent": "<p>Old text</p>",
    "newContent": "<p>New text</p>"
  }
}
Do NOT return a flat JSON object. The parameters MUST be inside the 'instructions' object.

=== FILE-PATCH DEEP DIVE: A Guide to Perfect Styling Edits ===
When using the 'file-patch' tool for styling with Tailwind CSS, you must follow these principles for accuracy. Failure to do so results in project failure.

1.  **Analyze, Don't Assume**: A request like "center images and left-align text" has two distinct goals. You MUST create one 'file-patch' instruction for EACH goal. Do not try to solve both with a single, flawed change.

2.  **Inspect the HTML Structure**: Before suggesting a change, carefully analyze the provided component HTML. Understand the parent-child relationships. A change to a flex container (\`display: flex\`) affects its children. A change to a text element affects only that element.

3.  **Targeting is Key**:
    *   To center an element horizontally (like an image or a div), the best method depends on its parent. If the parent is a flex container, add 'justify-center' (for children in a row) or 'items-center' (for children in a column) to the PARENT's class list. If the element is a block-level element, adding 'mx-auto' to the ELEMENT's class list is effective. To center an image that is a child of a non-flex container, wrap it in a \`<div class="flex justify-center">...</div>\`.
    *   To change text alignment, apply 'text-left', 'text-center', or 'text-right' directly to the block or paragraph tag that contains the text.

4.  **\`originalContent\` Must Be FLAWLESS**: Your primary cause of failure is providing an \`originalContent\` that doesn't exactly match the file. It MUST be a PERFECT, character-for-character substring from the file.
    *   **THE GOLD STANDARD (Modifying classes)**: To be safe, ALWAYS include the entire \`class="..."\` attribute in your \`originalContent\` and \`newContent\`. This is the most robust way to avoid errors.
        *   \`originalContent: 'class="text-lg font-semibold mt-4"'\`
        *   \`newContent: 'class="text-lg font-semibold mt-4 text-center"'\`
    *   **ACCEPTABLE (If the entire class attribute is too long)**: You may use a smaller, but absolutely unique and exact, part of the line.
        *   \`originalContent: '<h3 class="text-lg font-semibold text-black mt-4">{product.name}</h3>'\`
        *   \`newContent: '<h3 class="text-lg font-semibold text-black mt-4 text-center">{product.name}</h3>'\`
    *   **ABSOLUTELY FORBIDDEN**: Do not guess, shorten, or hallucinate classes. Do not provide just a list of classes without the \`class="..."\` wrapper.

5.  **Think Atomically**: Do not try to solve multiple layout problems with one patch. If you need to change a flex-direction AND an alignment, create two separate, atomic patches. This is not optional.

=== CRITICAL RULES ===
1.  **ASTRO & TAILWIND**: This is an Astro project using Tailwind CSS. All styling changes MUST be done using Tailwind classes. DO NOT use inline 'style' attributes.
2.  **HANDLE COMPLEX EDITS**: If a user requests multiple distinct visual changes (e.g., "align images center AND align text left"), you MUST generate an array of \`file-patch\` instructions. Each instruction in the array must represent a single, atomic change.
3.  **MULTIPLE COMPONENTS**: If the user asks to create multiple components, provide an array of strings for the 'componentName' parameter.
4.  **CHOOSE THE RIGHT TOOL**: Use 'generate-file' for creating new components. Prioritize 'frontmatter-update' for any content changes that look like fields (title, subtitle, description, etc.).
5.  **USE THE UPLOADED IMAGE**: If an \`UPLOADED_IMAGE_PATH\` is provided, you MUST use it as the \`src\` for any new image tags.
6.  **PARSE THE REQUEST**: For 'frontmatter-update', accurately parse the user's request to identify which element in an array to update (e.g., "first block" means itemIndex: 0) and what the new key-value pairs are.
7.  **BE PRECISE**: Provide all required parameters for the chosen tool.
8.  **COMPONENT NAMING**: Use PascalCase for component names (e.g., LeadGeneration).
9.  **POSITION HANDLING**: The AI will automatically place new components at the end of the page.`;

export class Agent {
  private mistral: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    this.mistral = new Mistral({ apiKey });
  }

  async selectTool(
    prompt: string,
    disambiguation?: string,
    images?: File[],
    componentNames?: string[]
  ): Promise<ToolDecision> {
    console.log('\n=== [DEBUG] Mistral Agent (core/agent.ts): selectTool initiated ===');
    console.log(`[DEBUG] Prompt: "${prompt}"`);

    if (componentNames && componentNames.length > 0) {
      // Logic for bypassing detection remains the same...
      const toolDecision: ToolDecision = {
        tool: 'generate-file',
        confidence: 1.0,
        reasoning: `User requested to create ${componentNames.join(', ')}.`,
        instructions: {
          componentName: componentNames.length === 1 ? componentNames[0] : componentNames,
          prompt: prompt,
        },
      };
      // Assuming a validation/normalization step exists
      // @ts-ignore
      return this.validateAndNormalizeDecision(toolDecision);
    }

    const availableComponents = await getAvailableComponents();
    const availableSectionIds = await getAvailableSectionIds();
    let uploadedImagePaths: string[] = [];
    if (images && images.length > 0) {
      uploadedImagePaths = await handleMultipleImageUploads(images);
    }

    const component = disambiguation || await ComponentDetector.detectFromPrompt(prompt, availableComponents);
    const componentContent = component ? await ComponentDetector.readComponentContent(component) : '';

    let contextMessage = `AVAILABLE COMPONENTS: ${availableComponents.join(', ')}\nAVAILABLE SECTION IDS: ${availableSectionIds.join(', ')}\n`;
    if (component) {
      contextMessage += `TARGET COMPONENT: ${component}\nCOMPONENT CONTENT:\n${componentContent}\n`;
    }
    if (uploadedImagePaths.length > 0) {
      contextMessage += `\n\nUPLOADED_IMAGE_PATHS: ${JSON.stringify(uploadedImagePaths)}`;
    }

    const requestPayload: MistralRequestPayload = {
      model: AGENT_CONFIG.model,
      messages: [{
        role: 'user',
        content: `
${contextMessage}

USER REQUEST: "${prompt}"

${SYSTEM_PROMPT}

IMPORTANT: Your response MUST be a valid JSON object adhering to the structure specified in the "JSON RESPONSE STRUCTURE" section. Do not include any other text or explanation outside the JSON object.`
      }],
      temperature: 0.0,
      max_tokens: 1000
    };

    console.log('[DEBUG] Sending request to Mistral with old method...');
    
    try {
      const response = await this.mistral.chat.complete(requestPayload);
      const rawResponse = response.choices[0].message.content;

      console.log('[DEBUG] Raw Mistral Response:', rawResponse);

      if (!rawResponse || typeof rawResponse !== 'string') {
        throw new Error('Invalid response format from Mistral API');
      }

      const jsonMatch = rawResponse.match(/(\[[\s\S]*\]|{[\s\S]*})/);
      if (!jsonMatch) {
          throw new Error('No valid JSON object or array found in agent response');
      }

        const decision = JSON.parse(jsonMatch[0]);
        console.log('[DEBUG] Parsed JSON object from response:', decision);
        // @ts-ignore
        const validatedDecision = await this.validateAndNormalizeDecision(decision);
        console.log('[DEBUG] Tool decision validated and normalized:', validatedDecision);
        return validatedDecision;

    } catch (error) {
      console.error('Error in selectTool:', error);
        throw error;
    }
  }

  private async validateAndNormalizeDecision(decision: any): Promise<ToolDecision> {
    // Handle the case where the AI returns an array of instructions
    if (Array.isArray(decision)) {
      if (decision.length === 0) {
        throw new Error("AI returned an empty array of instructions.");
      }
      // Assuming all instructions in the array are for the same tool.
      const tool = decision[0].tool;
      if (!tool) {
        throw new Error("First instruction in array is missing a 'tool' property.");
      }
      
      const instructions = decision.map(d => {
        const { tool, ...rest } = d;
        // The executor expects the 'parameters' from the AI to be the instruction itself
        return d.parameters || rest;
      });

      return {
        tool,
        instructions,
        confidence: 1.0,
        reasoning: "Decision consolidated from an array of AI tool calls.",
      };
    }

    // Original logic for handling a single tool call object
    const tool = decision.tool;
    const instructions = decision.instructions || decision.parameters || decision.params; // Support 'params' key

    if (!tool || !instructions) {
      throw new Error("Invalid decision structure from AI: missing 'tool' or 'instructions'/'parameters'/'params'.");
    }

    // This makes the decision object consistent
    const normalizedDecision: ToolDecision = {
      tool,
      instructions,
      confidence: 1.0,
      reasoning: 'Decision from AI model',
    };

    return normalizedDecision;
  }
}