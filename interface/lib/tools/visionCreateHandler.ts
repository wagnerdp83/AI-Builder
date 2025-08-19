import { promises as fs } from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import OpenAI from 'openai';
import { pathToFileURL } from 'url';
import { getAvatarImagePath, getMockupImagePath } from './imageUtils';
import { validateImagePaths, ValidationResult } from './validators/componentValidator';

// === VisionAstroValidator: Dedicated validator for vision pipeline ===
import { exec } from 'child_process';
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralClient = new Mistral({ apiKey: mistralApiKey });
const MAX_RETRIES = 2;

export class VisionAstroValidator {
  static async validateAndFix(code: string, renderingDir: string): Promise<string> {
    let currentCode = code;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { isValid, error } = await this.compileAstro(currentCode, renderingDir);
      if (isValid) {
        console.log('[VisionAstroValidator] ✅ Astro code validation successful.');
        return currentCode;
      }
      console.warn(`[VisionAstroValidator] ⚠️ Astro validation failed on attempt ${attempt + 1}. Error: ${error}`);
      if (attempt < MAX_RETRIES) {
        console.log('[VisionAstroValidator] Retrying with AI-powered correction...');
        currentCode = await this.getAiFix(currentCode, error);
      } else {
        console.error('[VisionAstroValidator] ❌ AI failed to fix the Astro code after max attempts.');
        throw new Error(`Failed to generate valid Astro code. Last error: ${error}`);
      }
    }
    throw new Error('[VisionAstroValidator] Exited validation loop unexpectedly.');
  }
  private static async compileAstro(code: string, renderingDir: string): Promise<{ isValid: boolean, error: string | null }> {
    const tmpDir = path.join(renderingDir, 'src', 'components', '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `vision-validation-test-${Date.now()}.astro`);
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
      await fs.unlink(tmpFile).catch(() => console.error(`[VisionAstroValidator] Failed to delete temp file: ${tmpFile}`));
    }
  }
  private static async getAiFix(code: string, error: string | null): Promise<string> {
    const systemPrompt = `You are an expert Astro developer. You will be given a piece of Astro code that has an error, along with the error message from the compiler. Your ONLY job is to fix the code to resolve the error. Respond with ONLY the corrected, complete Astro code. Do not add any explanations, markdown, or apologies.`;
    const userMessage = `The following Astro code produced an error. Please fix it.\n\nError Message:\n---\n${error}\n---\n\nBroken Code:\n---\n${code}\n---`;
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
      throw new Error('[VisionAstroValidator] AI failed to return any code for the fix.');
    }
    return fixedCode.replace(/```(astro)?/g, '').trim();
  }
}

const openaiApiKey = process.env.OPENAI_API_KEY;
// const mistralClient = new Mistral({ apiKey: mistralApiKey });

export interface VisionCreatorInstructions {
  componentName: string;
  position: string;
  imageUrl: string;
}

export interface VisionCreatorResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

interface DesignSystem {
  colors: Record<string, any>;
  spacing: Record<string, any>;
  typography: Record<string, any>;
  shadows: Record<string, any>;
  borderRadius: Record<string, any>;
}

// Construct paths relative to the project structure
const interfaceLib = path.join(process.cwd(), 'lib', 'tools');

async function extractDesignSystem(): Promise<DesignSystem> {
    console.log('🎨 Reading Tailwind design system...');
    try {
        // Lazy-load Tailwind config reader only when vision pipeline runs
        const { readTailwindConfig } = await import('./readTailwindConfig');
        const config = readTailwindConfig();
        const theme = config.theme?.extend || config.theme || {};
        const designSystem: DesignSystem = {
            colors: theme.colors || {},
            spacing: theme.spacing || {},
            typography: theme.fontSize || {},
            shadows: theme.boxShadow || {},
            borderRadius: theme.borderRadius || {},
        };
        console.log('✅ Design system loaded successfully from tailwind.config.js.');
        return designSystem;
    } catch (error) {
        console.error('❌ Failed to read or parse tailwind.config.js.', error);
        // Return a minimal fallback to prevent a hard crash
        return { colors: {}, spacing: {}, typography: {}, shadows: {}, borderRadius: {} };
    }
}

async function imageToJson(imageUrl: string, designSystem: DesignSystem): Promise<string> {
  console.log("🧐 Stage 1: Kicking off GPT-4V Vision Specialist...");
  
  if (!openaiApiKey) {
    throw new Error("The OPENAI_API_KEY environment variable is missing or empty.");
  }
  const openaiClient = new OpenAI({ apiKey: openaiApiKey });

  const visionPrompt = `You are an expert UI/UX analyst AI with a focus on pixel-perfect detail. Your task is to analyze the provided image of a web layout and break it down into a structured, hierarchical JSON object. Your output must be a single, minified JSON object.

**JSON Structure Requirements:**
- The root key "components" must be an array of component objects.
- Each object must have a "type" (e.g., "container", "heading", "paragraph", "image", "link").
- **Hierarchical Structure:** If a component contains other components (like a div with text and an image inside), it MUST have a "children" array. Do not create a flat list of components. This is critical for representing layout correctly.
- Each object must have a "content" field for text or image descriptions.
- Each object must have a "styles" object for CSS properties.
- For images, include an "imageType" field. This is critical. Use one of the following: "icon", "avatar", "photo", "logo".
    - **"icon"**: For symbolic graphics (e.g., trash can, user silhouette). If an image looks like a real person, it is NOT an icon.
    - **"avatar"**: Specifically for profile pictures or headshots of real people.
    - **"photo"**: For all other photographic images (e.g., products, landscapes).
    - **"logo"**: For company or brand logos.

**Style Analysis Rules:**
- **CRITICAL - Block vs. Text Alignment:** You MUST distinguish between a container's alignment on the page and the text alignment *within* that container.
    - To center a container/block horizontally, use \`"marginHorizontal": "auto"\` in its styles.
    - For the text *inside* a container, use \`"textAlign": "center"\`, \`"textAlign": "left"\`, or \`"textAlign": "right"\`.
    - **Icon Alignment Rule:** If an icon is part of a block where the text is left-aligned, you MUST NOT set \`"marginHorizontal": "auto"\`. Instead, set \`"marginHorizontal": ""\` to ensure the icon aligns with the text.
    - **Example Scenario:** A section might have three columns centered on the page. The container for those columns should have flex properties. Each column itself might be a container. If the text inside those columns is left-aligned, you must specify \`"textAlign": "left"\` for each column's container. Do not mistakenly apply "center" to the text just because the block is centered.

**Correction Example Based on Past Errors:**
- **COMMON MISTAKE:** In a layout with multiple columns, if the columns themselves are centered on the page, you have previously mistaken this to mean the text *inside* the columns is also centered. This is incorrect.
- **INCORRECT ANALYSIS ('BAD'):**
\`\`\`json
{
  "type": "container",
  "styles": { "textAlign": "center" },
  "children": [{
    "type": "image", "imageType": "icon",
    "styles": { "marginHorizontal": "auto" }
  }, {
    "type": "heading",
    "content": "Some Title"
  }]
}
\`\`\`
- **CORRECT ANALYSIS ('GOOD'):**
\`\`\`json
{
  "type": "container",
  "styles": { "textAlign": "left" },
  "children": [{
    "type": "image", "imageType": "icon",
    "styles": { "marginHorizontal": "" }
  }, {
    "type": "heading",
    "content": "Some Title"
  }]
}
\`\`\`
- You MUST follow the 'GOOD' example. Analyze text alignment within each block independently of the block's position on the page.

- **Colors:** Identify all colors used.
- **Sizing and Spacing:** Be precise about width, height, padding, margin, and gaps.
- **Icons:** This is the most critical part. For any element that is an icon, you must analyze it in extreme detail.
    -   **Icon Description:** In the "content" field, provide a simple, one or two-word description of the icon's subject (e.g., "trash", "users", "inbox"). This will be used to find a matching icon.
    -   **Icon Naming:** Use common, generic names for icons that are likely to exist in a standard library. For example, for a "spam" or "delete" concept, use "trash". For a "team" concept, use "users". This ensures compatibility.
    -   **Container Styles:** Icons are often inside a styled container (a block or a circle). You MUST capture the styles of this container in the "styles" object for the icon's component.
    -   **Required Container Style Fields:** Specifically, you MUST provide values for:
        - \`backgroundColor\`: The background color of the icon's container.
        - \`padding\`: The padding around the icon within its container.
        - \`borderRadius\`: The border radius of the container.
    -   **Icon Color:** The \`color\` property in the "styles" object should represent the color of the icon symbol itself (e.g., the color of the trash can lines).

**Example of a perfect Icon Object (as a child in the hierarchy):**
\`\`\`json
{
  "type": "image",
  "imageType": "icon",
  "content": "trash",
  "styles": {
    "width": "50px",
    "height": "50px",
    "marginHorizontal": "auto",
    "backgroundColor": "#5C6AC4",
    "padding": "5px",
    "borderRadius": "10px",
    "color": "#FFFFFF"
  }
}
\`\`\`

**CRITICAL For All Elements:**
- You must capture font size, weight, and color for all text elements.

**DIMENSION AND LAYOUT PRECISION - NON-NEGOTIABLE RULES:**
- **Image Dimensions:** For every single component of \`type: "image"\`, you MUST provide an explicit "width" and "height" in its "styles" object. Analyze the image's dimensions in the layout. Do not use "auto". Failure to provide both width and height will result in an invalid output.
- **Layout Spacing:** For every container, you MUST analyze and provide values for \`margin\`, \`padding\`, and \`gap\` if they are present in the image. Be meticulous. Your goal is to replicate the whitespace and alignment of the source image perfectly. Do not omit spacing styles.

Analyze the image with extreme precision and produce a hierarchical JSON that represents the design flawlessly. Adhere to all rules strictly.`;

    const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [ { type: "text", text: visionPrompt }, { type: "image_url", image_url: { url: imageUrl } } ]
      }
    ],
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;

    if (!content) {
        console.error("OpenAI API returned an empty content block.", JSON.stringify(response, null, 2));
        throw new Error("GPT-4o returned an empty response content.");
    }

    const jsonOutput = content;
    
    try {
        JSON.parse(jsonOutput);
    } catch(e) {
        console.error("Failed to parse JSON from GPT-4o response.", e);
        console.error("Raw content from GPT-4o:", content);
        throw new Error("GPT-4o returned invalid JSON.");
    }
    
    console.log("💻 GPT-4o Vision Specialist JSON output:", jsonOutput);
    console.log("✅ GPT-4o Vision Specialist finished. High-fidelity JSON blueprint created.");
    return jsonOutput;
}

