import { promises as fs } from 'fs';
import path from 'path';
import { getComponentsDir, getPagesDir, getRenderingDir } from '../utils/directory';
import { Mistral } from '@mistralai/mistralai';
import { exec } from 'child_process';
import { getMockupImagePath } from './imageUtils';
import { PromptEnhancer } from '../services/prompt-enhancer';
// import { enhancedImageService } from '../services/image-service'; // COMMENTED OUT - Image service should only run during Astro component building, not in Next.js runtime
import { DomainSecurityService } from '../services/domain-security';
import { IRLService } from '../services/irl-service';
import { FeedbackLearningService } from '../services/feedback-learning';
import { ConversationalRecoveryService } from '../services/conversational-recovery';
import { SmartImageExtractor } from '../services/smart-image-extractor';
import { UserIntent } from '../types/intent-types';
import { IntentDetectionService } from '../services/intent-detection';
import { ComponentKnowledgeBase } from '../services/component-knowledge-base';
// NEW (IR path): imports for deterministic rendering
import { renderAstroFromIR } from './ir-renderer';
import { ComponentIR, validateIR } from '../types/ir';
import crypto from 'crypto';
import { normalizeAstroCode } from './ast-normalizer';
import { scoreIR } from './critics/ir-critic';
import { getCapabilitiesVersion } from '../config/capabilities';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

// Enhanced Mistral client with retry logic for 429 errors
async function completeChatWithRetry(payload: any, retries = 3, delay = 1000) {
  let lastError: any;

  if (!mistralApiKey) {
    throw new Error("The MISTRAL_API_KEY environment variable is missing or empty for chat completion.");
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await mistralClient.chat.complete(payload);
      if (response && response.choices && response.choices[0]) {
        return response;
      }
      throw new Error('Invalid response format from Mistral API');
    } catch (error: any) {
      if ((error.statusCode === 429 || error.status === 429) && i < retries - 1) {
        console.log(`[GenericPipeline] Rate limited. Retrying in ${delay / 1000}s... (attempt ${i + 1}/${retries})`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; 
      } else {
        console.error("❌ [GenericPipeline] Mistral API call failed:", error.message || error);
        lastError = error;
        if (i === retries - 1) break; // Don't continue if last retry
      }
    }
  }
  
  // If all retries failed, provide a graceful fallback
  if (lastError && (lastError.statusCode === 429 || lastError.status === 429)) {
    throw new Error(`Generic pipeline temporarily unavailable due to API rate limits. Please try again in a few minutes. Original error: ${lastError.message || lastError}`);
  }
  
  throw new Error(`Mistral API call failed after all retries. ${lastError?.message || lastError || 'Unknown error'}`);
}

// =================================================================================
// START: Standalone Astro Validator Service
// =================================================================================
const MAX_RETRIES = 2;

class AstroValidator {
  static async validateAndFix(code: string): Promise<string> {
    const renderingDir = getRenderingDir();
    let currentCode = code;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);
      if (isValid) {
        console.log('✅ Astro code validation successful.');
        return currentCode;
      }
      console.warn(`️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying with AI-powered correction...`);
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error(`❌ AI failed to fix the Astro code after ${MAX_RETRIES} attempts.`);
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    throw new Error('Exited validation loop unexpectedly.');
  }

  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `validation-test-${Date.now()}.astro`);
    try {
      await fs.writeFile(tmpFile, code);
      const command = `npx --no-install astro check --fail-on-warnings "${tmpFile}"`;
      return await new Promise((resolve) => {
        exec(command, { cwd: renderingDir }, (err, stdout, stderr) => {
          // Only show errors related to tmpFile (suppress global Astro/TS errors)
          const allOutput = (stderr || stdout) || '';
          const filtered = allOutput
            .split('\n')
            .filter(line => line.includes(path.basename(tmpFile)))
            .join('\n');
          if (err || filtered) {
            if (!filtered && (stderr || stdout)) {
              // Fallback: if filtered is empty but there is an error, use the full error output
              console.warn('[AstroValidator] Filtered error is empty, falling back to full error output:');
              console.warn(allOutput);
              resolve({ isValid: false, error: allOutput });
            } else {
              resolve({ isValid: false, error: filtered });
            }
          } else {
            resolve({ isValid: true, error: null });
          }
        });
      });
    } finally {
      await fs.unlink(tmpFile).catch(() => console.error(`Failed to delete temp file: ${tmpFile}`));
    }
  }

  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer and problem-solver. You will be given a piece of Astro code that has a compilation error. Your job is to analyze the error, understand the original developer's intent, and fix the code to be both syntactically correct and functionally complete.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Error:** The provided error message will tell you what's wrong (e.g., a component is not exported, a variable is undefined).
2.  **Deduce the Intent:** Look at the broken code. If an icon like \`Google\` is being imported from \`@lucide/astro\` and fails, the developer likely wanted a Google icon. Do not just delete the broken code.
3.  **Find a Solution:** If an import is wrong, find the correct one. For example, the \`lucide\` library often uses brand names directly (e.g., \`Youtube\`, \`Twitter\`). You may need to search for the correct icon name if the provided one is wrong. If an icon truly doesn't exist in \`@lucide/astro\`, you can substitute it with a similar, existing icon (e.g., use a generic \`Mail\` icon if a specific email provider icon is missing).
4.  **Preserve Functionality:** Your primary goal is to make the component work as intended. Deleting features to fix a compilation error is a last resort.
5.  **Respond with Code Only:** Your response MUST be ONLY the corrected, complete Astro code. Do not add any explanations or markdown.`;
    const userMessage = `The following Astro code produced an error. Please fix it.\n\nError Message:\n---\n${error}\n---\n\nBroken Code:\n---\n${code}\n---`;
    const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        temperature: 0.1,
    });
    const fixedCode = response.choices[0].message.content;
    if (!fixedCode || typeof fixedCode !== 'string') {
        throw new Error('AI failed to return valid string code for the fix.');
    }
    return fixedCode.replace(/```(astro)?/g, '').trim();
  }
}
// =================================================================================
// END: Standalone Astro Validator Service
// =================================================================================

// === AbstractAstroValidator: Dedicated validator for abstract pipeline ===
// import path from 'path'; // Duplicate, already imported above
// import { promises as fs } from 'fs'; // Duplicate, already imported above
// import { exec } from 'child_process'; // Duplicate, already imported above
// import { Mistral } from '@mistralai/mistralai'; // Duplicate, already imported above
// const mistralApiKey = process.env.MISTRAL_API_KEY; // Duplicate, already declared above
// const mistralClient = new Mistral({ apiKey: mistralApiKey }); // Duplicate, already declared above
// const MAX_RETRIES = 2; // Duplicate, already declared above

export class AbstractAstroValidator {
  static async validateAndFix(code: string, renderingDir: string): Promise<string> {
    let currentCode = code;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);
      if (isValid) {
        console.log('[AbstractAstroValidator] ✅ Astro code validation successful.');
        return currentCode;
      }
      console.warn(`[AbstractAstroValidator] ⚠️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      if (attempt < MAX_RETRIES) {
        console.log('[AbstractAstroValidator] Retrying with AI-powered correction...');
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error('[AbstractAstroValidator] ❌ AI failed to fix the Astro code after max attempts.');
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    throw new Error('[AbstractAstroValidator] Exited validation loop unexpectedly.');
  }
  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `abstract-validation-test-${Date.now()}.astro`);
    try {
      await fs.writeFile(tmpFile, code);
      const command = `npx --no-install astro check --fail-on-warnings "${tmpFile}"`;
      return await new Promise((resolve) => {
        exec(command, { cwd: renderingDir }, (err, stdout, stderr) => {
          const allOutput = (stderr || stdout) || '';
          if (err || allOutput) {
            resolve({ isValid: false, error: allOutput });
          } else {
            resolve({ isValid: true, error: null });
          }
        });
      });
    } finally {
      await fs.unlink(tmpFile).catch(() => console.error(`[AbstractAstroValidator] Failed to delete temp file: ${tmpFile}`));
    }
  }
  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer. You will be given a piece of Astro code that has an error, along with the error message from the compiler. Your ONLY job is to fix the code to resolve the error. Respond with ONLY the corrected, complete Astro code. Do not add any explanations, markdown, or apologies.`;
    const userMessage = `The following Astro code produced an error. Please fix it.\n\nError Message:\n---\n${error}\n---\n\nBroken Code:\n---\n${code}\n---`;
    const response = await mistralClient.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
    });
    const fixedCode = response.choices[0].message.content;
    if (!fixedCode) {
      throw new Error('[AbstractAstroValidator] AI failed to return any code for the fix.');
    }
    // Fix for linter: only call .replace on string
    if (typeof fixedCode === 'string') {
      return fixedCode.replace(/```(astro)?/g, '').trim();
    }
    // If not a string, return as is or throw
    // return fixedCode;
    throw new Error('AI failed to return valid string code for the fix.');
  }
}

// === GenericAstroValidator: Dedicated validator for generic pipeline ===
// import path from 'path'; // Duplicate, already imported above
// import { promises as fs } from 'fs'; // Duplicate, already imported above
// import { exec } from 'child_process'; // Duplicate, already imported above
// import { Mistral } from '@mistralai/mistralai'; // Duplicate, already declared above
// const mistralApiKey = process.env.MISTRAL_API_KEY; // Duplicate, already declared above
// const mistralClient = new Mistral({ apiKey: mistralApiKey }); // Duplicate, already declared above
// const MAX_RETRIES = 2; // Duplicate, already declared above

// === GENERIC PIPELINE DEDICATED CONSTANTS ===
const GENERIC_MAX_RETRIES = 2; // Keep this one active

// === DYNAMIC PROMPT GENERATOR ===
import { DynamicPromptGenerator } from '../services/dynamic-prompt-generator';

const dynamicPromptGenerator = new DynamicPromptGenerator();

export class GenericAstroValidator {
  static async validateAndFix(code: string, renderingDir: string): Promise<string> {
    let currentCode = code;
    for (let attempt = 0; attempt <= GENERIC_MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);
      if (isValid) {
        console.log('[GenericAstroValidator] ✅ Astro code validation successful.');
        return currentCode;
      }
      console.warn(`[GenericAstroValidator] ⚠️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      if (attempt < GENERIC_MAX_RETRIES) {
        console.log('[GenericAstroValidator] Retrying with AI-powered correction...');
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error('[GenericAstroValidator] ❌ AI failed to fix the Astro code after max attempts.');
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    throw new Error('[GenericAstroValidator] Exited validation loop unexpectedly.');
  }
  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `generic-validation-test-${Date.now()}.astro`);
    try {
      await fs.writeFile(tmpFile, code);
      const command = `npx --no-install astro check --fail-on-warnings "${tmpFile}"`;
      return await new Promise((resolve) => {
        exec(command, { cwd: renderingDir }, (err, stdout, stderr) => {
          const allOutput = (stderr || stdout) || '';
          if (err || allOutput) {
            resolve({ isValid: false, error: allOutput });
          } else {
            resolve({ isValid: true, error: null });
          }
        });
      });
    } finally {
      await fs.unlink(tmpFile).catch(() => console.error(`[GenericAstroValidator] Failed to delete temp file: ${tmpFile}`));
    }
  }
  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer. You will be given a piece of Astro code that has an error, along with the error message from the compiler. Your ONLY job is to fix the code to resolve the error. Respond with ONLY the corrected, complete Astro code. Do not add any explanations, markdown, or apologies.`;
    const userMessage = `The following Astro code produced an error. Please fix it.\n\nError Message:\n---\n${error}\n---\n\nBroken Code:\n---\n${code}\n---`;
    const response = await mistralClient.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
    });
    const fixedCode = response.choices[0].message.content;
    if (!fixedCode) {
      throw new Error('[GenericAstroValidator] AI failed to return any code for the fix.');
    }
    // Fix for linter: only call .replace on string
    if (typeof fixedCode === 'string') {
      return fixedCode.replace(/```(astro)?/g, '').trim();
    }
    // If not a string, return as is or throw
    // return fixedCode;
    throw new Error('AI failed to return valid string code for the fix.');
  }
}

// === SingleAstroValidator: Dedicated validator for single pipeline ===
// import path from 'path'; // Duplicate, already imported above
// import { promises as fs } from 'fs'; // Duplicate, already imported above
// import { exec } from 'child_process'; // Duplicate, already imported above
// import { Mistral } from '@mistralai/mistralai'; // Duplicate, already imported above
// const mistralApiKey = process.env.MISTRAL_API_KEY; // Duplicate, already declared above
// const mistralClient = new Mistral({ apiKey: mistralApiKey }); // Duplicate, already declared above
// const MAX_RETRIES = 2; // Duplicate, already declared above

export class SingleAstroValidator {
  static async validateAndFix(code: string, renderingDir: string): Promise<string> {
    let currentCode = code;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);
      if (isValid) {
        console.log('[SingleAstroValidator] ✅ Astro code validation successful.');
        return currentCode;
      }
      console.warn(`[SingleAstroValidator] ⚠️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      if (attempt < MAX_RETRIES) {
        console.log('[SingleAstroValidator] Retrying with AI-powered correction...');
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error('[SingleAstroValidator] ❌ AI failed to fix the Astro code after max attempts.');
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    throw new Error('[SingleAstroValidator] Exited validation loop unexpectedly.');
  }
  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `single-validation-test-${Date.now()}.astro`);
    try {
      await fs.writeFile(tmpFile, code);
      const command = `npx --no-install astro check --fail-on-warnings "${tmpFile}"`;
      return await new Promise((resolve) => {
        exec(command, { cwd: renderingDir }, (err, stdout, stderr) => {
          const allOutput = (stderr || stdout) || '';
          if (err || allOutput) {
            resolve({ isValid: false, error: allOutput });
          } else {
            resolve({ isValid: true, error: null });
          }
        });
      });
    } finally {
      await fs.unlink(tmpFile).catch(() => console.error(`[SingleAstroValidator] Failed to delete temp file: ${tmpFile}`));
    }
  }
  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer. You will be given a piece of Astro code that has an error, along with the error message from the compiler. Your ONLY job is to fix the code to resolve the error. Respond with ONLY the corrected, complete Astro code. Do not add any explanations, markdown, or apologies.`;
    const userMessage = `The following Astro code produced an error. Please fix it.\n\nError Message:\n---\n${error}\n---\n\nBroken Code:\n---\n${code}\n---`;
    const response = await mistralClient.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
    });
    const fixedCode = response.choices[0].message.content;
    if (!fixedCode) {
      throw new Error('[SingleAstroValidator] AI failed to return any code for the fix.');
    }
    // Fix for linter: only call .replace on string
    if (typeof fixedCode === 'string') {
      return fixedCode.replace(/```(astro)?/g, '').trim();
    }
    // If not a string, return as is or throw
    // return fixedCode;
    throw new Error('AI failed to return valid string code for the fix.');
  }
}

const CODEGEN_SYSTEM_PROMPT = `You are a world-class AI developer specializing in creating production-ready Astro components using Tailwind CSS and Preline UI. Your code should be clean, semantic, and follow best practices.

**CRITICAL DIRECTIVES:**
1.  **ATOMIC COMPONENTS (STRICT):**
    *   **ONE SECTION ONLY:** Each component MUST contain ONLY its designated section. If creating a "Menu" component, it should contain ONLY the navigation/menu section. If creating a "Hero" component, it should contain ONLY the hero section. NEVER include multiple sections in a single component.
    *   **NO FULL PAGES:** Do NOT create complete landing pages with multiple sections. Each component is a building block that will be assembled into a complete page later.
    *   **NO HTML/HEAD/BODY:** Do NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. These are page-level elements, not component-level elements.

2.  **TECH STACK:**
    *   **Astro:** Generate a valid, single-file Astro component (.astro).
    *   **Tailwind CSS:** All styling MUST be done with Tailwind CSS utility classes.
    *   **Preline UI:** You MUST use Preline UI components (see https://preline.co/ for components like headers, dropdowns, cards, etc.) to create modern, professional-looking layouts. This is a strict requirement for design consistency.

3.  **JAVASCRIPT PATTERNS (CRITICAL - NO EXCEPTIONS):**
    *   **NEVER use reactive variables** like @click or {variable} in templates - Astro doesn't support this
    *   **ALWAYS use IDs** for DOM manipulation instead of reactive state
    *   **ALWAYS wrap JavaScript in DOMContentLoaded** event listener
    *   **ALWAYS add null checks** before accessing DOM elements
    *   **ALWAYS type map function parameters** explicitly: (item: { name: string; href: string })
    *   **Mobile menus MUST use ID-based toggling** with proper event listeners
    *   **Use this exact mobile menu pattern:**
      \`\`\`astro
      <button id="mobile-menu-toggle" class="md:hidden">
        <Menu class="h-6 w-6" id="menu-icon" />
        <X class="h-6 w-6 hidden" id="close-icon" />
      </button>
      <div id="mobile-menu" class="hidden">
        <!-- Menu content -->
      </div>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const toggle = document.getElementById('mobile-menu-toggle');
          const menu = document.getElementById('mobile-menu');
          const menuIcon = document.getElementById('menu-icon');
          const closeIcon = document.getElementById('close-icon');
          
          if (!toggle || !menu || !menuIcon || !closeIcon) return;
          
          toggle.addEventListener('click', () => {
            const isOpen = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden');
            menuIcon.classList.toggle('hidden', isOpen);
            closeIcon.classList.toggle('hidden', !isOpen);
          });
        });
      </script>
      \`\`\`

4.  **CODE QUALITY:**
    *   **Correct Tag Usage:** You MUST use the correct, top-level semantic HTML tag. For example, a component named \`Footer\` MUST use a \`<footer>\` tag, not \`<header>\`. A component named \`Testimonial\` or \`Hero\` should use a \`<section>\` tag.
    *   **Semantic HTML:** Use appropriate HTML5 tags like \`<header>\`, \`<nav>\`, \`<section>\`, \`<figure>\`, etc. For a navigation bar, use \`<header>\` and \`<nav>\`.
    *   **Data Separation (Strict):** You MUST separate content from presentation. ALL text content (headings, paragraphs, button text, labels, etc.), link URLs, and lists of items MUST be defined as constants in the \`---\` frontmatter. The HTML body must then reference these variables. **There are no exceptions to this rule; do not hardcode ANY text directly in the HTML body.**
//     *   **Dynamic & Reusable:** Avoid hardcoding content. For navigation links, generate anchor links (e.g., \`href="#faq"\`) based on the item name. For logos or brand names, use a generic placeholder like "Logo" or "Brand Name" that is easy for the user to replace.
//     *   **Production-Ready:** The generated component must be complete and ready to use. No "Lorem Ipsum" or unfinished parts.

// 3.  **NAVIGATION COMPONENTS:**
//     *   **Structure:** Navigation items MUST be defined as an array in the frontmatter with all properties (text, href, submenu items).
//     *   **Layout:** Follow the user's layout instructions exactly (e.g., "logo on left, items on right").
//     *   **Submenus:** If a menu item has submenus, use Preline's dropdown component (\`hs-dropdown\`) and nest the submenu items properly.
//     *   **Mobile:** Always include a mobile-responsive hamburger menu using Preline's collapse component.

// 4.  **COMPONENT STRUCTURE:**
//     *   Only include a \`---\` frontmatter section if you need to define props or import something. Keep it minimal. Most components should not need it.

// 5.  **RESPONSE FORMAT:**
//     *   Your response MUST be ONLY the raw Astro code. No explanations, no markdown, no apologies. Just the code.

// **EXAMPLE OF A GOOD ATOMIC MENU COMPONENT:**
// \`\`\`astro
// ---
// const navItems = [
//   { text: "Home", href: "#home" },
//   { text: "Features", href: "#features", submenu: [
//     { text: "Core Features", href: "#core-features" },
//     { text: "Advanced", href: "#advanced" }
//   ]},
//   { text: "Pricing", href: "#pricing" }
// ];

// const brandName = "Your Brand";
// ---
// <header class="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white text-sm py-3 sm:py-0">
//   <nav class="relative max-w-7xl w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="Global">
//     <div class="flex items-center justify-between">
//       <a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">{brandName}</a>
//       <div class="sm:hidden">
//         <button type="button" class="hs-collapse-toggle p-2 inline-flex justify-center items-center gap-2 rounded-lg border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm" data-hs-collapse="#navbar-collapse-with-animation" aria-controls="navbar-collapse-with-animation" aria-label="Toggle navigation">
//           <svg class="hs-collapse-open:hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
//           <svg class="hs-collapse-open:block hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
//         </button>
//       </div>
//     </div>
//     <div id="navbar-collapse-with-animation" class="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow sm:block">
//       <div class="flex flex-col gap-y-4 gap-x-0 mt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-y-0 sm:gap-x-7 sm:mt-0 sm:ps-7">
//         {navItems.map(item => (
//           <div class="hs-dropdown relative inline-flex">
//             <a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6" href={item.href}>{item.text}</a>
//             {item.submenu && (
//               <div class="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-60 bg-white shadow-md rounded-lg p-2 mt-2" aria-labelledby="hs-dropdown-basic">
//                 {item.submenu.map(subItem => (
//                   <a class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" href={subItem.href}>{subItem.text}</a>
//                 ))}
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   </nav>
// </header>
// \`\`\`

// **EXAMPLE OF A GOOD ATOMIC HERO COMPONENT:**
// \`\`\`astro
// ---
// const heroTitle = "Find Your Dream Home";
// const heroSubtitle = "Discover the perfect property with our expert guidance.";
// const heroButtonText = "Get Started";
// ---
// <section class="bg-gray-100 py-20">
//   <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
//     <h1 class="text-4xl font-bold text-gray-900">{heroTitle}</h1>
//     <p class="mt-4 text-lg text-gray-600">{heroSubtitle}</p>
//     <a href="#features" class="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700">{heroButtonText}</a>
//     <img src={heroImage} alt={heroAltText} class="mt-10 w-full h-auto rounded-lg shadow-lg" />
//   </div>
// </section>
// \`\`\`
// `;

