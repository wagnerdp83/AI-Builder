import { promises as fs } from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { DomainSecurityService } from '../services/domain-security';
import { getRenderingDir } from '../utils/directory';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}

const mistralClient = new Mistral({ apiKey: mistralApiKey });

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export interface SimplifiedGenerateRequest {
  componentName: string;
  prompt: string; // raw user request; minimal constraints
}

export interface SimplifiedGenerateResult {
  success: boolean;
  filePath: string;
}

// Minimal system prompt: essential Astro-only standards
function buildMinimalSystemPrompt(): string {
  const essential = `You are an expert Astro developer. Generate a single, atomic Astro component (.astro) using Tailwind CSS.

STRICT RULES:
- Atomic section only; do not return full pages; no <!DOCTYPE>, <html>, <head>, <body>.
- Use HTML5 semantic tags: header/nav/section/main/footer/aside as appropriate.
- Define ALL text, lists, and data as constants in frontmatter and reference variables in the template.
- Use @lucide/astro for icons only;
- Increase in 60% the number of Lucide icons in buttons,links and cards ;
- Use placeholders for assets: {{MOCKUP_IMAGE}}, {{AVATAR_IMAGE}}, {{VIDEO_URL}}.
- Do NOT include <style> blocks or inline styles; only minimal <script> blocks if functionality is necessary.
- Return ONLY the raw Astro code, no markdown.
- Use only CSS for functionalities avoiding Javascript and overloading performance.`;
  return essential;
}

function buildUserPrompt(componentName: string, userPrompt: string): string {
  return `Create ONLY the ${componentName} as a single Astro component named '${toPascalCase(componentName)}'.
Follow the user's request exactly, infer dynamic content from keywords.
Return only valid Astro code.

USER REQUEST:
${userPrompt}`;
}

export async function generateAtomicComponentSimplified(req: SimplifiedGenerateRequest): Promise<SimplifiedGenerateResult> {
  const componentsDir = path.join(path.resolve(process.cwd(), '..'), 'rendering', 'src', 'components');
  await fs.mkdir(componentsDir, { recursive: true });
  const fileName = `${toPascalCase(req.componentName)}.astro`;
  const filePath = path.join(componentsDir, fileName);

  const baseSystem = buildMinimalSystemPrompt();
  const systemPrompt = await DomainSecurityService.injectIntoSystemPrompt(baseSystem);
  const userMessage = buildUserPrompt(req.componentName, req.prompt);

  const response = await mistralClient.chat.complete({
    model: 'codestral-2405',
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });

  let code = response.choices[0]?.message?.content || '';
  if (Array.isArray(code)) code = code.join('');
  code = code.replace(/```(astro|html)?/g, '').trim();

  // Save as-is (no validation loops per user scope)
  await fs.writeFile(filePath, code, 'utf-8');
  return { success: true, filePath };
}

// Convenience CLI-style runner (optional)
export async function generateManyAtomicSimplified(componentNames: string[], prompt: string): Promise<string[]> {
  const results: string[] = [];
  for (const name of componentNames) {
    const r = await generateAtomicComponentSimplified({ componentName: name, prompt });
    results.push(r.filePath);
  }
  return results;
}