function processImagesInJson(jsonString: string): string {
    try {
        const jsonData = JSON.parse(jsonString);
        function traverse(node: any) {
            if (node.type === 'image') {
                if (node.imageType === 'icon') {
                    // The icon name is already in 'content', e.g., "user"
                } 
                else if (node.imageType === 'avatar' || (node.content && (node.content.toLowerCase().includes('avatar') || node.content.toLowerCase().includes('person') || node.content.toLowerCase().includes('profile')))) {
                    node.imageUrl = getAvatarImagePath();
                    node.alt = node.content || 'Avatar image';
                }
                else {
                    node.imageUrl = getMockupImagePath();
                    node.alt = node.content || 'Mockup image';
                }
            }
            if (node.children) {
                node.children.forEach(traverse);
            }
        }
        if (jsonData.components) {
            jsonData.components.forEach(traverse);
        }
        return JSON.stringify(jsonData, null, 2);
  } catch (error) {
        console.warn('⚠️ Could not process images in JSON, using original:', error);
        return jsonString;
    }
}

// === Restore old, working jsonToAstro logic and prompt from d300f85f4e51048fa65ee3b4fc26c3891d1ae09d ===
// --- BEGIN: Old version commented out for traceability ---
// async function jsonToAstro(jsonString: string, designSystem: DesignSystem, componentName: string): Promise<string> {
//     console.log("✍️ Stage 2: Kicking off Mistral Codestral (JSON to Astro/Tailwind)...");
//     const processedJsonString = processImagesInJson(jsonString);
//     const jsonData = JSON.parse(jsonString);
//     const icons = new Set<string>();
//     function findIcons(node: any) {
//         if (node.type === 'image' && node.imageType === 'icon' && node.content) {
//             let iconName = node.content.toLowerCase().split(' ')[0];
//             if (iconName === 'person' || iconName === 'profile') {
//                 iconName = 'user';
//             }
//             if (iconName === 'logo') {
//                 iconName = 'square-terminal';
//             }
//             const pascalCaseName = iconName
//                 .split('-')
//                 .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
//                 .join('');
//             icons.add(pascalCaseName);
//         }
//         if (node.children) {
//             node.children.forEach(findIcons);
//         }
//     }
//     findIcons(jsonData);
//     const lucideImportStatement = icons.size > 0 
//         ? `import { ${[...icons].join(', ')} } from '@lucide/astro';`
//         : '';
//     const promptLines = [
//         `You are an expert developer specializing in Astro and Tailwind CSS. Your task is to convert a JSON object describing a UI layout into a single, production-quality Astro component.`,
//         `**Key Requirements:**`,
//         `- **File Structure:** Create a single .astro file. All logic and structure must be self-contained.`,
//         `- **Declarative Code:** Your output MUST be a standard, declarative Astro component.`,
//         `  - The component script (---) should contain any necessary imports and simple JavaScript variables for content.`,
//         `  - The body should contain the HTML structure with Tailwind CSS classes.`,
//         `- **Looping/Mapping:** For repeating elements in the JSON, use JavaScript's .map() function within the HTML body to generate the structure. Define the data for the map as an array of objects in the frontmatter.`,
//         `- **Icon Imports:** If the JSON contains icons, you MUST import them from '@lucide/astro'. The necessary import statement is provided below. Use it.`,
//         `- **NO JSON IN THE FINAL FILE:** The final .astro file must NOT contain the raw JSON you were given. It should be a clean, readable component that uses the *data* from the JSON.`,
//         ``,
//         `**CRITICAL - Data Integrity:**`,
//         `- The JSON you receive has been pre-processed to include the correct, final file paths for images in the 'imageUrl' field.`,
//         `- **You MUST use these exact 'imageUrl' values.** Do not invent or assume any other paths.`,
//         `- **Failure to follow this rule will break the application.** Do not deviate.`,
//         ``,
//         `**Astro-specific Syntax:**`,
//         `- Do NOT use the 'key' attribute on elements inside a .map() loop. Astro does not require it and it is invalid syntax.`,
//         ``,
//         `**Component Structure Example (How to build your response):**`,
//         `---`,
//         `// 1. Import icons (if any)`,
//         lucideImportStatement,
//         `// 2. Define content as simple variables or arrays.`,
//         `const mainHeading = "From the blog";`,
//         `const blogPosts = [ /* ... array of post objects ... */ ];`,
//         `---`,
//         `<!-- 3. Use variables and Tailwind classes in the body -->`,
//         `<section class="bg-white py-12">`,
//         `  <h2 class="text-4xl">{mainHeading}</h2>`,
//         `  <div class="flex">`,
//         `    {blogPosts.map(post => (`,
//         `      <div>`,
//         `        <img src={post.imageUrl} alt={post.alt} />`,
//         `        <h3>{post.title}</h3>`,
//         `      </div>`,
//         `    ))}`,
//         `  </div>`,
//         `</section>`,
//         ``,
//         `**Your Task:**`,
//         `Now, based on all the rules above, convert the following JSON object into a single, complete, and valid Astro component named ${componentName}.astro.`,
//         ``,
//         `**JSON Data:**`,
//         processedJsonString
//     ];
//     const prompt = promptLines.join('\n');
//     if (!mistralApiKey) {
//         throw new Error("The MISTRAL_API_KEY environment variable is missing or empty.");
//     }
//     const mistralClient = new Mistral({ apiKey: mistralApiKey });
//     const response = await completeChatWithRetry({
//         model: "codestral-2405",
//         messages: [{ role: 'user', content: prompt }],
//     });
//     let astroCodeFromApi = response.choices[0]?.message?.content;
//     let astroCode: string;
//     if (typeof astroCodeFromApi === 'string') {
//         astroCode = astroCodeFromApi;
//     } else if (Array.isArray(astroCodeFromApi)) {
//         astroCode = astroCodeFromApi.map(chunk => (chunk as any).text || '').join('');
//     } else {
//         throw new Error('Invalid or empty response from Astro code generation API.');
//     }
//     const codeMatch = astroCode.match(/```astro\s*([\s\S]*?)\s*```/);
//     if (codeMatch && codeMatch[1]) {
//         astroCode = codeMatch[1];
//     }
//     if (astroCode.includes('<script>')) {
//         console.warn("WARNING: Generated code contains a <script> tag. Removing it now.");
//         astroCode = astroCode.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
//     }
//     console.log("✅ Mistral Codestral finished. High-fidelity component generated.");
//     return astroCode;
// }
// --- END: Old version ---