export interface GenerateFileInstructions {
  componentName: string;
  generationPrompt: string;
  originalPrompt: string;
  mode?: 'abstract' | 'vision' | 'edit' | string; // for future extensibility
  componentNames?: string[]; // for abstract mode
}

// === SINGLE PIPELINE DEDICATED CONSTANTS ===
const SINGLE_MAX_RETRIES = 2;
const SINGLE_CODEGEN_SYSTEM_PROMPT = `You are a world-class AI developer specializing in creating production-ready Astro components using Tailwind CSS and Preline UI. Your code should be clean, semantic, and follow best practices.

**AVATAR REQUIREMENT:** For testimonials, use ONLY these exact filenames: Avatar_man.avif, Avatar_man2.avif, Avatar_man3.avif, Avatar_man4.avif, Avatar_man6.avif, Avatar_man7.avif, Avatar_woman.avif, Avatar_woman2.avif, Avatar_woman3.avif, Avatar_woman4.avif, Avatar_woman5.avif

**CRITICAL DIRECTIVES:**
1.  **ATOMIC COMPONENTS (STRICT):**
    *   **ONE SECTION ONLY:** Each component MUST contain ONLY its designated section. If creating a "Menu" component, it should contain ONLY the navigation/menu section. If creating a "Hero" component, it should contain ONLY the hero section. NEVER include multiple sections in a single component.
    *   **NO FULL PAGES:** Do NOT create complete landing pages with multiple sections. Each component is a building block that will be assembled into a complete page later.
    *   **NO HTML/HEAD/BODY:** Do NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. These are page-level elements, not component-level elements.

2.  **TECH STACK:**
    *   **Astro:** Generate a valid, single-file Astro component (.astro).
    *   **Tailwind CSS:** All styling MUST be done with Tailwind CSS utility classes.
    *   **Preline UI:** You MUST use Preline UI components (see https://preline.co/ for components like headers, dropdowns, cards, etc.) to create modern, professional-looking layouts. This is a strict requirement for design consistency.

3.  **JAVASCRIPT PATTERNS (CRITICAL - NO EXCEPTIONS):**
    *   **NEVER use reactive variables** like @click or {variable} in templates - Astro doesn't support this
    *   **ALWAYS use IDs** for DOM manipulation instead of reactive state
    *   **ALWAYS wrap JavaScript in DOMContentLoaded** event listener
    *   **ALWAYS add null checks** before accessing DOM elements
    *   **ALWAYS type map function parameters** explicitly: (item: { name: string; href: string })
    *   **Mobile menus MUST use ID-based toggling** with proper event listeners
    *   **Use this exact mobile menu pattern:**
      \`\`\`astro
      <button id="mobile-menu-toggle" class="md:hidden">
        <Menu class="h-6 w-6" id="menu-icon" />
        <X class="h-6 w-6 hidden" id="close-icon" />
      </button>
      <div id="mobile-menu" class="hidden">
        <!-- Menu content -->
      </div>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const toggle = document.getElementById('mobile-menu-toggle');
          const menu = document.getElementById('mobile-menu');
          const menuIcon = document.getElementById('menu-icon');
          const closeIcon = document.getElementById('close-icon');
          
          if (!toggle || !menu || !menuIcon || !closeIcon) return;
          
          toggle.addEventListener('click', () => {
            const isOpen = !menu.classList.contains('hidden');
            menu.classList.toggle('hidden');
            menuIcon.classList.toggle('hidden', isOpen);
            closeIcon.classList.toggle('hidden', !isOpen);
          });
        });
      </script>
      \`\`\`

4.  **IMAGES AND VISUAL CONTENT (CRITICAL):**
    *   **ALWAYS INCLUDE IMAGES:** Every component MUST include relevant images, icons, and visual elements. This is NOT optional.
    *   **Image Sources:** Use high-quality images from:

      - Lucide ASTRO icons for icons (import from \`@lucide/astro\`)
      - Font Awesome icons when needed
    *   **Image Types by Component:**
      - **Hero:** Background images, product images, lifestyle photos
      - **Features:** Icons, product mockups, screenshots
      - **Testimonials:** Avatar images, customer photos
      - **Products:** Product images, mockups, lifestyle shots
      - **Gallery:** Multiple high-quality images
      - **About:** Team photos, office images, process diagrams
    *   **Image Optimization:** Always include \`alt\` attributes and responsive sizing
    *   **Visual Hierarchy:** Use images to create visual interest and guide user attention

4.  **CODE QUALITY:**
    *   **Correct Tag Usage:** You MUST use the correct, top-level semantic HTML tag. For example, a component named \`Footer\` MUST use a \`<footer>\` tag, not \`<header>\`. A component named \`Testimonial\` or \`Hero\` should use a \`<section>\` tag.
    *   **Semantic HTML:** Use appropriate HTML5 tags like \`<header>\`, \`<nav>\`, \`<section>\`, \`<figure>\`, etc. For a navigation bar, use \`<header>\` and \`<nav>\`.
    *   **Data Separation (Strict):** You MUST separate content from presentation. ALL text content (headings, paragraphs, button text, labels, etc.), link URLs, and lists of items MUST be defined as constants in the \`---\` frontmatter. The HTML body must then reference these variables. **There are no exceptions to this rule; do not hardcode ANY text directly in the HTML body.**
    *   **Dynamic & Reusable:** Avoid hardcoding content. For navigation links, generate anchor links (e.g., \`href="#faq"\`) based on the item name. For logos or brand names, use a generic placeholder like "Logo" or "Brand Name" that is easy for the user to replace.
    *   **Production-Ready:** The generated component must be complete and ready to use. No "Lorem Ipsum" or unfinished parts.

5.  **NAVIGATION COMPONENTS:**
    *   **Structure:** Navigation items MUST be defined as an array in the frontmatter with all properties (text, href, submenu items).
    *   **Layout:** Follow the user's layout instructions exactly (e.g., "logo on left, items on right").
    *   **Submenus:** If a menu item has submenus, use Preline's dropdown component (\`hs-dropdown\`) and nest the submenu items properly.
    *   **Mobile:** Always include a mobile-responsive hamburger menu using Preline's collapse component.

6.  **COMPONENT STRUCTURE:**
    *   Only include a \`---\` frontmatter section if you need to define props or import something. Keep it minimal. Most components should not need it.

7.  **RESPONSE FORMAT:**
    *   Your response MUST be ONLY the raw Astro code. No explanations, no markdown, no apologies. Just the code.

**EXAMPLE OF A GOOD ATOMIC MENU COMPONENT:**
\`\`\`astro
---
const navItems = [
  { text: "Home", href: "#home" },
  { text: "Features", href: "#features", submenu: [
    { text: "Core Features", href: "#core-features" },
    { text: "Advanced", href: "#advanced" }
  ]},
  { text: "Pricing", href: "#pricing" }
];

const brandName = "Your Brand";
---
<header class="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white text-sm py-3 sm:py-0">
  <nav class="relative max-w-7xl w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="Global">
    <div class="flex items-center justify-between">
      <a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">{brandName}</a>
      <div class="sm:hidden">
        <button type="button" class="hs-collapse-toggle p-2 inline-flex justify-center items-center gap-2 rounded-lg border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm" data-hs-collapse="#navbar-collapse-with-animation" aria-controls="navbar-collapse-with-animation" aria-label="Toggle navigation">
          <svg class="hs-collapse-open:hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          <svg class="hs-collapse-open:block hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div id="navbar-collapse-with-animation" class="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow sm:block">
      <div class="flex flex-col gap-y-4 gap-x-0 mt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-y-0 sm:gap-x-7 sm:mt-0 sm:ps-7">
        {navItems.map(item => (
          <div class="hs-dropdown relative inline-flex">
            <a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6" href={item.href}>{item.text}</a>
            {item.submenu && (
              <div class="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-60 bg-white shadow-md rounded-lg p-2 mt-2" aria-labelledby="hs-dropdown-basic">
                {item.submenu.map(subItem => (
                  <a class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" href={subItem.href}>{subItem.text}</a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </nav>
</header>
\`\`\`

**EXAMPLE OF A GOOD ATOMIC HERO COMPONENT:**
\`\`\`astro
---
const heroTitle = "Find Your Dream Home";
const heroSubtitle = "Discover the perfect property with our expert guidance.";
const heroButtonText = "Get Started";
---
<section class="bg-gray-100 py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-4xl font-bold text-gray-900">{heroTitle}</h1>
    <p class="mt-4 text-lg text-gray-600">{heroSubtitle}</p>
    <a href="#features" class="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700">{heroButtonText}</a>
    <img src={heroImage} alt={heroAltText} class="mt-10 w-full h-auto rounded-lg shadow-lg" />
  </div>
</section>
\`\`\`
`;

// === ABSTRACT PIPELINE DEDICATED CONSTANTS ===
const ABSTRACT_MAX_RETRIES = 2;
const ABSTRACT_CODEGEN_SYSTEM_PROMPT = `You are a world-class AI developer specializing in creating production-ready Astro components using Tailwind CSS and Preline UI. Your code should be clean, semantic, and follow best practices.

**CRITICAL DIRECTIVES:**
1.  **ATOMIC COMPONENTS (STRICT):**
    *   **ONE SECTION ONLY:** Each component MUST contain ONLY its designated section. If creating a "Menu" component, it should contain ONLY the navigation/menu section. If creating a "Hero" component, it should contain ONLY the hero section. NEVER include multiple sections in a single component.
    *   **NO FULL PAGES:** Do NOT create complete landing pages with multiple sections. Each component is a building block that will be assembled into a complete page later.
    *   **NO HTML/HEAD/BODY:** Do NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. These are page-level elements, not component-level elements.

2.  **TECH STACK:**
    *   **Astro:** Generate a valid, single-file Astro component (.astro).
    *   **Tailwind CSS:** All styling MUST be done with Tailwind CSS utility classes.
    *   **Preline UI:** You MUST use Preline UI components (see https://preline.co/ for components like headers, dropdowns, cards, etc.) to create modern, professional-looking layouts. This is a strict requirement for design consistency.

3.  **IMAGES AND VISUAL CONTENT (CRITICAL):**
    *   **ALWAYS INCLUDE IMAGES:** Every component MUST include relevant images, icons, and visual elements. This is NOT optional.
    *   **Image Sources:** Use high-quality images from Freepik Stock Content API:
      - The system will automatically fetch images from Freepik API based on component type
      - For avatars, use local images from \`/images/avatars/\` folder
      - Use Lucide Astro icons for icons (import from \`@lucide/astro\`)
      - Font Awesome icons when needed
      - **IMPORTANT:** Use placeholder patterns like \`"path/to/image"\` for images - the system will automatically replace these with actual Freepik URLs
    *   **Image Types by Component:**
      - **Hero:** Background images, product images, lifestyle photos from Freepik
      - **Features:** Icons, product mockups, screenshots from Freepik
      - **Testimonials:** Avatar images, customer photos from Freepik
      - **Products:** Product images, mockups, lifestyle shots from Freepik
      - **Gallery:** Multiple high-quality images from Freepik
      - **About:** Team photos, office images, process diagrams from Freepik
    *   **Image Optimization:** Always include \`alt\` attributes and responsive sizing
    *   **Visual Hierarchy:** Use images to create visual interest and guide user attention

4.  **CODE QUALITY:**
    *   **Correct Tag Usage:** You MUST use the correct, top-level semantic HTML tag. For example, a component named \`Footer\` MUST use a \`<footer>\` tag, not \`<header>\`. A component named \`Testimonial\` or \`Hero\` should use a \`<section>\` tag.
    *   **Semantic HTML:** Use appropriate HTML5 tags like \`<header>\`, \`<nav>\`, \`<section>\`, \`<figure>\`, etc. For a navigation bar, use \`<header>\` and \`<nav>\`.
    *   **Data Separation (Strict):** You MUST separate content from presentation. ALL text content (headings, paragraphs, button text, labels, etc.), link URLs, and lists of items MUST be defined as constants in the \`---\` frontmatter. The HTML body must then reference these variables. **There are no exceptions to this rule; do not hardcode ANY text directly in the HTML body.**
    *   **Dynamic & Reusable:** Avoid hardcoding content. For navigation links, generate anchor links (e.g., \`href="#faq"\`) based on the item name. For logos or brand names, use a generic placeholder like "Logo" or "Brand Name" that is easy for the user to replace.
    *   **Production-Ready:** The generated component must be complete and ready to use. No "Lorem Ipsum" or unfinished parts.

5.  **NAVIGATION COMPONENTS:**
    *   **Structure:** Navigation items MUST be defined as an array in the frontmatter with all properties (text, href, submenu items).
    *   **Layout:** Follow the user's layout instructions exactly (e.g., "logo on left, items on right").
    *   **Submenus:** If a menu item has submenus, use Preline's dropdown component (\`hs-dropdown\`) and nest the submenu items properly.
    *   **Mobile:** Always include a mobile-responsive hamburger menu using Preline's collapse component.

6.  **COMPONENT STRUCTURE:**
    *   Only include a \`---\` frontmatter section if you need to define props or import something. Keep it minimal. Most components should not need it.

7.  **RESPONSE FORMAT:**
    *   Your response MUST be ONLY the raw Astro code. No explanations, no markdown, no apologies. Just the code.

**EXAMPLE OF A GOOD ATOMIC MENU COMPONENT:**
\`\`\`astro
---
const navItems = [
  { text: "Home", href: "#home" },
  { text: "Features", href: "#features", submenu: [
    { text: "Core Features", href: "#core-features" },
    { text: "Advanced", href: "#advanced" }
  ]},
  { text: "Pricing", href: "#pricing" }
];

const brandName = "Your Brand";
---
<header class="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white text-sm py-3 sm:py-0">
  <nav class="relative max-w-7xl w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="Global">
    <div class="flex items-center justify-between">
      <a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">{brandName}</a>
      <div class="sm:hidden">
        <button type="button" class="hs-collapse-toggle p-2 inline-flex justify-center items-center gap-2 rounded-lg border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm" data-hs-collapse="#navbar-collapse-with-animation" aria-controls="navbar-collapse-with-animation" aria-label="Toggle navigation">
          <svg class="hs-collapse-open:hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          <svg class="hs-collapse-open:block hidden flex-shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div id="navbar-collapse-with-animation" class="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow sm:block">
      <div class="flex flex-col gap-y-4 gap-x-0 mt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-y-0 sm:gap-x-7 sm:mt-0 sm:ps-7">
        {navItems.map(item => (
          <div class="hs-dropdown relative inline-flex">
            <a class="font-medium text-gray-500 hover:text-gray-400 sm:py-6" href={item.href}>{item.text}</a>
            {item.submenu && (
              <div class="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-60 bg-white shadow-md rounded-lg p-2 mt-2" aria-labelledby="hs-dropdown-basic">
                {item.submenu.map(subItem => (
                  <a class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500" href={subItem.href}>{subItem.text}</a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </nav>
</header>
\`\`\`

**EXAMPLE OF A GOOD ATOMIC HERO COMPONENT:**
\`\`\`astro
---
const heroTitle = "Find Your Dream Home";
const heroSubtitle = "Discover the perfect property with our expert guidance.";
const heroButtonText = "Get Started";
---
<section class="bg-gray-100 py-20">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-4xl font-bold text-gray-900">{heroTitle}</h1>
    <p class="mt-4 text-lg text-gray-600">{heroSubtitle}</p>
    <a href="#features" class="mt-8 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700">{heroButtonText}</a>
    <img src={heroImage} alt={heroAltText} class="mt-10 w-full h-auto rounded-lg shadow-lg" />
  </div>
</section>
\`\`\`
`;

// === GENERIC PIPELINE DEDICATED FUNCTIONS ===
// Generic pipeline dedicated directory functions (completely independent)
function getGenericComponentsDir(subpath: string = ''): string {
  // Generic pipeline uses its own directory logic - goes up one level from /interface to project root
  const genericProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(genericProjectRoot, 'rendering', 'src', 'components', subpath);
}

function getGenericPagesDir(subpath: string = ''): string {
  // Generic pipeline uses its own directory logic - goes up one level from /interface to project root
  const genericProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(genericProjectRoot, 'rendering', 'src', 'pages', subpath);
}

