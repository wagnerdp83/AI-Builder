/**
 * This module is responsible for building a detailed, context-rich prompt 
 * for the Codestral API, based on the user's request and the component's code.
 */

interface FewShotExample {
  userRequest: string;
  originalCode: string;
  updatedCode: string;
}

// Few-shot examples to guide the model's output format and quality.
const examples: FewShotExample[] = [
  {
    userRequest: 'Change the headline to "Welcome to the Future"',
    originalCode: '<h1>An old headline</h1>',
    updatedCode: '<h1>Welcome to the Future</h1>',
  },
  {
    userRequest: 'Make the primary button background blue',
    originalCode: '<button class="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-first text-white">Get Started</button>',
    updatedCode: '<button class="py-3 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white">Get Started</button>',
  },
];

/**
 * Builds a structured prompt for the Codestral API.
 * 
 * @param userRequest - The raw request from the user (e.g., "edit hero headline to...").
 * @param componentCode - The full source code of the component to be edited.
 * @returns A string representing the full prompt to be sent to the API.
 */
export function buildPrompt(userRequest: string, componentCode: string): string {
  const systemInstructions = `
You are an expert web developer specializing in Astro and Tailwind CSS.
Your task is to modify the provided component code based on the user's request.
You must analyze the user's request and the original code, identify the target element(s), and apply the necessary changes.
You must return only the complete, updated, and valid Astro component code. Do not add any explanations, comments, or markdown formatting.
`.trim();

  const fewShotExamples = examples.map(ex => `
--- START OF EXAMPLE ---
[USER REQUEST]:
${ex.userRequest}

[ORIGINAL CODE]:
\`\`\`astro
${ex.originalCode}
\`\`\`

[UPDATED CODE]:
\`\`\`astro
${ex.updatedCode}
\`\`\`
--- END OF EXAMPLE ---
`).join('\n');

  const finalRequest = `
--- START OF REAL TASK ---
[USER REQUEST]:
${userRequest}

[ORIGINAL CODE]:
\`\`\`astro
${componentCode}
\`\`\`

[UPDATED CODE]:
`.trim();

  return `${systemInstructions}\n\n${fewShotExamples}\n\n${finalRequest}`;
} 