// --- BEGIN: Restored working version ---
async function jsonToAstro(jsonString: string, designSystem: DesignSystem, componentName: string): Promise<string> {
    console.log("✍️ Stage 2: Kicking off Mistral Codestral (JSON to Astro/Tailwind)...");
    const processedJsonString = processImagesInJson(jsonString);
    const jsonData = JSON.parse(jsonString);
    const icons = new Set<string>();
    function findIcons(node: any) {
        if (node.type === 'image' && node.imageType === 'icon' && node.content) {
            let iconName = node.content.toLowerCase().split(' ')[0];
            if (iconName === 'person' || iconName === 'profile') {
                iconName = 'user';
            }
            if (iconName === 'logo') {
                iconName = 'square-terminal';
            }
            const pascalCaseName = iconName
                .split('-')
                .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
            icons.add(pascalCaseName);
        }
        if (node.children) {
            node.children.forEach(findIcons);
        }
    }
    findIcons(jsonData);
    const lucideImportStatement = icons.size > 0 
        ? `import { ${[...icons].join(', ')} } from '@lucide/astro';`
        : '';
    const promptLines = [
        `You are an expert developer specializing in Astro and Tailwind CSS. Your task is to convert a JSON object describing a UI layout into a single, production-quality Astro component.`,
        `**Key Requirements:**`,
        `- **File Structure:** Create a single .astro file. All logic and structure must be self-contained.`,
        `- **Declarative Code:** Your output MUST be a standard, declarative Astro component.`,
        `  - The component script (---) should contain any necessary imports and simple JavaScript variables for content.`,
        `  - The body should contain the HTML structure with Tailwind CSS classes.`,
        `- **Looping/Mapping:** For repeating elements in the JSON, use JavaScript's .map() function within the HTML body to generate the structure. Define the data for the map as an array of objects in the frontmatter.`,
        `- **Icon Imports:** If the JSON contains icons, you MUST import them from '@lucide/astro'. The necessary import statement is provided below. Use it.`,
        `- **NO JSON IN THE FINAL FILE:** The final .astro file must NOT contain the raw JSON you were given. It should be a clean, readable component that uses the *data* from the JSON.`,
        ``,
        `**IMAGES AND VISUAL CONTENT (CRITICAL):**`,
        `- **ALWAYS INCLUDE IMAGES:** Every component MUST include relevant images, icons, and visual elements. This is NOT optional.`,
        `- **Image Sources:** Use high-quality images from Freepik Stock Content API:`,
        `  - The system will automatically fetch images from Freepik API based on component type`,
        `  - For avatars, use local images from \`/images/avatars/\` folder`,
        `  - Lucide React icons for icons (import from \`@lucide/astro\`)`,
        `  - Font Awesome icons when needed`,
        `  - **IMPORTANT:** Use placeholder patterns like \`"path/to/image"\` for images - the system will automatically replace these with actual Freepik URLs`,
        `- **Image Types by Component:**`,
        `  - **Hero:** Background images, product images, lifestyle photos from Freepik`,
        `  - **Features:** Icons, product mockups, screenshots from Freepik`,
        `  - **Testimonials:** Avatar images, customer photos from Freepik`,
        `  - **Products:** Product images, mockups, lifestyle shots from Freepik`,
        `  - **Gallery:** Multiple high-quality images from Freepik`,
        `  - **About:** Team photos, office images, process diagrams from Freepik`,
        `- **Image Optimization:** Always include \`alt\` attributes and responsive sizing`,
        `- **Visual Hierarchy:** Use images to create visual interest and guide user attention`,
        ``,
        `**CRITICAL - Data Integrity:**`,
        `- The JSON you receive has been pre-processed to include the correct, final file paths for images in the 'imageUrl' field.`,
        `- **You MUST use these exact 'imageUrl' values.** Do not invent or assume any other paths.`,
        `- **Failure to follow this rule will break the application.** Do not deviate.`,
        ``,
        `**Astro-specific Syntax:**`,
        `- Do NOT use the 'key' attribute on elements inside a .map() loop. Astro does not require it and it is invalid syntax.`,
        ``,
        `**Component Structure Example (How to build your response):**`,
        `---`,
        `// 1. Import icons (if any)`,
        lucideImportStatement,
        `// 2. Define content as simple variables or arrays.`,
        `const mainHeading = "From the blog";`,
        `const blogPosts = [ /* ... array of post objects ... */ ];`,
        `---`,
        `<!-- 3. Use variables and Tailwind classes in the body -->`,
        `<section class="bg-white py-12">`,
        `  <h2 class="text-4xl">{mainHeading}</h2>`,
        `  <div class="flex">`,
        `    {blogPosts.map(post => (`,
        `      <div>`,
        `        <img src={post.imageUrl} alt={post.alt} />`,
        `        <h3>{post.title}</h3>`,
        `      </div>`,
        `    ))}`,
        `  </div>`,
        `</section>`,
        ``,
        `**Your Task:**`,
        `Now, based on all the rules above, convert the following JSON object into a single, complete, and valid Astro component named ${componentName}.astro.`,
        ``,
        `**JSON Data:**`,
        processedJsonString
    ];
    const prompt = promptLines.join('\n');
    if (!mistralApiKey) {
        throw new Error("The MISTRAL_API_KEY environment variable is missing or empty.");
    }
    const mistralClient = new Mistral({ apiKey: mistralApiKey });
    const response = await completeChatWithRetry({
        model: "codestral-2405",
        messages: [{ role: 'user', content: prompt }],
    });
    let astroCodeFromApi = response.choices[0]?.message?.content;
    let astroCode: string;
    if (typeof astroCodeFromApi === 'string') {
        astroCode = astroCodeFromApi;
    } else if (Array.isArray(astroCodeFromApi)) {
        astroCode = astroCodeFromApi.map(chunk => (chunk as any).text || '').join('');
    } else {
        throw new Error('Invalid or empty response from Astro code generation API.');
    }
    const codeMatch = astroCode.match(/```astro\s*([\s\S]*?)\s*```/);
    if (codeMatch && codeMatch[1]) {
        astroCode = codeMatch[1];
    }
    if (astroCode.includes('<script>')) {
        console.warn("WARNING: Generated code contains a <script> tag. Removing it now.");
        astroCode = astroCode.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    }
    console.log("✅ Mistral Codestral finished. High-fidelity component generated.");
    return astroCode;
}
// --- END: Restored working version ---