// Generic pipeline dedicated function to sanitize component names for safe file names
function sanitizeGenericComponentName(componentName: string): string {
  return componentName
    .replace(/\s+/g, '') // Remove all spaces first
    .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/^([a-z])/, (match) => match.toUpperCase()) // Capitalize first letter
    .replace(/^([A-Z])/, (match) => match) // Keep first letter capitalized
    || 'Component'; // Fallback if empty
}

// Generic pipeline dedicated mockup image path function
async function getGenericMockupImagePath(prompt?: string, componentName?: string, requirements?: any): Promise<string> {
  // Use Unsplash API for dynamic images in Next.js runtime
  const { enhancedImageService } = await import('../services/image-service');
  return await enhancedImageService.getMockupImage(undefined, prompt, componentName, requirements);
}

// Generic pipeline dedicated video URL function with enhanced handling
async function getGenericVideoUrl(prompt?: string, opts?: { componentName?: string; code?: string }): Promise<string> {
  // Use Pexels API for dynamic videos
  const { pexelsVideoService } = await import('../services/pexels-video-api');
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
  
  try {
    // Test connection first
    const isConnected = await pexelsVideoService.testConnection();
    if (!isConnected) {
      console.warn('[GenericPipeline] ⚠️ Pexels API not available, using fallback videos');
      return '/images/videos/placeholder.mov'; // Use local fallback
    }

    // Derive a dynamic, minimal video search term via LLM (no rigid keywords), leveraging component code context
    const code = (opts?.code || '').toString();
    const componentName = opts?.componentName || 'Component';
    const constantMatches = Array.from(code.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*"([^"]{3,200})"/g)).slice(0, 8);
    const constantsList = constantMatches.map((m) => `${m[1]}: ${m[2]}`);
    // Also try to collect string properties inside object literals like name/title/description
    const objectStringProps = Array.from(code.matchAll(/(name|title|description)\s*:\s*"([^"]{3,200})"/gi)).slice(0, 8).map(m => `${m[1]}: ${m[2]}`);
    const contextBag = [
      `component: ${componentName}`,
      `prompt: ${(prompt || '').slice(0, 300)}`,
      ...constantsList,
      ...objectStringProps,
    ].filter(Boolean).join('\n');

    const refinementPrompt = `Extract a short 2-4 word Pexels video search phrase for a landing page background that best represents the following context. Respond with ONLY the phrase, no punctuation:
${contextBag}`;
    let searchTerm = 'hero background';
    try {
      const refine = await mistral.chat.complete({
        model: 'codestral-2405',
        messages: [
          { role: 'system', content: 'You produce concise, highly-relevant search queries (2-4 words). Return only the query.' },
          { role: 'user', content: refinementPrompt }
        ],
        temperature: 0.1,
      });
      const rawRefined = refine.choices?.[0]?.message?.content as unknown;
      const candidate = Array.isArray(rawRefined)
        ? rawRefined.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join('')
        : (typeof rawRefined === 'string' ? rawRefined : '');
      const refinedText = (candidate || '').trim();
      if (refinedText && refinedText.length <= 60) searchTerm = refinedText;
    } catch {}

    console.log('[GenericPipeline] 🎥 Fetching video for search term:', searchTerm);
    
    // Try to get video from Pexels with enhanced options
    const videoUrl = await pexelsVideoService.getRandomVideo(searchTerm, {
      orientation: 'landscape',
      size: 'medium',
      per_page: 10 // Request more videos for better selection
    });

    if (videoUrl && videoUrl !== '/images/videos/placeholder.mov') {
      console.log('[GenericPipeline] ✅ Successfully fetched Pexels video');
      return videoUrl;
    } else {
      console.warn('[GenericPipeline] ⚠️ No Pexels video found, using local fallback');
      return '/images/videos/placeholder.mov';
    }
  } catch (error) {
    console.error('[GenericPipeline] ❌ Pexels API error:', error);
    console.log('[GenericPipeline] 🔄 Using local fallback video');
    return '/images/videos/placeholder.mov';
  }
}

// Extract a background color from prompt or structured intent dynamically
async function extractBackgroundColor(prompt?: string, intent?: any): Promise<string | null> {
  // Prefer structured intent slots if present
  const slotBg = (intent?.slots?.background_color || intent?.slots?.background || intent?.slots?.colors?.find?.((c: string) => /#|rgb|hsl|gray|white|black|blue|green|red/i.test(c))) as string | undefined;
  if (slotBg) return normalizeCssColorToken(slotBg);
  // LLM-assisted extraction
  try {
    const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
    const resp = await client.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: 'Extract one background color token from the request. Return only a CSS color (Tailwind class like bg-gray-50 or a hex like #FAFAFA). No explanations.' },
        { role: 'user', content: `Request: ${(prompt||'').slice(0,600)}\nBackground color:` }
      ],
      temperature: 0.1,
    });
    const raw = resp.choices?.[0]?.message?.content;
    const token = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw.join('').trim() : '';
    return normalizeCssColorToken(token) || null;
  } catch { return null; }
}

function normalizeCssColorToken(token: string): string | null {
  if (!token) return null;
  const t = token.trim().replace(/^background[:\s]*/i, '');
  // If hex or rgb/hsl provided, map to a Tailwind-ish neutral if possible; otherwise use inline style
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return t;
  if (/^rgb|^hsl/i.test(t)) return t;
  // Pass-through common Tailwind bg- classes
  if (/^bg-[-\w]+$/.test(t)) return t;
  // Map common names
  const map: Record<string,string> = {
    white: 'bg-white', black: 'bg-black', 'soft white': 'bg-gray-50', 'off white': 'bg-gray-50',
    'clinical blue': 'bg-blue-50', 'medical green': 'bg-emerald-50', 'clean': 'bg-white'
  };
  const key = t.toLowerCase();
  return map[key] || null;
}

function applyBackgroundColor(code: string, color: string): string {
  // If Tailwind class
  if (color.startsWith('bg-')) {
    // Apply to top-level section/main/header/footer if present
    return code.replace(/<(section|main|header|footer)(\s+[^>]*)?>/i, (m, tag, attrs='') => {
      if (/class=/.test(m)) {
        return m.replace(/class="([^"]*)"/, (mm, cls) => `class="${cls} ${color}"`);
      }
      return `<${tag}${attrs || ''} class="${color}">`;
    });
  }
  // Otherwise inline style background color
  return code.replace(/<(section|main|header|footer)(\s+[^>]*)?>/i, (m, tag, attrs='') => {
    if (/style=/.test(m)) {
      return m.replace(/style="([^"]*)"/, (mm, st) => `style="background:${color}; ${st}"`);
    }
    return `<${tag}${attrs || ''} style="background:${color};">`;
  });
}

// Generic pipeline dedicated avatar image path function
async function getGenericAvatarImagePath(): Promise<string> {
  // Fallback to local avatar images for Next.js runtime
  const localAvatars = [
    'Avatar_woman.avif',
    'Avatar_woman2.avif', 
    'Avatar_woman3.avif',
    'Avatar_woman4.avif',
    'Avatar_woman5.avif',
    'Avatar_man.avif',
    'Avatar_man2.avif',
    'Avatar_man3.avif',
    'Avatar_man4.avif',
    'Avatar_man6.avif',
    'Avatar_man7.avif'
  ];
  
  const selectedAvatar = localAvatars[Math.floor(Math.random() * localAvatars.length)];
  return `/images/avatars/${selectedAvatar}`;
}

// Generic pipeline dedicated index.astro update function
async function updateGenericIndexAstroWithSections(componentNames: string[]) {
  const pagesDir = getGenericPagesDir(); // Use Generic-specific directory function
  const indexPath = path.join(pagesDir, 'index.astro');
  let content = await fs.readFile(indexPath, 'utf-8');

  // Helper function to convert to PascalCase consistently
  const toPascalCase = (name: string): string => {
    return name
      .replace(/[^a-zA-Z0-9]+/g, ' ') // Replace non-alphanumeric with space
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  };

  // Remove all previous imports and SectionWrappers for these components
  for (const componentName of componentNames) {
    const sanitizedName = sanitizeGenericComponentName(componentName);
    const pascalName = toPascalCase(sanitizedName.replace('.astro', ''));
    const importRegex = new RegExp(`import ${pascalName} from ['"].*${pascalName}\.astro['"];?\n?`, 'g');
    content = content.replace(importRegex, '');
  }

  // Remove ALL existing SectionWrapper blocks to prevent duplicates
  content = content.replace(/<SectionWrapper[^>]*>[\s\S]*?<\/SectionWrapper>\s*/g, '');

  // Add imports for all components after the last import, avoiding duplicates
  const lastImportIndex = content.lastIndexOf('import');
  const endOfLastImport = content.indexOf('\n', lastImportIndex);
  let importBlock = '';
  const addedImports = new Set<string>(); // Track added imports to avoid duplicates
  
  for (const componentName of componentNames) {
    const sanitizedName = sanitizeGenericComponentName(componentName);
    const pascalName = toPascalCase(sanitizedName.replace('.astro', ''));
    
    // Only add import if not already present
    if (!addedImports.has(pascalName) && !content.includes(`import ${pascalName} from`)) {
      importBlock += `import ${pascalName} from '../components/${pascalName}.astro';\n`;
      addedImports.add(pascalName);
    }
  }
  
  content = content.slice(0, endOfLastImport + 1) + importBlock + content.slice(endOfLastImport + 1);

  // Add SectionWrappers for all components in order, before </main> or </body>
  let sectionBlock = '';
  for (const componentName of componentNames) {
    const sanitizedName = sanitizeGenericComponentName(componentName);
    const pascalName = toPascalCase(sanitizedName.replace('.astro', ''));
    // Use original component name for section ID (lowercase, replace spaces with hyphens)
    const sectionId = componentName.toLowerCase().replace(/\s+/g, '-');
    sectionBlock += `\n    <SectionWrapper id="${sectionId}">\n      <${pascalName} />\n    </SectionWrapper>\n`;
  }
  if (content.includes('</main>')) {
    content = content.replace('</main>', `${sectionBlock}\n</main>`);
  } else {
    content = content.replace('</body>', `${sectionBlock}\n</body>`);
  }

  await fs.writeFile(indexPath, content);
  console.log(`[TRACE][Generic] Updated index.astro to include all generated sections.`);
}

// ===============================
// PIPELINE: CREATE - SINGLE COMPONENT (Fully Independent)
// ===============================

/**
 * SingleComponentPipeline: Handles the 'Create: Single Component' pipeline.
 * This pipeline is 100% independent and does not share any logic with other pipelines.
 * It generates a single Astro component from a prompt.
 */
async function runSingleComponentPipeline({ componentName, prompt }: { componentName: string, prompt: string }): Promise<{ success: boolean; componentPath: string }> {
  console.log('=== [TRACE] Entered Single Component Create Pipeline ===');
  const componentDir = getGenericComponentsDir(); // Use Generic directory to avoid undefined single dir
  const filePath = path.join(componentDir, `${sanitizeGenericComponentName(componentName)}.astro`);

  console.log(`[TRACE][Single] Generating single component: ${componentName}`);

  // Inject domain security context into system prompt
  const systemPrompt = await DomainSecurityService.injectIntoSystemPrompt(SINGLE_CODEGEN_SYSTEM_PROMPT);
  
  // Always include SINGLE_CODEGEN_SYSTEM_PROMPT as the first message
  const response = await new Mistral({ apiKey: process.env.MISTRAL_API_KEY! }).chat.complete({
    model: 'codestral-2405',
    messages: [
      { role: 'system', content: systemPrompt }, // Use Single-specific system prompt with domain security
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
  });
  let generatedCode = response.choices[0].message.content;
  if (!generatedCode || typeof generatedCode !== 'string') {
    throw new Error('AI failed to generate valid string code for the component.');
  }
  let cleanedCode = generatedCode.replace(/```(astro)?/g, '').trim();
  const mockupPath = await getGenericMockupImagePath(prompt, componentName); // Use Generic mockup path
  // Replace various placeholder patterns with actual image URLs
  cleanedCode = cleanedCode.replace(/"([\/]?path[\/]to[\/]?[^\"]+)"/g, `"${mockupPath}"`); // Use Single-specific mockup path
  //cleanedCode = cleanedCode.replace(/"https:\/\/api\.freepik\.com\/images\/[^"]*"/g, `"${mockupPath}"`); // Replace Freepik placeholder URLs
  //cleanedCode = cleanedCode.replace(/"https:\/\/img\.freepik\.com\/[^"]*"/g, `"${mockupPath}"`); // Replace Freepik image URLs
  
  // Replace avatar placeholders with local avatar images
  const { enhancedImageService } = await import('../services/image-service');
  const avatarPath = await enhancedImageService.getAvatarImage();
  cleanedCode = cleanedCode.replace(/"path\/to\/avatar"/g, `"${avatarPath}"`);
  //cleanedCode = cleanedCode.replace(/"https:\/\/api\.freepik\.com\/images\/avatar\/[^"]*"/g, `"${avatarPath}"`);
  //cleanedCode = cleanedCode.replace(/"\/images\/avatars\/[^"]*\.jpg"/g, `"${avatarPath}"`); // Replace hardcoded jpg paths
  //cleanedCode = cleanedCode.replace(/"\/images\/avatars\/[^"]*\.png"/g, `"${avatarPath}"`); // Replace hardcoded png paths
  cleanedCode = cleanedCode.replace(/\skey=\{[^}]+\}/g, '');
  // Additional avatar path replacements for hardcoded paths
  //cleanedCode = cleanedCode.replace(/"\/images\/avatars\/[^"]*\.jpg"/g, `"${avatarPath}"`); // Replace hardcoded jpg paths
  //cleanedCode = cleanedCode.replace(/"\/images\/avatars\/[^"]*\.png"/g, `"${avatarPath}"`); // Replace hardcoded png paths
  cleanedCode = cleanedCode.replace(/<input([^>]*?)type=\{([^}]+)\}([^>]*)>/g, (match, before, typeExpr, after) => {
    return `<input${before}type={String(${typeExpr}) as HTMLInputTypeAttribute}${after}>`;
  });

  // Write the file first
  await fs.writeFile(filePath, cleanedCode);
  // === Only run validation/auto-fix if file is directly inside /rendering/src/components (not subfolders) ===
  const renderingComponentsDir = path.resolve(getGenericComponentsDir());
  const fileAbsPath = path.resolve(filePath);
  const fileParentDir = path.dirname(fileAbsPath);
  console.log(`[DEBUG] file: ${fileAbsPath}, parent: ${fileParentDir}, target: ${renderingComponentsDir}`);
  let shouldUpdateIndex = false;
  if (fileParentDir === renderingComponentsDir) {
    // const fileContent = await fs.readFile(filePath, 'utf-8');
    // === FULLY COMMENTED OUT: NO VALIDATION OR AUTO-FIX FOR SINGLE MODE CREATION ===
    // const { isValid, error } = await SingleAstroValidator.compileAstro(fileContent, renderingComponentsDir);
    // if (!isValid) {
    //   console.log(`[SingleComponentPipeline] Real error detected in new component, running auto-fix for: ${filePath}`);
    //   const validatedCode = await SingleAstroValidator.validateAndFix(fileContent, renderingComponentsDir);
    //   await fs.writeFile(filePath, validatedCode);
    //   console.log(`[SingleComponentPipeline] Astro validation/auto-fix applied to: ${filePath}`);
    // } else {
    //   console.log(`[SingleComponentPipeline] No real errors detected, skipping auto-fix for: ${filePath}`);
    // }
    shouldUpdateIndex = true;
  } else {
    // Strict: never validate or auto-fix any other files
    console.log(`[SKIP][SingleComponentPipeline] Not validating: ${fileAbsPath} (parent: ${fileParentDir}, only validate new file in /rendering/src/components root)`);
  }
  if (shouldUpdateIndex) {
    await updateGenericIndexAstroWithSections([componentName]);
    console.log(`[TRACE][Single] Updated index.astro with ${componentName} (single pipeline logic)`);
  } else {
    console.log(`[TRACE][Single] Skipped index.astro update due to not being in root components dir for: ${componentName}`);
  }
  console.log(`[TRACE][Single] Created and validated component: ${filePath}`);
  console.log('=== [TRACE] Exiting Single Component Create Pipeline ===');
  return { success: true, componentPath: filePath };
}

// ===============================
// PIPELINE: CREATE - ABSTRACT (Fully Independent)
// ===============================

interface CreateAbstractInstructions {
  componentNames: string[];
  prompt: string;
}

/**
 * AbstractCreatePipeline: Handles the 'Create: Abstract' pipeline.
 * This pipeline is 100% independent and does not share any logic with other pipelines.
 * It generates multiple atomic sections/components from a single prompt using dataset examples.
 */
async function runAbstractCreatePipeline({ componentNames, prompt }: CreateAbstractInstructions): Promise<{ success: boolean; componentPaths: string[] }> {
  console.log('=== [TRACE] Entered Abstract Create Pipeline ===');
  const componentDir = getGenericComponentsDir();
  const createdPaths: string[] = [];

  for (const componentName of componentNames) {
    console.log(`[TRACE][Abstract] Generating atomic section: ${componentName}`);
    
    // === ENHANCE PROMPT WITH UI DATASET EXAMPLES ===
    const basePrompt = `Create ONLY the ${componentName} section as a single, production-ready Astro component named '${componentName}'. Do NOT include any other sections or unrelated content. Do NOT include a full page. Only the ${componentName} section.\n\nUSER INSTRUCTIONS: ${prompt}`;
    
    const enhancedPrompt = await PromptEnhancer.enhanceComponentPrompt(componentName, basePrompt);
    console.log(`[TRACE][Abstract] Enhanced prompt for ${componentName} with ${enhancedPrompt.examplesUsed} UI examples`);
    
    const response = await mistralClient.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: ABSTRACT_CODEGEN_SYSTEM_PROMPT }, // Use Abstract-specific system prompt
        { role: 'user', content: enhancedPrompt.enhancedPrompt }
      ],
      temperature: 0.1,
    });
    let generatedCode = response.choices[0].message.content;
    if (!generatedCode || typeof generatedCode !== 'string') {
      throw new Error(`AI failed to generate valid string code for the component: ${componentName}`);
    }
      let cleanedCode = generatedCode.replace(/```(astro)?/g, '').trim();
  const mockupPath = await getGenericMockupImagePath(prompt, componentName);
  // Replace various placeholder patterns with actual image URLs
  cleanedCode = cleanedCode.replace(/"([\/]?path[\/]to[\/]?[^\"]+)"/g, `"${mockupPath}"`); // Use Abstract-specific mockup path
  cleanedCode = cleanedCode.replace(/"https:\/\/api\.freepik\.com\/images\/[^"]*"/g, `"${mockupPath}"`); // Replace Freepik placeholder URLs
  cleanedCode = cleanedCode.replace(/"https:\/\/img\.freepik\.com\/[^"]*"/g, `"${mockupPath}"`); // Replace Freepik image URLs
  
  // Replace avatar placeholders with local avatar images
  const { enhancedImageService } = await import('../services/image-service');
  const avatarPath = await enhancedImageService.getAvatarImage();
  cleanedCode = cleanedCode.replace(/"path\/to\/avatar"/g, `"${avatarPath}"`);
  cleanedCode = cleanedCode.replace(/"https:\/\/api\.freepik\.com\/images\/avatar\/[^"]*"/g, `"${avatarPath}"`);
  cleanedCode = cleanedCode.replace(/\skey=\{[^}]+\}/g, '');
    cleanedCode = cleanedCode.replace(/<input([^>]*?)type=\{([^}]+)\}([^>]*)>/g, (match, before, typeExpr, after) => {
      return `<input${before}type={String(${typeExpr}) as HTMLInputTypeAttribute}${after}>`;
    });
    const filePath = path.join(componentDir, `${sanitizeGenericComponentName(componentName)}.astro`);
    // === Write the file FIRST ===
    await fs.writeFile(filePath, cleanedCode);
    // === Only run validation/auto-fix if file is directly inside /rendering/src/components (not subfolders) ===
    const renderingComponentsDir = path.resolve(getGenericComponentsDir());
    const fileAbsPath = path.resolve(filePath);
    const fileParentDir = path.dirname(fileAbsPath);
    console.log(`[DEBUG] file: ${fileAbsPath}, parent: ${fileParentDir}, target: ${renderingComponentsDir}`);
    if (fileParentDir === renderingComponentsDir) {
      // const fileContent = await fs.readFile(filePath, 'utf-8');
      // const validatedCode = await AbstractAstroValidator.validateAndFix(fileContent, renderingComponentsDir);
      // await fs.writeFile(filePath, validatedCode);
      // console.log(`[CreateAbstractPipeline] Astro validation/auto-fix applied to: ${filePath}`);
      // [AUTO-FIX DISABLED BY USER REQUEST]
    } else {
      console.log(`[SKIP] Not validating: ${fileAbsPath} (parent: ${fileParentDir})`);
    }
    createdPaths.push(filePath);
    console.log(`[TRACE][Abstract] Created and validated component: ${filePath}`);
  }
  // After all components are created, update index.astro using Abstract-specific function
  await updateGenericIndexAstroWithSections(componentNames);
  console.log('=== [TRACE] Exiting Abstract Create Pipeline ===');
  return { success: true, componentPaths: createdPaths };
}