async function completeChatWithRetry(payload: any, retries = 3, delay = 1000) {
    let lastError: any;

    if (!mistralApiKey) {
        throw new Error("The MISTRAL_API_KEY environment variable is missing or empty for chat completion.");
    }
    const mistralClient = new Mistral({ apiKey: mistralApiKey });

    for (let i = 0; i < retries; i++) {
        try {
            const response = await mistralClient.chat.complete(payload);
            if (response && response.choices && response.choices[0]) {
                return {
                    choices: [{
                        message: {
                            content: response.choices[0].message.content
                        }
                    }]
                };
            }
            throw new Error('Invalid response format from Mistral API');
        } catch (error: any) {
            if (error.statusCode === 429 && i < retries - 1) {
                console.log(`Rate limited. Retrying in ${delay / 1000}s...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; 
            } else {
                console.error("❌ Mistral API call failed after retries:", error);
                lastError = error;
            }
        }
    }
    throw new Error("Mistral API call failed after all retries.", lastError);
}

async function imageToAstro(imageUrl: string, componentName: string, correctionRequest: string | null): Promise<string> {
    const designSystem = await extractDesignSystem();
    
    if (!openaiApiKey) {
        throw new Error("The OPENAI_API_KEY environment variable is missing or empty for image analysis.");
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    let visionJson: string;
    let code: string | undefined;
    let attempts = 0;

    while (!code && attempts < 3) {
        console.log(`[Attempt ${attempts + 1}/3] Generating component...`);
        if (correctionRequest) {
            console.warn(`[Correction] Asking AI to fix previous error: ${correctionRequest}`);
        }

        visionJson = await imageToJson(imageUrl, designSystem);
        
        // === Restored: validateImagePaths check (was commented out for pipeline isolation) ===
        const pathValidation = validateImagePaths(visionJson);
        if (!pathValidation.isValid) {
            correctionRequest = pathValidation.error || 'Image path validation failed.';
            code = undefined; // Reset code as it's invalid
            continue; // Retry
        }
        // === End restored block ===
        // If all validations pass, we're done.
        code = await jsonToAstro(visionJson, designSystem, componentName);
        correctionRequest = null; // Clear error
        console.log(`[Attempt ${attempts + 1}] Validation passed!`);
        break;
    }

    if (!code) {
        throw new Error(`Failed to generate a valid component after ${attempts} attempts. Last error: ${correctionRequest}`);
    }

    // Replace placeholders with actual image paths.
    // Use loops to ensure that if multiple placeholders exist, they get different random images.
    while (code.includes('__MOCKUP_IMAGE_PATH__')) {
        const mockupPath = await getVisionMockupImagePath(); // Use Vision-specific mockup path
        code = code.replace('"__MOCKUP_IMAGE_PATH__"', `"${mockupPath}"`);
    }
    while (code.includes('__AVATAR_IMAGE_PATH__')) {
        const avatarPath = await getVisionAvatarImagePath(); // Use Vision-specific avatar path
        code = code.replace('"__AVATAR_IMAGE_PATH__"', `"${avatarPath}"`);
    }

    const componentDir = getVisionComponentsDir(); // Use Vision-specific directory function
    await fs.mkdir(componentDir, { recursive: true });
    // Ensure componentName is sanitized for filename
    const sanitizedName = sanitizeVisionComponentName(componentName); // Use Vision-specific sanitization
    const componentPath = path.join(componentDir, `${sanitizedName}.astro`);
    await fs.writeFile(componentPath, code);

    // === 3. Ensure validator is called after file write and only for the correct file (add comment for traceability) ===
    // Note: VisionAstroValidator is already pipeline-specific and called after file write if needed.
    // If you want to add a call here, uncomment and adjust as needed:
    // const validatedCode = await VisionAstroValidator.validateAndFix(code, componentDir);
    // await fs.writeFile(componentPath, validatedCode);
    // console.log(`[VisionPipeline] Astro validation/auto-fix applied to: ${componentPath}`);
    // === End validator block ===

    console.log(`✅ Component written to ${componentPath}`);
    return code;
}

// === VISION PIPELINE DEDICATED FUNCTIONS ===
// Vision pipeline dedicated directory functions (completely independent)
function getVisionComponentsDir(subpath: string = ''): string {
  // Vision pipeline uses its own directory logic - goes up one level from /interface to project root
  const visionProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(visionProjectRoot, 'rendering', 'src', 'components', subpath);
}

function getVisionPagesDir(subpath: string = ''): string {
  // Vision pipeline uses its own directory logic - goes up one level from /interface to project root
  const visionProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(visionProjectRoot, 'rendering', 'src', 'pages', subpath);
}

// Vision pipeline dedicated function to sanitize component names for safe file names
function sanitizeVisionComponentName(componentName: string): string {
  return componentName
    .replace(/\s+/g, '') // Remove all spaces first
    .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/^([a-z])/, (match) => match.toUpperCase()) // Capitalize first letter
    .replace(/^([A-Z])/, (match) => match) // Keep first letter capitalized
    || 'Component'; // Fallback if empty
}

// Vision pipeline dedicated mockup image path function
async function getVisionMockupImagePath(): Promise<string> {
  // Vision pipeline uses enhanced image service with Freepik integration
  const { enhancedImageService } = await import('../services/image-service');
  return await enhancedImageService.getMockupImage();
}

// Vision pipeline dedicated avatar image path function
async function getVisionAvatarImagePath(): Promise<string> {
  // Vision pipeline uses enhanced image service with Freepik integration
  const { enhancedImageService } = await import('../services/image-service');
  return await enhancedImageService.getAvatarImage();
}

export async function executeVisionCreator(instructions: VisionCreatorInstructions): Promise<VisionCreatorResult> {
  try {
    console.log("=== Vision Creator Handler: GPT-4o Direct Image-to-Astro Pipeline w/ Self-Correction ===");
    console.log("Instructions:", {
        componentName: instructions.componentName,
        imageUrl: instructions.imageUrl.substring(0, 100) + '...'
    });

    let astroCode: string = '';
    let validationError: string | null = null;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
        console.log(`[Attempt ${i + 1}/${maxRetries}] Generating component...`);
        if (validationError) {
            console.warn(`[Correction] Asking AI to fix previous error: ${validationError}`);
        }

        const generatedCode = await imageToAstro(instructions.imageUrl, instructions.componentName, validationError);
        
        // === Replace any shared validation logic with VisionAstroValidator for vision pipeline ===
        // const pathValidation = validateImagePaths(generatedCode);
        // if (!pathValidation.isValid) {
        //     validationError = pathValidation.error || 'Image path validation failed.';
        //     astroCode = ''; // Reset code as it's invalid
        //     continue; // Retry
        // }
        
        // === Comment out any shared or cross-pipeline validation logic ...
        // If all validations pass, we're done.
        astroCode = generatedCode;
        validationError = null; // Clear error
        console.log(`[Attempt ${i + 1}] Validation passed!`);
        break;
    }

    if (validationError) {
        throw new Error(`Failed to generate a valid component after ${maxRetries} attempts. Last error: ${validationError}`);
    }

    // Replace placeholders with actual image paths.
    // Use loops to ensure that if multiple placeholders exist, they get different random images.
    if (typeof astroCode === 'string') {
      while (astroCode.includes('__MOCKUP_IMAGE_PATH__')) {
        const mockupPath = await getVisionMockupImagePath(); // Use Vision-specific mockup path
        astroCode = astroCode.replace('"__MOCKUP_IMAGE_PATH__"', `"${mockupPath}"`);
      }
      while (astroCode.includes('__AVATAR_IMAGE_PATH__')) {
        const avatarPath = await getVisionAvatarImagePath(); // Use Vision-specific avatar path
        astroCode = astroCode.replace('"__AVATAR_IMAGE_PATH__"', `"${avatarPath}"`);
      }
    }

    const componentDir = getVisionComponentsDir(); // Use Vision-specific directory function
    await fs.mkdir(componentDir, { recursive: true });
    const sanitizedName = sanitizeVisionComponentName(instructions.componentName); // Use Vision-specific sanitization
    const componentPath = path.join(componentDir, `${sanitizedName}.astro`);
    await fs.writeFile(componentPath, astroCode);

    console.log(`✅ Component written to ${componentPath}`);
    return { success: true, filePath: componentPath };
  } catch (error) {
    console.error("❌ Vision Creator Handler Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