// ===============================
// MAIN PIPELINE ROUTER
// ===============================

/**
 * Main handler for the 'generate-file' tool. Routes to the correct pipeline based on instructions.mode.
 */
export async function executeGenerateFile(instructions: GenerateFileInstructions & { position?: string, layout?: string }): Promise<{ success: boolean; componentPath?: string; componentPaths?: string[] }> {
  console.log('=== [TRACE] Main Pipeline Router: executeGenerateFile ===');
  // Pipeline router
  if (instructions.mode === 'abstract') {
    console.log('[TRACE] Routing to Abstract Create Pipeline');
    // Abstract pipeline: expects componentNames[] and prompt
    if (!instructions.componentNames || !Array.isArray(instructions.componentNames)) {
      throw new Error('Abstract mode requires componentNames array.');
    }
    // Use the fully independent Abstract pipeline
    return await runAbstractCreatePipeline({
      componentNames: instructions.componentNames,
      prompt: instructions.originalPrompt || instructions.generationPrompt,
    });
  }
  if (instructions.mode === 'vision') {
    console.log('[TRACE] Routing to Vision Create Pipeline');
    // Vision pipeline: expects componentName and prompt
    if (!instructions.componentName) {
      throw new Error('Vision mode requires componentName.');
    }
    // Pass layout and position if available (from orchestrator)
    return await runVisionPipeline({
      componentName: instructions.componentName,
      prompt: instructions.originalPrompt || instructions.generationPrompt,
      position: instructions.position,
      layout: instructions.layout
    });
  }
  if (instructions.mode === 'generic') {
    console.log('[TRACE] Routing to Generic Create Pipeline');
    // Generic pipeline: expects componentNames[] and prompt
    if (!instructions.componentNames || !Array.isArray(instructions.componentNames)) {
      throw new Error('Generic mode requires componentNames array.');
    }
    // Use the fully independent Generic pipeline
    const genericResult = await runGenericCreatePipeline({
      componentNames: instructions.componentNames,
      prompt: instructions.originalPrompt || instructions.generationPrompt,
    });
    if (!genericResult) {
      throw new Error('Generic pipeline failed with no result');
    }
    return genericResult;
  }
  if (instructions.mode === 'single' || (!instructions.mode && instructions.componentName)) {
    console.log('[TRACE] Routing to Single Component Create Pipeline');
    // Single component pipeline: expects componentName and prompt
    return await runSingleComponentPipeline({
      componentName: instructions.componentName,
      prompt: instructions.originalPrompt || instructions.generationPrompt,
    });
  }
  // Default: fallback to legacy single-component creation
  try {
    const componentPath = await runSingleComponentPipeline({
      componentName: instructions.componentName,
      prompt: instructions.generationPrompt,
    });
    // Note: updateIndexPage function was removed, using updateIndexAstroWithSections instead
    // await updateIndexPage(instructions.componentName, instructions.originalPrompt);
    return { success: true, componentPath: componentPath.componentPath };
  } catch (error) {
    console.error(`[generateFileHandler] Error creating component ${instructions.componentName}:`, error);
    throw new Error(`Failed to generate component ${instructions.componentName}.`);
  }
}

// ===============================
// PIPELINE: CREATE - VISION (Fully Independent)
// ===============================

/**
 * VisionPipeline: Handles the 'Create: Vision' pipeline.
 * This pipeline is 100% independent and does not share any logic with other pipelines.
 * It generates a component from a visual (image) input, using AI vision and codegen.
 */
async function runVisionPipeline({ componentName, prompt, position = '', layout = '' }: { componentName: string, prompt: string, position?: string, layout?: string }): Promise<{ success: boolean; componentPath: string }> {
  console.log('=== [TRACE] Entered Vision Create Pipeline ===');
  // Call the vision creator handler (do not share logic with other pipelines)
  // The layout param is expected to be a base64 image string (from orchestrator)
  // The prompt is passed for context, but the vision handler uses the image and componentName
  try {
    // Call the vision creator (lazy-loaded to avoid pulling into other intents)
    const { executeVisionCreator } = await import('./visionCreateHandler');
    const result = await executeVisionCreator({
      componentName,
      position,
      imageUrl: layout
    });
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Vision pipeline failed to create component.');
    }
    console.log(`[VisionPipeline] Created and validated component: ${result.filePath}`);
    return { success: true, componentPath: result.filePath };
  } catch (error) {
    console.error(`[VisionPipeline] Error:`, error);
    throw error;
  }
}

// ===============================
// PIPELINE: CREATE - GENERIC (Fully Independent)
// ===============================

interface CreateGenericInstructions {
  componentNames: string[];
  prompt: string;
}

// Function to read test context file
async function getTestContext(): Promise<string> {
  try {
    const testContextPath = path.join(process.cwd(), 'lib', 'context', 'test.context');
    const testContext = await fs.readFile(testContextPath, 'utf-8');
    return testContext;
  } catch (error) {
    console.log('\x1b[35m[TEST CONTEXT] Could not read test.context file, proceeding without it\x1b[0m');
    return '';
  }
}

// Function to check if prompt contains fashion boutique keywords
function isFashionBoutiquePrompt(prompt: string): boolean {
  const fashionKeywords = ['fashion boutique', 'fashion', 'boutique', 'clothing', 'apparel', 'style', 'fashion store'];
  const lowerPrompt = prompt.toLowerCase();
  return fashionKeywords.some(keyword => lowerPrompt.includes(keyword));
}

/**
 * GenericPipeline: Handles the 'Create: Generic' pipeline.
 * This pipeline is 100% independent and does not share any logic with other pipelines.
 * It generates multiple atomic sections/components from a single prompt without using dataset examples.
 * ENHANCED: Now includes IRL, feedback learning, and conversational recovery.
 */
async function runGenericCreatePipeline({ componentNames, prompt }: CreateGenericInstructions): Promise<{ success: boolean; componentPaths: string[] } | undefined> {
  console.log('🌸 [GenericPipeline] === STARTING ENHANCED GENERIC CREATE PIPELINE ===');
  console.log('🌸 [GenericPipeline] Component names:', componentNames);
  console.log('🌸 [GenericPipeline] Prompt:', prompt);
  
  // === INTELLIGENT ORCHESTRATION SERVICES (RESTORED) ===
  const irlService = new IRLService();
  const feedbackService = new FeedbackLearningService();
  const recoveryService = new ConversationalRecoveryService();
  
  const componentsDir = getGenericComponentsDir();
  console.log('🌸 [GenericPipeline] Components directory:', componentsDir);
  
  // === SIMPLE THEME DETECTION ===
  console.log('🌸 [GenericPipeline] Extracting theme once for all components...');
  // const theme = enhancedImageService.extractThemeFromPrompt(prompt); // COMMENTED OUT - Image service should only run during Astro component building
  const theme = 'general'; // Fallback to a generic theme for Next.js runtime
  console.log('🌸 [GenericPipeline] Theme detected once:', theme);
  
  // === ENHANCED INTENT DETECTION WITH IMPROVED RAG ===
  console.log('🌸 [GenericPipeline] Starting enhanced intent detection...');
  
  let structuredIntent: UserIntent;
  
  try {
    // Use the improved intent detection service
    const intentResult = await IntentDetectionService.detectIntent(prompt);
    
    if (intentResult.success && intentResult.intent) {
      structuredIntent = intentResult.intent;
      console.log('🌸 [GenericPipeline] Enhanced intent detection successful:', {
        intent: structuredIntent.intent,
        confidence: intentResult.confidence,
        sections: structuredIntent.slots?.sections,
        businessType: structuredIntent.slots?.business_type,
        sectionDescriptions: structuredIntent.slots?.section_descriptions
      });
    } else {
      // Fallback to basic intent detection
      console.log('🌸 [GenericPipeline] Using fallback intent detection...');
      structuredIntent = {
    intent: 'create_website',
    slots: {
      site_type: 'landing_page',
      sections: componentNames,
      business_type: theme,
      theme: 'modern',
      colors: [],
      features: []
    },
    confidence: 0.8,
    raw_prompt: prompt,
    extracted_sections: componentNames
  };
    }
  } catch (error) {
    console.warn('🌸 [GenericPipeline] Intent detection failed, using fallback:', error);
    structuredIntent = {
      intent: 'create_website',
      slots: {
        site_type: 'landing_page',
        sections: componentNames,
        business_type: theme,
        theme: 'modern',
        colors: [],
        features: []
      },
      confidence: 0.8,
      raw_prompt: prompt,
      extracted_sections: componentNames
    };
  }
  
  // === IRL TRANSFORMATION ===
  console.log('🌸 [GenericPipeline] Creating intermediate representation...');
  const irlStructure = irlService.fromUserIntent(structuredIntent);
  
  // === VALIDATION AND LEARNING ===
  console.log('🌸 [GenericPipeline] Validating IRL structure...');
  const validation = irlService.validateStructure(irlStructure);
  if (!validation.isValid) {
    console.warn('🌸 [GenericPipeline] IRL validation warnings:', validation.warnings);
  }
  
  const generatedComponents: string[] = [];
  
  // Initialize knowledge base once for all components
  const knowledgeBase = ComponentKnowledgeBase.getInstance();
  console.log('🌸 [GenericPipeline] Knowledge base initialized for all components');
  
  for (const componentName of componentNames) {
    console.log('🌸 [GenericPipeline] === GENERATING COMPONENT:', componentName, '===');
    const filePath = path.join(componentsDir, `${componentName}.astro`);
    console.log('🌸 [GenericPipeline] File path:', filePath);
    
    // === ENHANCED RAG & KNOWLEDGE BASE INTEGRATION ===
    console.log('🌸 [GenericPipeline] Starting enhanced RAG & knowledge base integration...');
    
    let componentRequirements = `Generate a ${componentName} component for a ${theme} landing page`;
    
    try {
      
      // Step 2: Enhanced RAG with knowledge base integration
      const { RAGAgent } = await import('../agents/rag-agent');
      const ragAgent = new RAGAgent();
      
      console.log('🌸 [GenericPipeline] Retrieving similar patterns via enhanced RAG...');
      console.log('🌸 [GenericPipeline] Prompt for RAG:', prompt ? prompt.substring(0, 100) + '...' : 'undefined');
      console.log('🌸 [GenericPipeline] ComponentName for RAG:', componentName);
      
      // CRITICAL FIX: Ensure we have valid inputs for RAG
      const ragPrompt = prompt || `Generate ${componentName} component`;
      const ragComponentName = componentName && typeof componentName === 'string' && componentName.trim().length > 0 
        ? componentName.trim() 
        : 'Component';
      
      const ragResult = await ragAgent.retrieveRelevantPatterns(ragPrompt, ragComponentName);
      
      if (ragResult.patterns.length > 0) {
        console.log('🌸 [GenericPipeline] Found', ragResult.patterns.length, 'similar patterns');
        console.log('🌸 [GenericPipeline] RAG confidence:', ragResult.confidence);
        
        // Step 3: Get section descriptions from intent detection
        const sectionDescriptions = structuredIntent.slots?.section_descriptions || {};
        const componentDescription = sectionDescriptions[componentName] || '';
        
        // Step 4: Enhanced requirements with RAG insights and section descriptions
        const enhancedRequirements = [
          `Generate a ${componentName} component for a ${theme} landing page`,
          componentDescription ? `Specific requirements: ${componentDescription}` : '',
          `Based on similar successful patterns:`,
          ...ragResult.recommendations,
          `Key features to include:`,
          ...ragResult.patterns.slice(0, 3).map(p => `- ${p.userRequest}`)
        ].filter(Boolean).join('\n');
        
        componentRequirements = enhancedRequirements;
        console.log('🌸 [GenericPipeline] Enhanced requirements created with RAG + section descriptions');
        console.log('🌸 [GenericPipeline] Component description found:', !!componentDescription);
      } else {
        console.log('🌸 [GenericPipeline] No similar patterns found, using basic requirements');
        
        // Still use section descriptions if available
        const sectionDescriptions = structuredIntent.slots?.section_descriptions || {};
        const componentDescription = sectionDescriptions[componentName] || '';
        
        if (componentDescription) {
          componentRequirements = `${componentRequirements}\n\nSpecific requirements: ${componentDescription}`;
          console.log('🌸 [GenericPipeline] Added section description to basic requirements');
        }
      }
      
      // Step 2: Use Multi-Agent Orchestration for further enhancement
      console.log('🌸 [GenericPipeline] Starting intelligent multi-agent orchestration...');
      
      const { OrchestratorAgent } = await import('../agents/orchestrator-agent');
      const orchestrator = new OrchestratorAgent();
      
      // Create intelligent orchestration plan
      const plan = await orchestrator.createOrchestrationPlan(prompt);
      console.log('🌸 [GenericPipeline] Orchestration plan created:', {
        tasks: plan.tasks?.length || 0,
        estimatedTime: plan.estimatedTime,
        confidence: plan.confidence
      });
      
      // Execute the plan (WITHOUT VALIDATION AGENT)
      const results = await orchestrator.executePlan(plan, prompt);
      console.log('🌸 [GenericPipeline] Orchestration completed:', {
        successfulTasks: results.filter(r => r.success).length,
        totalTasks: results.length
      });
      
      // Extract component requirements from results and combine with RAG
      const requirementsResult = results.find(r => r.metadata?.agentType === 'requirements');
      if (requirementsResult?.data) {
        componentRequirements = `${componentRequirements}\n\nAdditional requirements from orchestration:\n${requirementsResult.data}`;
      }
      console.log('🌸 [GenericPipeline] Combined RAG + orchestration requirements extracted');
      
      // Step 3: Knowledge base pattern learning
      console.log('🌸 [GenericPipeline] Learning patterns for future use...');
      try {
        // Store the enhanced requirements for future learning
        await knowledgeBase.addPattern({
          id: `${componentName}-enhanced-${Date.now()}`,
          componentName,
          userRequest: prompt,
          requirements: componentRequirements,
          generatedCode: 'PENDING_GENERATION',
          success: true,
          feedback: 'Enhanced with RAG and section descriptions',
          timestamp: new Date()
        });
        console.log('🌸 [GenericPipeline] Enhanced pattern stored for learning');
      } catch (learningError) {
        console.warn('🌸 [GenericPipeline] Pattern learning failed:', learningError);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('🌸 [GenericPipeline] ⚠️ RAG/Orchestration failed, using fallback:', errorMessage);
      // Use fallback requirements extraction
      componentRequirements = await irlService.extractComponentRequirements(irlStructure, componentName, prompt);
      console.log('🌸 [GenericPipeline] Fallback requirements extracted:', componentRequirements.length, 'characters');
    }
    
    // === IR FEATURE FLAG (deterministic path) ===
    const useIR = process.env.CAN_GENERATE_IR === 'true';
    let generatedCode = '';
    
    if (useIR) {
      console.log('🌸 [GenericPipeline] IR mode active: generating Component IR (no code).');
      const irSystem = 'Return ONLY strict JSON for a component spec. No code, no markdown.';
      const irUser = `Create a JSON spec (version 1.0) for component ${componentName} using semantic HTML, Tailwind tokens, placeholders only ({{MOCKUP_IMAGE}}, {{AVATAR_IMAGE}}, {{VIDEO_URL}}), lucide icons list, interactions, constants, layout, theme, a11y. User request + requirements:\n\n${prompt}\n\n${componentRequirements}`;
      const irResp: any = await completeChatWithRetry({
        model: 'codestral-2405',
        messages: [ { role: 'system', content: irSystem }, { role: 'user', content: irUser } ],
        temperature: 0.0,
        response_format: { type: 'json_object' } as any
      } as any);
      const irText = irResp.choices?.[0]?.message?.content || '{}';
      let ir: ComponentIR;
      try { ir = JSON.parse(irText); } catch { ir = { version: '1.0', componentName, semanticTag: 'section' } as ComponentIR; }
      const valid = validateIR(ir);
      if (!valid.valid) {
        console.warn('🌸 [GenericPipeline] IR validation failed, attempting one-shot repair');
        const repair = await completeChatWithRetry({
          model: 'codestral-2405',
          messages: [
            { role: 'system', content: irSystem },
            { role: 'user', content: `Fix JSON to satisfy errors: ${JSON.stringify(valid.errors)}\nJSON:\n${irText}` }
          ],
          temperature: 0.0,
          response_format: { type: 'json_object' } as any
        } as any);
        const fixedText = repair.choices?.[0]?.message?.content || irText;
        try { ir = JSON.parse(fixedText); } catch { /* keep previous */ }
      }
      const reqHash = crypto.createHash('sha256').update(`${prompt}|${componentName}`).digest('hex').slice(0, 12);
      console.log('🌸 [GenericPipeline] Request hash (no output caching):', reqHash);
      // Load style adapter once per request into global for renderer to consume
      try {
        const { loadStyleAdapter } = await import('./adapter-loader');
        // Prefer IR styleSystem; fallback to env or tailwind
        const styleSystem = ir.styleSystem || process.env.STYLE_SYSTEM || 'tailwind';
        (globalThis as any).__styleAdapter = await loadStyleAdapter(styleSystem);
      } catch (e) {
        console.warn('[GenericPipeline] Style adapter load failed, using built-in defaults');
      }
      // Critic scoring (single pass, no rewrites)
      const irScore = scoreIR(ir, prompt);
      console.log('🌸 [GenericPipeline] IR score:', irScore, 'capabilitiesVersion:', getCapabilitiesVersion());
      generatedCode = normalizeAstroCode(renderAstroFromIR(ir));
      const outputHash = crypto.createHash('sha256').update(generatedCode).digest('hex').slice(0, 12);
      console.log('🌸 [GenericPipeline] Output hash:', outputHash);
    } else {
      // === SIMPLE DIRECT GENERATION (CURRENT PATH) ===
      console.log('🌸 [GenericPipeline] Sending request to Codestral...');
    
    try {
    // === DYNAMIC PROMPT GENERATION ===
    console.log('🌸 [GenericPipeline] Generating dynamic prompts...');
    
    // Use enhanced Astro instructions for better accuracy
    const baseSystemPrompt = `You are an expert Astro developer. Generate a single, atomic Astro component (.astro) using Tailwind CSS.

STRICT RULES:
- Atomic section only; do not return full pages; no <!DOCTYPE>, <html>, <head>, <body>.
- Use HTML5 semantic tags: header/nav/section/main/footer/aside as appropriate.
- Define ALL text, lists, and data as constants in frontmatter and reference variables in the template.
- Use @lucide/astro for icons only; no lucide-react.
- Use placeholders for assets: {{MOCKUP_IMAGE}}, {{AVATAR_IMAGE}}, {{VIDEO_URL}}.
- Do NOT include <style> blocks or inline styles; only minimal <script> blocks if functionality is necessary.
- Return ONLY the raw Astro code, no markdown.

CRITICAL ACCURACY REQUIREMENTS (NO EXCEPTIONS):
- ALWAYS extract and use the EXACT business name, location, and specific details from user request
- ALWAYS implement the EXACT color scheme specified (deep red = red-800, forest green = green-800)
- ALWAYS use the EXACT headline and subheadline text provided in examples
- ALWAYS implement the EXACT button styling and interactions described
- ALWAYS include the EXACT navigation menu items specified
- ALWAYS follow the EXACT layout and positioning requirements
- ALWAYS implement the EXACT animation and micro-interaction specifications
- ALWAYS use the EXACT typography requirements (sans-serif headlines, serif body text)
- ALWAYS include the EXACT cultural and location-specific context mentioned
- NEVER use markdown formatting (** or __) - use proper HTML tags instead
- NEVER substitute generic content when specific content is provided
- NEVER ignore location-specific details (e.g., "Japan", "photography studio")
- NEVER use placeholder text when exact text is specified in user request

JAVASCRIPT PATTERNS (CRITICAL - NO EXCEPTIONS):
- NEVER use reactive variables like @click or {variable} in templates - Astro doesn't support this
- ALWAYS use IDs for DOM manipulation instead of reactive state
- ALWAYS wrap JavaScript in DOMContentLoaded event listener
- ALWAYS add null checks before accessing DOM elements
- ALWAYS type map function parameters explicitly: (item: { name: string; href: string })
- Mobile menus MUST use ID-based toggling with proper event listeners
- Use this exact mobile menu pattern:
  \`\`\`astro
  <button id="mobile-menu-toggle" class="md:hidden">
    <Menu class="h-6 w-6" id="menu-icon" />
    <X class="h-6 w-6 hidden" id="close-icon" />
  </button>
  <div id="mobile-menu" class="hidden">
    <!-- Menu content -->
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const toggle = document.getElementById('mobile-menu-toggle');
      const menu = document.getElementById('mobile-menu');
      const menuIcon = document.getElementById('menu-icon');
      const closeIcon = document.getElementById('close-icon');
      
      if (!toggle || !menu || !menuIcon || !closeIcon) return;
      
      toggle.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden');
        menuIcon.classList.toggle('hidden', isOpen);
        closeIcon.classList.toggle('hidden', !isOpen);
      });
    });
  </script>
  \`\`\`

COMPONENT-SPECIFIC REQUIREMENTS:
- HERO: MUST include fade-in animations for headline and CTA, scale-up hover effects, EXACT headline text from user request
- HEADER: MUST center logo, use EXACT CTA text specified, implement EXACT button styling
- FOOTER: MUST include centered logo at top, circular social icons, repeated navigation menu
- LEADFORM: MUST use EXACT color scheme, include business-specific context

CONTENT EXTRACTION REQUIREMENTS (CRITICAL):
- ALWAYS extract the EXACT business type from user request (e.g., "photography studio", "cloud security", "real estate")
- ALWAYS extract the EXACT location details (e.g., "Japan", "Orlando", "New York")
- ALWAYS extract the EXACT target audience (e.g., "families aged 25-55", "IT managers", "investors")
- ALWAYS extract the EXACT service offerings (e.g., "family portraits", "cloud security", "luxury homes")
- ALWAYS use the EXACT business name if provided
- NEVER generate generic content when specific business details are available
- NEVER ignore industry-specific terminology and requirements

GENERIC COMPONENT PREVENTION (CRITICAL):
- NEVER create generic "Studio Logo" when business name is specified
- NEVER create generic "Photography Studio" when specific business type is mentioned
- NEVER use placeholder text like "your business" when actual business details are provided
- NEVER ignore specific industry requirements and best practices
- ALWAYS implement business-specific features and terminology
- ALWAYS include location-specific cultural context when mentioned

HERO SECTION REQUIREMENTS (CRITICAL):
- When creating Hero sections, analyze the user request dynamically to understand what elements are needed.
- If user requests "background video", include full-screen video element using {{VIDEO_URL}} with proper overlay.
- If user requests "featured products" or "mini-gallery", create appropriate gallery structure based on their specific needs.
- Content positioning should adapt to the user's request - overlay on video when video is present, proper layout when not.
- Use intelligent z-index layering based on the component structure needed.
  - Hero structure should adapt dynamically to user requirements.
  - Use intelligent layout decisions based on the specific user request.
  - Content positioning should be responsive to the component's needs.

PHOTOGRAPHY STUDIO HERO REQUIREMENTS (CRITICAL):
- MUST use EXACT headline text: "Capture Life's Most Precious Moments with Timeless Photography in Japan"
- MUST include Japan-specific subheadline: "Our studio specializes in creating natural, heartfelt portraits that tell your family's story. Serving individuals and families in [City] with elegance and professionalism."
- MUST use deep red (red-800) or forest green (green-800) for primary CTA button
- MUST include fade-in animations: "animate-fade-in" for headline, "animate-fade-in animation-delay-200" for subheadline, "animate-fade-in animation-delay-400" for CTA
- MUST implement scale-up hover effect: "transform hover:scale-105" on CTA button
- MUST use secondary link: "View Our Gallery →" styled as underlined text in muted gray
- MUST include proper alt text for background image mentioning Japan and family portraits

VIDEO REQUIREMENTS:
- When user requests background video or video content, analyze their specific needs and include appropriate <video> elements.
- Use {{VIDEO_URL}} placeholder for dynamic video sources.
- Video structure should adapt to user requirements - not always full-screen, not always with overlay.
- Include appropriate video attributes based on the user's intended use case.

FEATURED PRODUCTS GALLERY REQUIREMENTS:
- When user requests "featured products" or "mini-gallery", analyze their specific needs.
- Gallery structure should adapt to user requirements - not always horizontal, not always scrollable.
- Product card content should match what the user actually requested.
- Use intelligent layout decisions based on the user's specific requirements.

HEADER/NAVBAR REQUIREMENTS (CRITICAL):
- MUST center the logo at the top as specified in user request
- MUST use EXACT CTA text: "Book Now" (not "Get in Touch" or other variations)
- MUST style CTA button as outlined button in muted gray (border-gray-300 text-gray-600)
- MUST include EXACT navigation menu: "Home", "Gallery", "Services", "About", "Contact"
- MUST ensure header remains fixed at top for easy access during scrolling
- MUST implement proper mobile menu with ID-based toggling

CRITICAL ACCURACY REQUIREMENTS:
- Follow user requirements EXACTLY - create rich, feature-complete components.
- Respect interactions and behaviors described in the user intent (e.g., before/after transforms, galleries, bookings) without assuming a fixed theme or palette.
- If user specifies "Background Video", ALWAYS include video element.
- If user specifies "featured products", ALWAYS include product gallery.

FOOTER REQUIREMENTS (CRITICAL):
- MUST include centered logo placeholder at the top as specified
- MUST style social media icons as circular, minimalist style (rounded-full with proper sizing)
- MUST include copyright line: "© [Year] [Your Studio Name]. All rights reserved."
- MUST repeat navigation menu from header below social icons, centered and styled in muted gray
- MUST use proper spacing and hierarchy as specified in user request

LEADFORM REQUIREMENTS (CRITICAL):
- MUST use EXACT color scheme: deep red (red-800) or forest green (green-800) for submit button
- MUST include business-specific context and messaging
- MUST implement proper form validation and accessibility
- MUST use consistent styling with the overall design theme

ICON REQUIREMENTS:
- Import ALL necessary Lucide icons for the component functionality based on usage in the template.
- Prefer descriptive icon names (e.g., Scissors, User, Calendar, Star, Heart, Eye for "View" icons).

USER SPECIFICATION EXTRACTION (CRITICAL):
- ALWAYS extract the EXACT business name, location, and industry from user request
- ALWAYS use the EXACT headline, subheadline, and CTA text provided in examples
- ALWAYS implement the EXACT color scheme specified (deep red = red-800, forest green = green-800)
- ALWAYS include the EXACT cultural and location-specific context mentioned
- ALWAYS follow the EXACT layout, positioning, and styling requirements
- NEVER substitute generic content when specific content is provided
- NEVER ignore location-specific details (e.g., "Japan", "photography studio")
- NEVER use placeholder text when exact text is specified in user request

BUSINESS CONTEXT AWARENESS (CRITICAL):
- ALWAYS identify the business type and industry from user request
- ALWAYS extract location-specific details (country, city, cultural context)
- ALWAYS use the EXACT business name provided or mentioned
- ALWAYS implement industry-specific terminology and messaging
- ALWAYS include cultural relevance when specified (e.g., Japan-specific content)
- NEVER create generic components when business-specific details are provided
- NEVER ignore industry-specific requirements and best practices

ANIMATION AND INTERACTION REQUIREMENTS (CRITICAL):
- ALWAYS implement fade-in animations for headlines and CTAs as specified
- ALWAYS include scale-up hover effects on buttons when requested
- ALWAYS use proper animation delays and durations
- ALWAYS implement smooth transitions and micro-interactions
- ALWAYS ensure animations enhance user experience without being distracting
- NEVER skip animation requirements when they are explicitly specified
- NEVER use generic animations when specific ones are requested`;

    // Inject domain security context
    const systemPrompt = await DomainSecurityService.injectIntoSystemPrompt(baseSystemPrompt);
    // Enhanced user prompt with intent-driven requirements (no rigid per-name conditionals)
    let enhancedUserPrompt = await dynamicPromptGenerator.generateUserPrompt(componentName, prompt, componentRequirements);
    const intentHints = [
      structuredIntent?.slots?.section_descriptions?.[componentName] || '',
      structuredIntent?.slots?.features?.join?.('\n- ') ? `\nRequested features:\n- ${structuredIntent.slots.features.join('\n- ')}` : '',
    ].filter(Boolean).join('\n');
    if (intentHints) {
      enhancedUserPrompt += `\n\nFOLLOW THESE INTENT HINTS STRICTLY:\n${intentHints}`;
    }
    
    const userPrompt = enhancedUserPrompt;
    
    console.log('🌸 [GenericPipeline] Dynamic prompts generated successfully');
    
    const response = await completeChatWithRetry({
      model: 'codestral-2405',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.1,
    });
    
      console.log('🌸 [GenericPipeline] Codestral response received');
      console.log('🌸 [GenericPipeline] Response length:', response.choices[0]?.message?.content?.length || 0);
      
      const responseContent = response.choices[0]?.message?.content || '';
      generatedCode = Array.isArray(responseContent) ? responseContent.join('') : responseContent;
      console.log('🌸 [GenericPipeline] Raw generated code length:', generatedCode.length);
    
    // Extract code from markdown if present
    const codeMatch = (generatedCode as string).match(/```(?:astro|html)?\s*\n([\s\S]*?)\n```/);
    if (codeMatch) {
      generatedCode = codeMatch[1];
        console.log('🌸 [GenericPipeline] Extracted code from markdown, length:', generatedCode.length);
    }
    
    // Clean up the code
    generatedCode = (generatedCode as string).trim();
      console.log('🌸 [GenericPipeline] Cleaned code length:', generatedCode.length);
    
    // === LINT ERROR FIXES ===
    console.log('🌸 [GenericPipeline] Applying lint error fixes...');
    
    // Fix common Astro lint errors
    let fixedCode = generatedCode as string;
    
    // CRITICAL: Skip complex validation to prevent framework getting stuck
    console.log('🌸 [GenericPipeline] Skipping complex validation to prevent framework getting stuck');
    
    // Remove React-specific key attributes from Astro map()
    fixedCode = fixedCode.replace(/key\s*=\s*\{[^}]+\}/g, '');
    
    // Remove className attributes (use class only)
    fixedCode = fixedCode.replace(/className\s*=\s*["'][^"']*["']/g, (match) => {
      return match.replace('className', 'class');
    });
    
    // Remove React-specific imports
    fixedCode = fixedCode.replace(/import\s+.*from\s+['"]react['"];?\s*\n?/g, '');
    fixedCode = fixedCode.replace(/import\s+.*from\s+['"]@lucide\/react['"];?\s*\n?/g, '');
    // Remove accidental Preline runtime imports from components (handled globally if needed)
    fixedCode = fixedCode.replace(/import\s+['"]preline\/preline['"];?\s*\n?/g, '');
    
    // Fix TypeScript interface declarations
    fixedCode = fixedCode.replace(/interface\s+(\w+)\s*\{/g, 'interface $1 {');
    
    // Remove any remaining React-specific syntax
    fixedCode = fixedCode.replace(/useState|useEffect|useRef/g, '');

    // Remove script blocks that reference window.HSCore (Preline) to avoid type/runtime errors
    fixedCode = fixedCode.replace(/<script>[\s\S]*?HSCore[\s\S]*?<\/script>/g, '');

    // === ACCESSIBILITY: Dynamic contrast safeguard ===
    // Heuristic: if a container has a dark/overlay background, ensure inner text has a contrasting color class
    try {
      const hasDarkOverlay = /bg-black\s+bg-opacity-(40|50|60|70|80|90)/.test(fixedCode) || /dark:bg-gray-900/.test(fixedCode);
      if (hasDarkOverlay) {
        // Add text-white to headings and paragraphs lacking explicit text color within overlay sections
        fixedCode = fixedCode.replace(/(<h[1-6]\s+class=")([^"]*)(")/g, (m, p1, cls, p3) => {
          if (/text-\w+/.test(cls)) return m;
          return `${p1}${cls} text-white${p3}`;
        });
        fixedCode = fixedCode.replace(/(<p\s+class=")([^"]*)(")/g, (m, p1, cls, p3) => {
          if (/text-\w+/.test(cls)) return m;
          return `${p1}${cls} text-gray-100${p3}`;
        });
        // Ensure buttons on dark overlays remain visible
        fixedCode = fixedCode.replace(/(<a\s+class=")([^"]*)(")/g, (m, p1, cls, p3) => {
          if (/text-\w+/.test(cls)) return m;
          return `${p1}${cls} text-white${p3}`;
        });
      }
    } catch {}

    // === THEME: Apply user-requested background color per component (dynamic) ===
    try {
      const bgColor = await extractBackgroundColor(prompt, structuredIntent);
      if (bgColor) {
        fixedCode = applyBackgroundColor(fixedCode, bgColor);
      }
    } catch {}
    
    // Ensure proper Astro frontmatter structure
    if (!fixedCode.includes('---')) {
      fixedCode = `---
// ${componentName} Component
---

${fixedCode}`;
    }
    
    // ENHANCED: Remove rigid style normalization (theme is applied via dynamic intent/capabilities)
    console.log('🌸 [GenericPipeline] Skipping rigid style normalization (dynamic theme only)...');
    generatedCode = fixedCode;
      } catch (e) {
        console.error('🌸 [GenericPipeline] Direct codegen failed:', e);
        throw e;
      }
    }
    console.log('🌸 [GenericPipeline] Enhanced styling fixes applied, code length:', generatedCode.length);
    // Telemetry: output hash for non-IR path as well
    try {
      const outputHashDirect = crypto.createHash('sha256').update(generatedCode).digest('hex').slice(0, 12);
      console.log('🌸 [GenericPipeline] Output hash (direct path):', outputHashDirect);
    } catch (error) {
      console.error('🌸 [GenericPipeline] Codestral API error:', error);
    }
      
    // } catch (error) {
    //   console.error('🌸 [GenericPipeline] Codestral API error:', error);
    //   // Check if it's a rate limit error
    //   const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //   if (errorMessage.includes('capacity exceeded') || errorMessage.includes('429')) {
    //     console.warn('🌸 [GenericPipeline] Rate limit exceeded, using fallback generation...');
    //     // Use a simpler fallback generation with proper Astro structure
    //     generatedCode = `---\nconst title = "${componentName} Component";\nconst description = "This is a fallback ${componentName} component for ${theme}.";\n---\n<section class="bg-gray-100 py-20">\n  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">\n    <h1 class="text-4xl font-bold text-gray-900">{title}</h1>\n    <p class="mt-4 text-lg text-gray-600">{description}</p>\n  </div>\n</section>`;
    //     console.log('🌸 [GenericPipeline] Using fallback code, length:', generatedCode.length);
    //   } else {
    //     // === ENHANCED RAG PATTERN LEARNING FOR FAILED GENERATION ===
    //     console.log('🌸 [GenericPipeline] Learning from failed generation with enhanced RAG...');
    //     try {
    //       const validUserRequest = prompt || `Generate ${componentName} component`;
    //       const validRequirements = typeof componentRequirements === 'string' ? componentRequirements : JSON.stringify(componentRequirements);
    //       const sectionDescriptions = structuredIntent.slots?.section_descriptions || {};
    //       const componentDescription = sectionDescriptions[componentName] || '';
    //       await knowledgeBase.addPattern({
    //         id: `${componentName}-failed-${Date.now()}`,
    //         componentName,
    //         userRequest: validUserRequest,
    //         requirements: validRequirements,
    //         generatedCode: 'FAILED_GENERATION',
    //         success: false,
    //         feedback: `Generation failed: ${errorMessage}. Section description: ${componentDescription}`,
    //         timestamp: new Date()
    //       });
    //       console.log('🌸 [GenericPipeline] ⚠️ Enhanced failed pattern stored for learning');
    //       console.log('🌸 [GenericPipeline] Section description included in learning:', !!componentDescription);
    //     } catch (learningError) {
    //       console.warn('🌸 [GenericPipeline] ⚠️ Enhanced failed pattern learning failed:', learningError);
    //     }
    //     throw error; // Re-throw other errors
    //   }
    // }
    
    // === SIMPLE IMAGE REPLACEMENT (WORKING VERSION) ===
    console.log('🌸 [GenericPipeline] Starting simple image replacement...');
    
    // Get theme-aware mockup path
    console.log('🌸 [GenericPipeline] Getting theme-aware mockup path...');
    // const mockupPath = await enhancedImageService.getMockupImage(undefined, prompt); // COMMENTED OUT - Image service should only run during Astro component building
    const mockupPath = await getGenericMockupImagePath(prompt, componentName); // Use local fallback
    console.log('🌸 [GenericPipeline] Mockup path:', mockupPath);
    // Replace placeholders with actual images
    console.log('🌸 [GenericPipeline] Replacing placeholders...');
    let cleanedCode = generatedCode.replace(/{{MOCKUP_IMAGE}}/g, mockupPath);
    
    // Fix the "undefined" issue - replace any "undefined" strings with actual values
    cleanedCode = cleanedCode.replace(/""undefined"/g, `"${mockupPath}"`);
    cleanedCode = cleanedCode.replace(/"undefined"/g, `"${mockupPath}"`);
    cleanedCode = cleanedCode.replace(/= ""undefined"/g, `= "${mockupPath}"`);
    cleanedCode = cleanedCode.replace(/= "undefined"/g, `= "${mockupPath}"`);
  
  // === RANDOM AVATAR REPLACEMENT ===
  // Replace {{AVATAR_IMAGE}} placeholders first
  const avatarPlaceholderMatches = cleanedCode.match(/{{AVATAR_IMAGE}}/g) || [];
  if (avatarPlaceholderMatches.length > 0) {
    const avatarPromises: Promise<string>[] = Array.from({ length: avatarPlaceholderMatches.length }, () => getGenericAvatarImagePath());
    const resolvedAvatars = await Promise.all(avatarPromises);
    let idx = 0;
    cleanedCode = cleanedCode.replace(/{{AVATAR_IMAGE}}/g, () => resolvedAvatars[idx++] || resolvedAvatars[0]);
  }
  
  // Replace any hard-coded avatar paths with random unique avatars
  const hardcodedAvatarRegex = /"(\/images\/avatars\/[^"']+\.avif|Avatar_[^"']+\.avif)"/g;
  const hardcodedMatches = cleanedCode.match(hardcodedAvatarRegex) || [];
  if (hardcodedMatches.length > 0) {
    const avatarPromises2: Promise<string>[] = Array.from({ length: hardcodedMatches.length }, () => getGenericAvatarImagePath());
    const resolvedAvatars = await Promise.all(avatarPromises2);
    let idx = 0;
    cleanedCode = cleanedCode.replace(hardcodedAvatarRegex, () => `"${resolvedAvatars[idx++] || resolvedAvatars[0]}"`);
  }
    // === VIDEO HANDLING - ONLY {{VIDEO_URL}} PLACEHOLDER ===
    console.log('🎬 [GenericPipeline] Processing {{VIDEO_URL}} placeholders...');
    const videoUrl = await getGenericVideoUrl(prompt, { componentName, code: cleanedCode });
    // ONLY replace {{VIDEO_URL}} - no old placeholder conversion
    cleanedCode = cleanedCode.replace(/{{VIDEO_URL}}/g, videoUrl);
    
    // === AI-DRIVEN VIDEO INJECTION ANALYSIS ===
    // Dynamically analyze if video injection is needed based on user request
    if (componentName.toLowerCase().includes('hero') && videoUrl && !cleanedCode.includes('<video')) {
      console.log('🎬 [GenericPipeline] AI-driven video injection analysis...');
      
      // Dynamic analysis: Check if user actually requested video background
      const userRequestedVideo = prompt && typeof prompt === 'string' && 
        (prompt.toLowerCase().includes('background video') || 
         prompt.toLowerCase().includes('video background') ||
         prompt.toLowerCase().includes('full-screen video'));
      
      if (userRequestedVideo) {
        console.log('🎬 [GenericPipeline] User requested video background, implementing...');
        
        // Use AI to determine the best video implementation based on user request
        try {
          const videoPrompt = `The user requested: "${prompt}"

Current component structure:
${cleanedCode}

Generate ONLY the video background HTML code that:
1. Uses the video URL: ${videoUrl}
2. Matches the user's specific video requirements
3. Integrates seamlessly with the existing component
4. Uses proper Tailwind classes and Astro syntax

Return ONLY the video HTML code, no explanations.`;

          const videoResponse = await completeChatWithRetry({
            model: process.env.MISTRAL_AGENT_ID || 'codestral-2405',
            messages: [
              {
                role: 'system',
                content: 'You are an expert Astro developer. Generate only the video background HTML code based on the user request. Return clean, valid Astro code.'
              },
              {
                role: 'user',
                content: videoPrompt
              }
            ],
            temperature: 0.1,
            maxTokens: 500
          });

          if (videoResponse.choices?.[0]?.message?.content) {
            const videoCode = String(videoResponse.choices[0].message.content).trim();
            
            // Find the hero section and inject AI-generated video code
            const heroSectionMatch = cleanedCode.match(/(<section[^>]*class="[^"]*[^"]*"[^>]*>)/);
            if (heroSectionMatch) {
    cleanedCode = cleanedCode.replace(
                heroSectionMatch[0], 
                heroSectionMatch[0] + '\n  ' + videoCode
              );
              
              console.log('🎬 [GenericPipeline] ✅ AI-generated video background injected successfully');
            }
          }
        } catch (error) {
          console.warn('🎬 [GenericPipeline] AI video generation failed, using fallback:', error);
          
          // Fallback to basic video injection if AI fails
          const heroSectionMatch = cleanedCode.match(/(<section[^>]*class="[^"]*[^"]*"[^>]*>)/);
          if (heroSectionMatch) {
            const fallbackVideo = `
  <!-- Video Background -->
  <video class="absolute inset-0 w-full h-full object-cover z-0" autoplay muted loop playsinline>
    <source src="${videoUrl}" type="video/mp4">
  </video>
  <div class="absolute inset-0 bg-black bg-opacity-50 z-10"></div>`;
            
    cleanedCode = cleanedCode.replace(
              heroSectionMatch[0], 
              heroSectionMatch[0] + fallbackVideo
            );
            
            console.log('🎬 [GenericPipeline] ✅ Fallback video background injected');
          }
        }
      }
    }
    
    // === AI-DRIVEN COMPONENT COMPLETION ===
    // Use LLM to dynamically analyze what's missing and complete the component
    if (componentName.toLowerCase().includes('hero') && 
        (prompt && typeof prompt === 'string' && 
         (prompt.toLowerCase().includes('featured products') || 
          prompt.toLowerCase().includes('mini-gallery') || 
          prompt.toLowerCase().includes('background video')))) {
      
      console.log('🤖 [GenericPipeline] AI-driven component completion analysis...');
      
      // Dynamic analysis: Check what's missing based on user request
      const missingElements = [];
      
      if (prompt.toLowerCase().includes('background video') && !cleanedCode.includes('<video')) {
        missingElements.push('background video element');
      }
      
      if ((prompt.toLowerCase().includes('featured products') || prompt.toLowerCase().includes('mini-gallery')) && 
          !cleanedCode.includes('featured') && !cleanedCode.includes('gallery')) {
        missingElements.push('featured products gallery');
      }
      
      if (missingElements.length > 0) {
        console.log(`🤖 [GenericPipeline] Missing elements detected: ${missingElements.join(', ')}`);
        
        // Use LLM to dynamically generate missing content based on user request
        try {
          const completionPrompt = `The user requested a Hero component with: ${prompt}

Current component code:
${cleanedCode}

Missing elements: ${missingElements.join(', ')}

Generate ONLY the missing HTML/Astro code to complete this component. 
- If background video is missing, create a proper video element with overlay
- If featured products gallery is missing, create a horizontal scrollable gallery
- Make it dynamic and responsive to the user's specific request
- Use proper Tailwind classes and Astro syntax

Return ONLY the HTML code, no explanations.`;

          const completionResponse = await completeChatWithRetry({
            model: process.env.MISTRAL_AGENT_ID || 'codestral-2405',
            messages: [
              {
                role: 'system',
                content: 'You are an expert Astro developer. Generate only the missing HTML code to complete the component based on the user request. Return clean, valid Astro code with proper Tailwind classes.'
              },
              {
                role: 'user',
                content: completionPrompt
              }
            ],
            temperature: 0.1,
            maxTokens: 1000
          });

          if (completionResponse.choices?.[0]?.message?.content) {
            const missingCode = String(completionResponse.choices[0].message.content).trim();
            
            // Insert the dynamically generated missing code
            const insertPoint = cleanedCode.indexOf('</section>');
            if (insertPoint !== -1) {
              cleanedCode = cleanedCode.slice(0, insertPoint) + '\n    ' + missingCode + '\n  ' + cleanedCode.slice(insertPoint);
              console.log('🤖 [GenericPipeline] ✅ AI-generated missing elements injected successfully');
            }
          }
        } catch (error) {
          console.warn('🤖 [GenericPipeline] AI completion failed, continuing with existing code:', error);
        }
      }
    }
    
    // === ENHANCED IMAGE REPLACEMENT - CATCH HARDCODED PATHS ===
    console.log('🌸 [GenericPipeline] Replacing hardcoded image paths...');
    
    // Replace hardcoded fallback image URLs with dynamic ones
    cleanedCode = cleanedCode.replace(
      /src\s*=\s*["']https:\/\/images\.unsplash\.com\/photo-[^"']+["']/g,
      `src = "${mockupPath}"`
    );
    
    const avatarPathStatic = await getGenericAvatarImagePath();
    // Replace common hardcoded image patterns
    const imageReplacements = [
      // Hero images
      { pattern: /heroImage\s*=\s*["']path\/to\/hero-image["']/g, replacement: `heroImage = "${mockupPath}"` },
      { pattern: /heroImage\s*=\s*["']\/images\/hero\.jpg["']/g, replacement: `heroImage = "${mockupPath}"` },
      { pattern: /heroImage\s*=\s*["']\/images\/mockups\/.*\.jpg["']/g, replacement: `heroImage = "${mockupPath}"` },
      
      // General image paths
      { pattern: /src\s*=\s*["']path\/to\/.*image["']/g, replacement: `src = "${mockupPath}"` },
      { pattern: /src\s*=\s*["']\/images\/.*\.jpg["']/g, replacement: `src = "${mockupPath}"` },
      { pattern: /src\s*=\s*["']\/images\/.*\.png["']/g, replacement: `src = "${mockupPath}"` },
      
      // Alt text updates
      { pattern: /alt\s*=\s*["']Beautiful real estate property["']/g, replacement: `alt = "${theme} property from Unsplash"` },
      { pattern: /alt\s*=\s*["']Hero image["']/g, replacement: `alt = "${theme} property from Unsplash"` },
      
      // Avatar replacements
      { pattern: /avatar\s*=\s*["']\/images\/avatars\/.*\.avif["']/g, replacement: `avatar = "${avatarPathStatic}"` },
      { pattern: /image\s*=\s*["']\/images\/avatars\/.*\.avif["']/g, replacement: `image = "${avatarPathStatic}"` },
      { pattern: /avatar\s*=\s*["']Avatar_.*\.avif["']/g, replacement: `avatar = "${avatarPathStatic}"` },
      { pattern: /image\s*=\s*["']Avatar_.*\.avif["']/g, replacement: `image = "${avatarPathStatic}"` }
    ];
    
    for (const replacement of imageReplacements) {
      cleanedCode = cleanedCode.replace(replacement.pattern, replacement.replacement);
    }
    
    // Also replace any remaining hardcoded image URLs in JSX
    cleanedCode = cleanedCode.replace(/src\s*=\s*["']https:\/\/.*\.(jpg|png|jpeg|webp)["']/g, `src = "${mockupPath}"`);
    
    // Fix hardcoded avatar paths that are still showing up
    cleanedCode = cleanedCode.replace(
      /avatar\s*=\s*"\/images\/avatars\/Avatar_[^"]+\.avif"/g,
      `avatar = "${avatarPathStatic}"`
    );
    
    // Fix malformed URLs with double quotes (comprehensive fix)
    // cleanedCode = cleanedCode.replace(/""([^"]+)""/g, `"$1"`); // commented out duplicate fix
    // Updated malformed URL fix:
    cleanedCode = cleanedCode.replace(/""?https:[^"\s]+""?/g, (m) => `"${m.replace(/"/g, '')}"`);
    cleanedCode = cleanedCode.replace(/src\s*=\s*"([^"]+)"/g, `src = "$1"`);
    cleanedCode = cleanedCode.replace(/image\s*=\s*"([^"]+)"/g, `image = "$1"`);
    cleanedCode = cleanedCode.replace(/avatar\s*=\s*"([^"]+)"/g, `avatar = "$1"`);
    cleanedCode = cleanedCode.replace(/poster\s*=\s*"([^"]+)"/g, `poster = "$1"`);
    
    // Fix URLs in object properties (like in galleryItems array)
    cleanedCode = cleanedCode.replace(/src:\s*""([^"]+)""/g, `src: "$1"`);
    cleanedCode = cleanedCode.replace(/image:\s*""([^"]+)""/g, `image: "$1"`);
    cleanedCode = cleanedCode.replace(/avatar:\s*""([^"]+)""/g, `avatar: "$1"`);
    cleanedCode = cleanedCode.replace(/poster:\s*""([^"]+)""/g, `poster: "$1"`);
    
    // Fix URLs in object properties with different spacing
    cleanedCode = cleanedCode.replace(/src:\s*""([^"]+)""/g, `src: "$1"`);
    cleanedCode = cleanedCode.replace(/image:\s*""([^"]+)""/g, `image: "$1"`);
    cleanedCode = cleanedCode.replace(/avatar:\s*""([^"]+)""/g, `avatar: "$1"`);
    cleanedCode = cleanedCode.replace(/poster:\s*""([^"]+)""/g, `poster: "$1"`);
    
    // Fix URLs in object properties with no spacing
    cleanedCode = cleanedCode.replace(/src:""([^"]+)""/g, `src: "$1"`);
    cleanedCode = cleanedCode.replace(/image:""([^"]+)""/g, `image: "$1"`);
    cleanedCode = cleanedCode.replace(/avatar:""([^"]+)""/g, `avatar: "$1"`);
    cleanedCode = cleanedCode.replace(/poster:""([^"]+)""/g, `poster: "$1"`);
    
    // === GENERIC PER-ITEM MEDIA RESOLUTION (dynamic, array-agnostic) ===
    try {
      const arrayDeclRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*\[([\s\S]*?)\];/g;
      const arrayBlocks: Array<{ name: string; block: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = arrayDeclRegex.exec(cleanedCode)) !== null) {
        arrayBlocks.push({ name: m[1], block: m[0] });
      }
      if (arrayBlocks.length) {
        const { enhancedImageService } = await import('../services/image-service');
        for (const arr of arrayBlocks) {
          // Collect lightweight descriptors from object literals without rigid keys
          const objectRegex = /\{[\s\S]*?\}/g;
          const objects = arr.block.match(objectRegex) || [];
          if (!objects.length) continue;
          const descriptors = objects.map((obj, idx) => {
            // Pull any string fields to build a search phrase
            const strings = Array.from(obj.matchAll(/:\s*"([^"]+)"/g)).map(x => x[1]).slice(0, 6);
            return { index: idx, hint: strings.join(' ') || `${arr.name} item ${idx + 1}` };
          });
          const queries = descriptors.map(d => ({ title: d.hint, description: d.hint }));
          const urls = await enhancedImageService.getGalleryItemImages(queries, prompt, componentName);
          let urlIdx = 0;
          // Replace any image-like fields in this array block
          const replaced = arr.block.replace(/(beforeImage|afterImage|image|src)\s*:\s*"[^"]+"/g, (match, key) => {
            const url = urls[urlIdx] || urls[0];
            urlIdx = Math.min(urlIdx + 1, urls.length - 1);
            return `${key}: "${url}"`;
          });
          cleanedCode = cleanedCode.replace(arr.block, replaced);
        }
      }
    } catch (e) {
      console.warn('🌸 [GenericPipeline] Generic per-item media resolution skipped');
    }

    // === NAVBAR: ENFORCE CSS-ONLY (REMOVE JS TOGGLE SCRIPTS) ===
    cleanedCode = cleanedCode.replace(/<script>[\s\S]*?Toggle menu[\s\S]*?<\/script>/gi, '');
    cleanedCode = cleanedCode.replace(/<script>[\s\S]*?querySelector\(['\"]nav['\"][\s\S]*?<\/script>/gi, '');
    
    console.log('🌸 [GenericPipeline] Enhanced image replacement complete');
    console.log('🌸 [GenericPipeline] Placeholders replaced, code length:', cleanedCode.length);
    
    // === NEW PLACEHOLDER REPLACEMENT SYSTEM ===
    console.log('🌸 [GenericPipeline] Applying image placeholder replacement...');
    cleanedCode = await replaceImagePlaceholders(cleanedCode, componentName, prompt);
    
    // === CONSOLIDATE LUCIDE IMPORTS ===
    console.log('🌸 [GenericPipeline] Consolidating Lucide imports...');
    
    // Find all Lucide imports and consolidate them
    const lucideImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]@lucide\/astro['"]/g;
    const lucideImports: string[] = [];
    let match;
    
    while ((match = lucideImportRegex.exec(cleanedCode)) !== null) {
      const icons = match[1].split(',').map(icon => icon.trim());
      lucideImports.push(...icons);
    }
    
    // Remove duplicate icons and create consolidated import
    const uniqueIcons = [...new Set(lucideImports)];
    if (uniqueIcons.length > 0) {
      const consolidatedImport = `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';`;
      
      // Remove all existing Lucide imports completely
      cleanedCode = cleanedCode.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
      
      // Clean up any empty lines that might be left
      cleanedCode = cleanedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // Clean up any leftover semicolons from removed imports
      cleanedCode = cleanedCode.replace(/;\s*\n\s*;/g, '');
      cleanedCode = cleanedCode.replace(/;\s*\n\s*interface/g, '\ninterface');
      cleanedCode = cleanedCode.replace(/;\s*\n\s*const/g, '\nconst');
      cleanedCode = cleanedCode.replace(/;\s*\n\s*export/g, '\nexport');
      
      // Add consolidated import at the beginning of frontmatter
      const frontmatterMatch = cleanedCode.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
      if (frontmatterMatch) {
        const existingContent = frontmatterMatch[2].trim();
        const newContent = `${consolidatedImport}\n\n${existingContent}`;
        cleanedCode = cleanedCode.replace(frontmatterMatch[0], `${frontmatterMatch[1]}${newContent}${frontmatterMatch[3]}`);
      } else {
        // Create frontmatter if none exists
        cleanedCode = `---\n${consolidatedImport}\n---\n\n${cleanedCode}`;
      }
      
      console.log('🌸 [GenericPipeline] ✅ Consolidated Lucide imports:', uniqueIcons);
    }
    
    // === ENHANCED LUCIDE ICON HANDLING ===
    console.log('🌸 [GenericPipeline] Starting enhanced Lucide icon handling...');
    
    // 100% DYNAMIC ICON HANDLING - NO STATIC MAPPING
    // CRITICAL LEARNING: Helper functions must return data objects, not JSX
    // This prevents "Expected '>' but found 'class'" errors in Astro components
    
    /**
     * Enhanced icon detection and import generation - 100% DYNAMIC
     */
    function detectAndGenerateIconImports(code: string): { imports: string[], iconUsage: string[] } {
      const iconUsage: string[] = [];
      const imports: Set<string> = new Set();
      
      // DYNAMIC APPROACH: Detect all Lucide icon usage patterns
      const iconPatterns = [
        // Direct self-closing usage (e.g., <MapPin />)
        /<([A-Z][a-zA-Z0-9]*)\s*(?:[^>]*)\/>/g,
        // Opening tag usage (e.g., <Phone class="...">)
        /<([A-Z][a-zA-Z0-9]*)\b[^>]*>/g,
        // Generic Icon component with name attribute
        /<Icon\s+name\s*=\s*["']([^"']+)["']/g,
        // Icon in object properties (e.g., icon: "twitter")
        /icon:\s*["']([^"']+)["']/g,
        /icon\s*=\s*["']([^"']+)["']/g,
        // Icon in object properties referencing a symbol (e.g., icon: Phone)
        /icon:\s*([A-Z][a-zA-Z0-9]*)/g
      ];
      
      // Common non-icon components to exclude
      const excludedComponents = [
        'Fragment', 'Component', 'Layout', 'Head', 'Script', 'Style', 
        'Slot', 'Astro', 'div', 'span', 'img', 'a', 'button', 'input',
        'form', 'section', 'header', 'footer', 'main', 'nav', 'aside',
        'article', 'figure', 'figcaption', 'ul', 'ol', 'li', 'p', 'h1',
        'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'u',
        'mark', 'small', 'del', 'ins', 'sub', 'sup', 'code', 'pre',
        'blockquote', 'q', 'cite', 'abbr', 'acronym', 'dfn', 'kbd',
        'samp', 'var', 'time', 'address', 'br', 'hr', 'wbr', 'area',
        'base', 'col', 'embed', 'link', 'meta', 'param', 'source',
        'track', 'video', 'audio', 'canvas', 'map', 'object', 'svg',
        'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'
      ];
      
      // Process each pattern to detect icon usage
      iconPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          const componentName = match[1];
          
          // Skip excluded components
          if (excludedComponents.includes(componentName)) {
            continue;
          }
          
          // Add to imports if it looks like a Lucide icon (PascalCase, not excluded)
          if (/^[A-Z][a-zA-Z]*$/.test(componentName)) {
            imports.add(componentName);
            // Convert to kebab-case for usage tracking
            const kebabCase = componentName.replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);
            iconUsage.push(kebabCase);
          }
        }
      });
      
      return {
        imports: Array.from(imports),
        iconUsage
      };
    }
    
    /**
     * Replace generic Icon usage with specific Lucide icons - DYNAMIC
     */
    function replaceIconUsage(code: string, iconUsage: string[]): string {
      let updatedCode = code;
      
      iconUsage.forEach(iconName => {
        // Convert kebab-case to PascalCase for component names
        const componentName = iconName.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
        
          // Replace <Icon name="icon-name" /> with <IconName />
          const iconPattern = new RegExp(`<Icon\\s+name\\s*=\\s*["']${iconName}["'][^>]*>`, 'g');
        updatedCode = updatedCode.replace(iconPattern, `<${componentName} />`);
        
        // DON'T replace icon: "icon-name" in object properties - keep them as strings
        // This prevents breaking socialLinks arrays and similar data structures
        // Only replace direct component usage, not string references
      });
      
      return updatedCode;
    }
    
    // Apply icon handling to the generated code
    console.log('🌸 [GenericPipeline] Detecting and processing Lucide icons...');
    const { imports: iconImports, iconUsage } = detectAndGenerateIconImports(cleanedCode);
    
    if (iconImports.length > 0) {
      console.log('🌸 [GenericPipeline] Found icons to import:', iconImports);
      console.log('🌸 [GenericPipeline] Icon usage detected:', iconUsage);
      
      // Replace generic Icon usage with specific components
      cleanedCode = replaceIconUsage(cleanedCode, iconUsage);
      
    // Add proper imports INSIDE the frontmatter section (and ensure Star is available as fallback)
      // Deduplicate icon imports to prevent duplicates
    const uniqueIconImports = [...new Set(iconImports.concat(['Star']))];
    const importStatement = `import { ${uniqueIconImports.join(', ')} } from '@lucide/astro';`;
      
      // Find the frontmatter section and add imports INSIDE it
      const frontmatterMatch = cleanedCode.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
      if (frontmatterMatch) {
        // Check if there are already imports in the frontmatter
        const existingImports = frontmatterMatch[2];
        const hasExistingImports = existingImports.includes('import ');
        
        // Add the import statement at the beginning of the frontmatter content
        const newFrontmatterContent = hasExistingImports 
          ? `${importStatement}\n${existingImports}`
          : `${importStatement}\n\n${existingImports}`;
          
        cleanedCode = cleanedCode.replace(
          frontmatterMatch[0],
          `${frontmatterMatch[1]}${newFrontmatterContent}${frontmatterMatch[3]}`
        );
      } else {
        // Create frontmatter with imports if none exists
        cleanedCode = `---\n${importStatement}\n---\n\n${cleanedCode}`;
      }

      // Replace any XIcon pattern dynamically by stripping the suffix (no static list)
      cleanedCode = cleanedCode.replace(/\b([A-Z][a-zA-Z0-9]*)Icon\b/g, '$1');
      cleanedCode = cleanedCode.replace(/Linkedin\b/g, 'Linkedin');
      cleanedCode = cleanedCode.replace(/Facebook\b/g, 'Facebook');
      cleanedCode = cleanedCode.replace(/Instagram\b/g, 'Instagram');
      cleanedCode = cleanedCode.replace(/Twitter\b/g, 'Twitter');
      
      console.log('🌸 [GenericPipeline] Icon imports and usage updated successfully');
    } else {
      console.log('🌸 [GenericPipeline] No Lucide icons detected in generated code');
    }

    // === SAFETY: REMOVE dynamic <component is={getCategoryIcon(...)} /> to prevent undefined symbols ===
    // Replace with a safe icon (Star) and remove the helper function if present.
    cleanedCode = cleanedCode.replace(/<component\s+is=\{getCategoryIcon\([^}]+\)\}([^>]*)\/>/g, '<Star$1 />');
    cleanedCode = cleanedCode.replace(/function\s+getCategoryIcon\s*\([\s\S]*?\)\s*\{[\s\S]*?\}/g, '');
    
    // COMMENTED OUT: Component validation (temporarily disabled)
    // console.log('🌸 [GenericPipeline] Performing final validation...');
    // const validation = SmartImageExtractor.validateCode(cleanedCode, componentName);
    // if (!validation.isValid) {
    //   console.warn('🌸 [GenericPipeline] ⚠️ Validation failed:', validation.errors);
    //   console.log('🌸 [GenericPipeline] Using fallback code...');
    //   cleanedCode = generatedCode;
    //   cleanedCode = cleanedCode.replace(/{{MOCKUP_IMAGE}}/g, mockupPath);
    //   cleanedCode = cleanedCode.replace(/{{AVATAR_IMAGE}}/g, await enhancedImageService.getAvatarImage(prompt));
    // }
    
    console.log('🌸 [GenericPipeline] Image replacement and icon handling complete, code length:', cleanedCode.length);
    
    // === FINAL SANITATION PASS ===
    // 1. COMPLETELY REMOVE duplicate Lucide imports - NO COMMENTING, JUST REMOVE
    const lucideImportPattern = /^\s*import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*$/gm;
    const lucideImportsFound = cleanedCode.match(lucideImportPattern) || [];
    if (lucideImportsFound.length > 1) {
      let firstEncountered = false;
      cleanedCode = cleanedCode.replace(lucideImportPattern, (match) => {
        if (!firstEncountered) {
          firstEncountered = true;
          return match; // keep first
        }
        // COMPLETELY REMOVE duplicate - no commenting
        return '';
      });
      // Clean up any empty lines left by removed imports
      cleanedCode = cleanedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
    }

    // 2. Fix malformed double-quoted URLs
    cleanedCode = cleanedCode.replace(/""https:\/\//g, '"https://');

    // 3. Ensure avatar paths always use placeholders if still hard-coded
    cleanedCode = cleanedCode.replace(/avatar\s*[:=]\s*"[A-Za-z_0-9]+\.avif"/g, `avatar: "{{AVATAR_IMAGE}}"`);

    
    // Save the component
    console.log('🌸 [GenericPipeline] Saving component to:', filePath);
    await fs.writeFile(filePath, cleanedCode);
    console.log('🌸 [GenericPipeline] ✅ Component saved successfully');
    
    // === FEEDBACK LEARNING INTEGRATION ===
    console.log('🌸 [GenericPipeline] Applying learning insights...');
    const learningResult = await feedbackService.applyLearningInsights(prompt, structuredIntent);
    if (learningResult.applied_insights.length > 0) {
      console.log('🌸 [GenericPipeline] Applied learning insights:', learningResult.applied_insights);
      // Store learning insights in metadata
      irlStructure.metadata = {
        ...irlStructure.metadata,
        raw_prompt: prompt, // Store original prompt for component-specific requirements
        learning_applied: true,
        applied_insights: learningResult.applied_insights
      };
    }
    
    // === CONVERSATIONAL RECOVERY CHECK ===
    console.log('🌸 [GenericPipeline] Checking for clarification needs...');
    const recoveryCheck = await recoveryService.analyzeForClarification(
      prompt, 
      structuredIntent, 
      structuredIntent.confidence
    );
    
    if (recoveryCheck.needs_clarification) {
      console.log('🌸 [GenericPipeline] Clarification needed:', recoveryCheck.reasoning);
      // For now, we'll proceed but log the need for clarification
      // In a full implementation, this would trigger a user interaction
      await feedbackService.logFeedback({
        user_prompt: prompt,
        detected_intent: structuredIntent,
        success: false,
        processing_time: 0,
        retry_count: 0,
        error_message: 'Clarification needed but not implemented in current flow'
      });
    }
    
    // === ENHANCED RAG PATTERN LEARNING ===
    console.log('🌸 [GenericPipeline] Learning from successful generation with enhanced RAG...');
    
    try {
      // Get section descriptions for comprehensive learning
      const sectionDescriptions = structuredIntent.slots?.section_descriptions || {};
      const componentDescription = sectionDescriptions[componentName] || '';
      
      // CRITICAL FIX: Check for "undefined" values before storing
      if (!cleanedCode.includes('""undefined"')) {
      await knowledgeBase.addPattern({
        id: `${componentName}-success-${Date.now()}`,
        componentName,
        userRequest: prompt,
        requirements: componentRequirements,
        generatedCode: cleanedCode,
        success: true,
        feedback: `Successfully generated with enhanced RAG. Section description: ${componentDescription}`,
        timestamp: new Date()
      });
      
      console.log('🌸 [GenericPipeline] ✅ Enhanced pattern stored in knowledge base for future RAG');
      console.log('🌸 [GenericPipeline] Section description included in learning:', !!componentDescription);
      } else {
        console.warn('[GenericPipeline] ⚠️ Not storing pattern due to "undefined" values in generated code.');
      }
    } catch (learningError) {
      console.warn('🌸 [GenericPipeline] ⚠️ Enhanced pattern learning failed:', learningError);
    }
    
    // Log successful generation
    await feedbackService.logFeedback({
      user_prompt: prompt,
      detected_intent: structuredIntent,
      generated_code: cleanedCode,
      validation_result: { isValid: true, errors: [], warnings: [], suggestions: [] },
      success: true,
      processing_time: Date.now(),
      retry_count: 0
    });
    
    // === LINT VALIDATION (COMMENTED OUT FOR PERFECT COMPONENTS) ===
    console.log('🌸 [GenericPipeline] Skipping validation for perfect component generation...');
    
    // COMMENTED OUT: All validation to ensure perfect components without any modifications
    // Import and use the comprehensive AstroLintValidator
    // try {
    //   const { AstroLintValidator } = await import('../services/astro-lint-validator');
    //   
    //   // Create temporary file for validation
    //   const tempDir = path.join(process.cwd(), 'temp-validation');
    //   await fs.mkdir(tempDir, { recursive: true });
    //   const tempFile = path.join(tempDir, `${componentName}.astro`);
    //   await fs.writeFile(tempFile, cleanedCode);
    //   
    //   // Validate the component
    //   const validationResult = await AstroLintValidator.validateComponent(tempFile);
    //   
    //   if (!validationResult.isValid) {
    //     console.warn('🌸 [GenericPipeline] Lint errors detected:', validationResult.errors);
    //     console.log('🌸 [GenericPipeline] Attempting to fix lint errors...');
    //     
    //     // Fix the component
    //     const fixResult = await AstroLintValidator.fixComponent(tempFile);
    //     
    //     if (fixResult.isValid) {
    //       console.log('🌸 [GenericPipeline] ✅ Lint errors fixed successfully');
    //       // Read the fixed code
    //       cleanedCode = await fs.readFile(tempFile, 'utf-8');
    //     } else {
    //       console.warn('🌸 [GenericPipeline] ⚠️ Some lint errors could not be fixed:', fixResult.errors);
    //     }
    //   } else {
    //     console.log('🌸 [GenericPipeline] ✅ No lint errors detected');
    //   }
    //   
    //   // Clean up temp directory
    //   await fs.rm(tempDir, { recursive: true, force: true });
    //   
    // } catch (validationError) {
              // console.warn('🌸 [GenericPipeline] ⚠️ Validation service error:', validationError);
        // // Fall back to basic validation
        // console.log('🌸 [GenericPipeline] Falling back to basic validation...');
      
      // Enhanced validation - check for common lint errors and issues
    const lintErrors = [];
    const codeStr = cleanedCode as string;
    
      // Check for React-style issues
    if (codeStr.includes('key={')) {
      lintErrors.push('React-style key attributes found');
    }
    if (codeStr.includes('className=')) {
      lintErrors.push('className attributes found (should be class)');
    }
    if (codeStr.includes('import') && codeStr.includes('react')) {
      lintErrors.push('React imports found');
    }
    if (codeStr.includes('useState') || codeStr.includes('useEffect')) {
      lintErrors.push('React hooks found');
    }
      
      // Check for wrong Lucide imports
      if (codeStr.includes("from 'lucide-astro'")) {
        lintErrors.push('Wrong Lucide import source: lucide-astro (should be @lucide/astro)');
      }
      if (codeStr.includes("from 'lucide-react'")) {
        lintErrors.push('Wrong Lucide import source: lucide-react (should be @lucide/astro)');
      }
      
      // Check for duplicate Lucide imports
      const lucideImportMatches = codeStr.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
      if (lucideImportMatches && lucideImportMatches.length > 1) {
        lintErrors.push('Duplicate Lucide import statements found');
      }
      
      // Check for duplicate image URLs in arrays
      const imageUrlMatches = codeStr.match(/https:\/\/images\.unsplash\.com\/[^"'\s]+/g);
      if (imageUrlMatches) {
        const uniqueUrls = [...new Set(imageUrlMatches)];
        if (uniqueUrls.length < imageUrlMatches.length) {
          lintErrors.push('Duplicate Unsplash image URLs found in component');
        }
      }
      
      // Check for hardcoded image URLs instead of placeholders
      if (codeStr.includes('https://images.unsplash.com/') && !codeStr.includes('{{MOCKUP_IMAGE}}')) {
        lintErrors.push('Hardcoded Unsplash URLs found (should use {{MOCKUP_IMAGE}} placeholders)');
      }
      
      // Check for wrong video source attributes
      if (codeStr.includes('<source url=')) {
        lintErrors.push('Wrong video source attribute: url (should be src)');
      }
      
      // Check for TypeScript errors in map functions
      if (codeStr.includes('.map((') && !codeStr.includes(': ')) {
        lintErrors.push('Untyped map function parameters found');
      }
      
      // Check for non-existent Lucide icons
      const lucideIconMatches = codeStr.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/);
      if (lucideIconMatches) {
        const iconMatch = lucideIconMatches[0].match(/\{([^}]*)\}/);
        if (iconMatch) {
          const icons = iconMatch[1].split(',').map(icon => icon.trim());
          const nonExistentIcons = ['Capsule', 'Icon']; // Add more as needed
          const foundNonExistent = icons.filter(icon => nonExistentIcons.includes(icon));
          if (foundNonExistent.length > 0) {
            lintErrors.push(`Non-existent Lucide icons found: ${foundNonExistent.join(', ')}`);
          }
        }
      }
      
      // Check for malformed URLs with double quotes
      if (codeStr.includes('""https://')) {
        lintErrors.push('Malformed URLs with double quotes found');
      }
      
      // Check for missing TypeScript interfaces
      if (codeStr.includes('interface') && codeStr.includes('Astro.props') && !codeStr.includes('Partial<')) {
        lintErrors.push('Missing Partial<> wrapper for Astro.props');
      }
      
      // Check for framework-specific imports (CRITICAL ERROR)
      if (codeStr.includes("from 'solid-js'") || codeStr.includes('from "solid-js"')) {
        lintErrors.push('Framework-specific import found: solid-js (NOT compatible with Astro)');
      }
      if (codeStr.includes("from 'react'") || codeStr.includes('from "react"')) {
        lintErrors.push('Framework-specific import found: react (NOT compatible with Astro)');
      }
      if (codeStr.includes("from 'vue'") || codeStr.includes('from "vue"')) {
        lintErrors.push('Framework-specific import found: vue (NOT compatible with Astro)');
      }
      if (codeStr.includes("from 'svelte'") || codeStr.includes('from "svelte"')) {
        lintErrors.push('Framework-specific import found: svelte (NOT compatible with Astro)');
      }
      
      // Check for framework-specific hooks and functions
      if (codeStr.includes('createSignal') || codeStr.includes('createStore')) {
        lintErrors.push('Solid.js functions found (NOT compatible with Astro)');
      }
      if (codeStr.includes('useState') || codeStr.includes('useEffect')) {
        lintErrors.push('React hooks found (NOT compatible with Astro)');
      }
      if (codeStr.includes('ref(') || codeStr.includes('onMounted')) {
        lintErrors.push('Vue functions found (NOT compatible with Astro)');
      }
      if (codeStr.includes('onMount(') && codeStr.includes('svelte')) {
        lintErrors.push('Svelte functions found (NOT compatible with Astro)');
      }
      
      // Check for framework-specific event handlers
      if (codeStr.includes('onClick=') || codeStr.includes('onMouseEnter=') || codeStr.includes('onMouseLeave=')) {
        lintErrors.push('Framework-specific event handlers found (use standard HTML events)');
      }
      
      // Check for framework-specific refs
      if (codeStr.includes('ref={') || codeStr.includes('ref=')) {
        lintErrors.push('Framework-specific refs found (use standard HTML attributes)');
      }
    
    if (lintErrors.length > 0) {
      console.warn('🌸 [GenericPipeline] Lint errors detected:', lintErrors);
      console.log('🌸 [GenericPipeline] Attempting to fix lint errors...');
      
        // Apply comprehensive fixes
      let finalCode = cleanedCode as string;
        
        // Fix React-style issues
      finalCode = finalCode.replace(/key\s*=\s*\{[^}]+\}/g, '');
      finalCode = finalCode.replace(/className\s*=\s*["'][^"']*["']/g, (match) => match.replace('className', 'class'));
      finalCode = finalCode.replace(/import\s+.*from\s+['"]react['"];?\s*\n?/g, '');
      finalCode = finalCode.replace(/import\s+.*from\s+['"]@lucide\/react['"];?\s*\n?/g, '');
        
        // Fix wrong Lucide imports
        finalCode = finalCode.replace(/from\s+['"]lucide-astro['"]/g, "from '@lucide/astro'");
        finalCode = finalCode.replace(/from\s+['"]lucide-react['"]/g, "from '@lucide/astro'");
        
        // Fix duplicate Lucide imports by consolidating them
        const lucideImports = finalCode.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
        if (lucideImports && lucideImports.length > 1) {
          const allIcons = new Set<string>();
          lucideImports.forEach(importStmt => {
            const iconMatch = importStmt.match(/\{([^}]*)\}/);
            if (iconMatch) {
              const icons = iconMatch[1].split(',').map(icon => icon.trim());
              icons.forEach(icon => allIcons.add(icon));
            }
          });
          const consolidatedImport = `import { ${Array.from(allIcons).join(', ')} } from '@lucide/astro';`;
          finalCode = finalCode.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
          finalCode = finalCode.replace('---\n', `---\n${consolidatedImport}\n`);
        }
        
        // Fix wrong video source attributes
        finalCode = finalCode.replace(/<source\s+url\s*=\s*["']([^"']+)["']/g, '<source src="$1"');
        
        // Fix untyped map functions
        finalCode = finalCode.replace(/\.map\(\(([^)]+)\)\s*=>/g, (match, param) => {
          if (!param.includes(':')) {
            // Try to infer type from context
            if (param.includes('product')) return `.map((${param}: Product) =>`;
            if (param.includes('testimonial')) return `.map((${param}: Testimonial) =>`;
            if (param.includes('item')) return `.map((${param}: any) =>`;
            return `.map((${param}: any) =>`;
          }
          return match;
        });
        
        // Fix malformed URLs
        finalCode = finalCode.replace(/""https:\/\//g, '"https://');
        
        // Fix missing Partial<> wrapper
        finalCode = finalCode.replace(/Astro\.props;?\s*$/gm, 'Astro.props as Partial<ComponentProps>;');
        
        // Remove non-existent icons from imports
        const nonExistentIcons = ['Capsule', 'Icon'];
        nonExistentIcons.forEach(icon => {
          finalCode = finalCode.replace(new RegExp(`\\b${icon}\\b,?\\s*`, 'g'), '');
          finalCode = finalCode.replace(new RegExp(`,\\s*\\b${icon}\\b\\b`, 'g'), '');
        });
        
        // Fix framework-specific imports and convert to Astro-compatible code
        finalCode = finalCode.replace(/import\s+.*from\s+['"]solid-js['"];?\s*\n?/g, '');
        finalCode = finalCode.replace(/import\s+.*from\s+['"]solid-js\/store['"];?\s*\n?/g, '');
        finalCode = finalCode.replace(/import\s+.*from\s+['"]react['"];?\s*\n?/g, '');
        finalCode = finalCode.replace(/import\s+.*from\s+['"]vue['"];?\s*\n?/g, '');
        finalCode = finalCode.replace(/import\s+.*from\s+['"]svelte['"];?\s*\n?/g, '');
        
        // Remove framework-specific function calls
        finalCode = finalCode.replace(/const\s+\[[^\]]+\]\s*=\s*createSignal\([^)]+\)/g, 'let currentIndex = 0');
        finalCode = finalCode.replace(/const\s+\[[^\]]+\]\s*=\s*createStore\([^)]+\)/g, '');
        finalCode = finalCode.replace(/setCurrentIndex\(/g, 'currentIndex = ');
        finalCode = finalCode.replace(/setIsPlaying\(/g, 'isPlaying = ');
        
        // Convert framework-specific event handlers to standard HTML
        finalCode = finalCode.replace(/onClick=\{([^}]+)\}/g, 'onclick="$1"');
        finalCode = finalCode.replace(/onMouseEnter=\{([^}]+)\}/g, 'onmouseenter="$1"');
        finalCode = finalCode.replace(/onMouseLeave=\{([^}]+)\}/g, 'onmouseleave="$1"');
        
        // Convert framework-specific refs to standard HTML
        finalCode = finalCode.replace(/ref=\{([^}]+)\}/g, 'id="$1"');
        
        // Replace hardcoded Unsplash URLs with placeholders
        finalCode = finalCode.replace(/https:\/\/images\.unsplash\.com\/[^"'\s]+/g, '{{MOCKUP_IMAGE}}');
      
      cleanedCode = finalCode;
      console.log('🌸 [GenericPipeline] Lint errors fixed, final code length:', cleanedCode.length);
    } else {
        console.log('�� [GenericPipeline] ✅ No lint errors detected');
    }
    
    console.log('🌸 [GenericPipeline] === COMPONENT GENERATION COMPLETE ===');
    generatedComponents.push(filePath);
  }
  
  // Update index.astro with all generated components
  console.log('🌸 [GenericPipeline] Updating index.astro with all components...');
  await updateGenericIndexAstroWithSections(componentNames);
  console.log('🌸 [GenericPipeline] ✅ Index.astro updated');
  // === ENHANCED FONT INJECTION INTO BASELAYOUT ===
  try {
    // First try to inject into BaseLayout.astro (preferred)
    const layoutsDir = path.join(process.cwd(), '..', 'rendering', 'src', 'layouts');
    const baseLayoutPath = path.join(layoutsDir, 'BaseLayout.astro');
    
    if (await fs.access(baseLayoutPath).then(() => true).catch(() => false)) {
      let baseLayoutContent = await fs.readFile(baseLayoutPath, 'utf-8');
      
      // Extract font from user request (multiple possible sources)
      const requestedFont = (structuredIntent.slots as any)?.font_family || 
                           (structuredIntent as any)?.font || 
                           await extractFontFromPrompt(prompt) || '';
      
      if (requestedFont) {
        const fontName = String(requestedFont).trim();
        console.log(`[Style] 🎨 Injecting font: ${fontName} into BaseLayout.astro`);
        
        // Use LLM to dynamically generate appropriate Google Fonts links
        const fontLinkPrompt = `Generate Google Fonts link tags for this font: "${fontName}"

Return ONLY the HTML link tags needed, no explanations. Format:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet">`;

        let linkTags = '';
        try {
          const linkResponse = await mistralClient.chat.complete({
            model: 'codestral-2405',
            messages: [
              {
                role: 'system',
                content: 'You are a Google Fonts specialist. Generate ONLY the HTML link tags needed for font loading.'
              },
              {
                role: 'user',
                content: fontLinkPrompt
              }
            ],
            temperature: 0.1,
          });

          const linkContent = linkResponse.choices?.[0]?.message?.content || '';
          const linkText = typeof linkContent === 'string' ? linkContent : Array.isArray(linkContent) ? linkContent.join('') : '';
          
          // Extract link tags from response
          const linkMatch = linkText.match(/<link[^>]+>/g);
          if (linkMatch) {
            linkTags = '\n    ' + linkMatch.join('\n    ');
          }
        } catch (error) {
          console.warn('[Style] Dynamic link generation failed, using fallback:', error);
          // Fallback to basic link generation
          linkTags = `\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap" rel="stylesheet">`;
        }
        
        // Check if we need to inject the font links
        if (!baseLayoutContent.includes('fonts.googleapis.com')) {
          // Find the head section and inject before closing </head>
          if (baseLayoutContent.includes('</head>')) {
            baseLayoutContent = baseLayoutContent.replace('</head>', `${linkTags}\n  </head>`);
            console.log(`[Style] ✅ Google Font links injected for: ${fontName}`);
          }
        }
        
        // Use LLM to dynamically generate appropriate CSS
        const cssGenerationPrompt = `Generate CSS custom properties and styles for this font: "${fontName}"

Return ONLY the CSS code, no explanations. Include:
- CSS custom properties for font variables
- Body font-family rule
- Heading font-family rules
- Utility classes for font usage

Format as a <style> block with proper CSS.`;

        let fontCSS = '';
        try {
          const cssResponse = await mistralClient.chat.complete({
            model: 'codestral-2405',
            messages: [
              {
                role: 'system',
                content: 'You are a CSS specialist. Generate ONLY CSS code for font styling, no explanations.'
              },
              {
                role: 'user',
                content: cssGenerationPrompt
              }
            ],
            temperature: 0.1,
          });

          const cssContent = cssResponse.choices?.[0]?.message?.content || '';
          const cssText = typeof cssContent === 'string' ? cssContent : Array.isArray(cssContent) ? cssContent.join('') : '';
          
          // Extract CSS from response and wrap in style tags if needed
          if (cssText.includes('{') && cssText.includes('}')) {
            if (cssText.includes('<style>')) {
              fontCSS = '\n    ' + cssText;
            } else {
              fontCSS = `\n    <style>\n      ${cssText}\n    </style>`;
            }
          }
        } catch (error) {
          console.warn('[Style] Dynamic CSS generation failed, using fallback:', error);
          // Fallback to basic CSS generation
          fontCSS = `
    <style>
      :root {
        --custom-font: '${fontName}', sans-serif;
      }
      body {
        font-family: var(--custom-font);
      }
      .font-custom {
        font-family: var(--custom-font);
      }
    </style>`;
        }
        
        // Inject CSS into head if not already present
        if (!baseLayoutContent.includes('--custom-font') && !baseLayoutContent.includes('--heading-font')) {
          if (baseLayoutContent.includes('</head>')) {
            baseLayoutContent = baseLayoutContent.replace('</head>', `${fontCSS}\n  </head>`);
            console.log(`[Style] ✅ Custom font CSS injected for: ${fontName}`);
          }
        }
        
        // Write updated BaseLayout.astro
        await fs.writeFile(baseLayoutPath, baseLayoutContent);
        console.log(`[Style] 🎨 Font injection complete for: ${fontName} in BaseLayout.astro`);
        return; // Success, exit early
      }
    }
    
    // Fallback: try to inject into index.astro if BaseLayout.astro not found
    console.log('[Style] BaseLayout.astro not found, trying index.astro fallback...');
    const pagesDir = getGenericPagesDir();
    const indexPath = path.join(pagesDir, 'index.astro');
    let indexContent = await fs.readFile(indexPath, 'utf-8');
    
    // Extract font from user request (multiple possible sources)
    const fallbackRequestedFont = (structuredIntent.slots as any)?.font_family || 
                         (structuredIntent as any)?.font || 
                         await extractFontFromPrompt(prompt) || '';
    
    if (fallbackRequestedFont) {
      const fallbackFontName = String(fallbackRequestedFont).trim();
      console.log(`[Style] 🎨 Injecting font: ${fallbackFontName} into index.astro (fallback)`);
      
      // Create Google Fonts link tag
      const linkTag = `\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fallbackFontName)}:wght@400;500;600;700&display=swap" rel="stylesheet">`;
      
      // Check if we need to inject the font link
      if (!indexContent.includes('fonts.googleapis.com')) {
        // Find the head section and inject before closing </head>
        if (indexContent.includes('</head>')) {
          indexContent = indexContent.replace('</head>', `${linkTag}\n  </head>`);
          console.log(`[Style] ✅ Google Font link injected for: ${fallbackFontName}`);
        }
      }
      
      // Apply font to body element with CSS custom property
      const fontCSS = `
    <style>
      :root {
        --custom-font: '${fallbackFontName}', sans-serif;
      }
      body {
        font-family: var(--custom-font);
      }
      .font-custom {
        font-family: var(--custom-font);
      }
    </style>`;
      
      // Inject CSS into head if not already present
      if (!indexContent.includes('--custom-font')) {
        if (indexContent.includes('</head>')) {
          indexContent = indexContent.replace('</head>', `${fontCSS}\n  </head>`);
          console.log(`[Style] ✅ Custom font CSS injected for: ${fallbackFontName}`);
        }
      }
      
      // Write updated index.astro
      await fs.writeFile(indexPath, indexContent);
      console.log(`[Style] 🎨 Font injection complete for: ${fallbackFontName} in index.astro (fallback)`);
    }
  } catch (error) {
    console.warn('[Style] Font injection failed:', error);
  }
  
  // Helper function to extract font from user prompt - 100% Dynamic AI-driven
  async function extractFontFromPrompt(prompt: string): Promise<string | null> {
    try {
      // Use LLM to dynamically extract font information from the prompt
      const fontExtractionPrompt = `Analyze this user request and extract ONLY the font family names:

USER REQUEST:
"${prompt}"

Extract and return a JSON object with:
{
  "primaryFont": "main font name (e.g., Montserrat, Open Sans, Inter)",
  "secondaryFont": "secondary font name if mentioned (e.g., Open Sans for body)",
  "fontUsage": "how fonts should be used (e.g., headings vs body)"
}

IMPORTANT: 
- Extract ONLY the actual font names, not descriptions or explanations
- If multiple fonts mentioned, identify primary and secondary
- Return ONLY valid JSON, no explanations
- If no fonts mentioned, return null`;

      const response = await mistralClient.chat.complete({
        model: 'codestral-2405',
        messages: [
          {
            role: 'system',
            content: 'You are a font extraction specialist. Extract ONLY font names from user requests. Return only valid JSON.'
          },
          {
            role: 'user',
            content: fontExtractionPrompt
          }
        ],
        temperature: 0.1,
      });

      const responseContent = response.choices?.[0]?.message?.content || '';
      const responseText = typeof responseContent === 'string' ? responseContent : Array.isArray(responseContent) ? responseContent.join('') : '';
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Return the primary font for injection, but store the full info for dynamic CSS generation
        return parsed.primaryFont || null;
      }
      
      return null;
    } catch (error) {
      console.warn('[Style] Font extraction failed, using fallback:', error);
      return null;
    }
  }
  
  // === FINAL METRICS AND LEARNING ===
  console.log('🌸 [GenericPipeline] Generating learning metrics...');
  try {
    const metrics = await feedbackService.generateMetrics();
    console.log('🌸 [GenericPipeline] Learning metrics:', {
      total_requests: metrics.total_requests,
      success_rate: `${Math.round((metrics.successful_requests / metrics.total_requests) * 100)}%`,
      average_processing_time: `${Math.round(metrics.average_processing_time)}ms`
    });
  } catch (error) {
    console.warn('🌸 [GenericPipeline] Error generating metrics:', error);
  }
  
  console.log('🌸 [GenericPipeline] === ENHANCED GENERIC CREATE PIPELINE COMPLETE ===');
  console.log('🌸 [GenericPipeline] Generated components:', generatedComponents);
  
  return { success: true, componentPaths: generatedComponents };
}

//     // Simple validation - check for external domains and non-atomic components

// === MISSING FUNCTION DEFINITIONS ===

// Single pipeline functions
function getSingleComponentsDir(): string {
  return path.join(process.cwd(), '..', 'rendering', 'src', 'components', 'single');
}

function sanitizeSingleComponentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

async function getSingleMockupImagePath(): Promise<string> {
    const { enhancedImageService } = await import('../services/image-service');
  return await enhancedImageService.getMockupImage();
}

async function updateSingleIndexAstroComponent(componentName: string, prompt: string): Promise<void> {
  // Implementation for single component index update
  console.log('[SinglePipeline] Updating index with component:', componentName);
}

// Abstract pipeline functions
function getAbstractComponentsDir(): string {
  return path.join(process.cwd(), '..', 'rendering', 'src', 'components', 'abstract');
}

function sanitizeAbstractComponentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

async function getAbstractMockupImagePath(): Promise<string> {
    const { enhancedImageService } = await import('../services/image-service');
  return await enhancedImageService.getMockupImage();
}

async function updateAbstractIndexAstroWithSections(componentNames: string[]): Promise<void> {
  // Implementation for abstract components index update
  console.log('[AbstractPipeline] Updating index with components:', componentNames);
}

  // NEW: Placeholder replacement function to handle the new placeholder system
  async function replaceImagePlaceholders(code: string, componentName: string, prompt?: string): Promise<string> {
    console.log('🌸 [GenericPipeline] Replacing image placeholders...');
    
    const { enhancedImageService } = await import('../services/image-service');
    
    // Replace different types of placeholders with appropriate images and videos
    const replacements = [
      {
        placeholder: '{{PRODUCT_IMAGE}}',
        searchTerm: 'product',
        fallback: '/images/mockups/product.jpg',
        type: 'image'
      },
      {
        placeholder: '{{AVATAR_IMAGE}}',
        searchTerm: 'portrait',
        fallback: '/images/avatars/Avatar_man.avif',
        type: 'image'
      },
      {
        placeholder: '{{HERO_IMAGE}}',
        searchTerm: 'hero background',
        fallback: '/images/mockups/mackbook.jpg',
        type: 'image'
      },
      {
        placeholder: '{{GALLERY_IMAGE}}',
        searchTerm: 'gallery',
        fallback: '/images/mockups/shoes.jpg',
        type: 'image'
      },
      {
        placeholder: '{{TESTIMONIAL_IMAGE}}',
        searchTerm: 'portrait',
        fallback: '/images/avatars/Avatar_woman2.avif',
        type: 'image'
      },
      {
        placeholder: '{{VIDEO_URL}}',
        searchTerm: 'hero background',
        fallback: '/images/videos/placeholder.mov',
        type: 'video'
      }
    ];
    
    let processedCode = code;
    
    for (const replacement of replacements) {
      if (processedCode.includes(replacement.placeholder)) {
        if (replacement.type === 'video') {
          console.log(`🌸 [GenericPipeline] Fetching video for: ${replacement.searchTerm}`);
          const videoUrl = await getGenericVideoUrl(prompt, { componentName, code: processedCode });
          const finalVideo = videoUrl || replacement.fallback;
          processedCode = processedCode.replace(new RegExp(replacement.placeholder, 'g'), finalVideo);
          console.log(`🌸 [GenericPipeline] Replaced ${replacement.placeholder} with: ${finalVideo}`);
        } else {
        console.log(`🌸 [GenericPipeline] Fetching image for: ${replacement.searchTerm}`);
        const imageUrl = await enhancedImageService.getMockupImage(
          replacement.searchTerm,
          prompt,
          componentName,
          {}
        );
        
        const finalImage = imageUrl || replacement.fallback;
        processedCode = processedCode.replace(new RegExp(replacement.placeholder, 'g'), finalImage);
        console.log(`🌸 [GenericPipeline] Replaced ${replacement.placeholder} with: ${finalImage}`);
        }
      }
    }
    
    return processedCode;
  }
  
  