import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import { promises as fs } from 'fs';

// Load /interface/.env explicitly before anything else
dotenv.config({ path: path.join(process.cwd(), '.env') });

describe('Direct Codestral retrieval (no pipeline) - Astro components JSON', () => {
  let mistral: Mistral;

  beforeAll(() => {
    const apiKey = process.env.MISTRAL_API_KEY;
    expect(apiKey, 'MISTRAL_API_KEY must be set in /interface/.env').toBeTruthy();
    mistral = new Mistral({
      apiKey: apiKey as string,
      ...(process.env.MISTRAL_API_URL ? { baseURL: process.env.MISTRAL_API_URL } : {}),
    });
  });

  it('returns { components: { name, filename, code }[] } from codestral-2405', async () => {
    const salonRequest = [
      'Hero Section with a full-screen background video of a salon experience, overlaid with a slogan, headline, and a "Book Appointment" button',
      'About Us Block featuring a short story about the salon’s history, mission, and an image collage',
      'Stylist Showcase with profile cards for 4 featured stylists (each with name, role, Instagram link, and portrait photo)',
      'Service Menu in a 3-column layout, grouping offerings like Hair, Makeup, and Nails, each with pricing and duration',
      'Client Gallery — a horizontal scroll section with before/after transformation images',
      'Interactive Booking Widget — with dropdowns for service, stylist, date, and time, and a "Confirm Booking" button'
    ].join('\n- ');

    const system = [
      'You return ONLY valid JSON. Do not include markdown fences or text outside JSON.',
      'Create Astro components using Tailwind CSS. Return strictly this schema:',
      '{ "components": [ { "name": string, "filename": string, "code": string } ] }',
      'Rules:',
      '- code must be a COMPLETE .astro file as a single string',
      '- use Astro syntax (use class, not className)',
      '- inline Tailwind CSS utility classes in class attributes',
      '- do not include markdown code fences',
    ].join('\n');

    const user = [
      'Task: For the following requested sections, produce one Astro component per section (Tailwind CSS).',
      'Return only JSON following the schema above.',
      '',
      'Requested sections:',
      `- ${salonRequest}`,
    ].join('\n');

    const response = await mistral.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      maxTokens: 8192,
    });

    const content = response.choices?.[0]?.message?.content;
    expect(typeof content === 'string', 'Codestral response should be a string').toBe(true);

    let jsonText = content as string;
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error(`Failed to parse JSON from Codestral response:\n${jsonText}`);
    }

    expect(parsed && Array.isArray(parsed.components), 'components must be an array').toBe(true);
    for (const comp of parsed.components) {
      expect(typeof comp.name).toBe('string');
      expect(typeof comp.filename).toBe('string');
      expect(typeof comp.code).toBe('string');
      expect(comp.filename.endsWith('.astro')).toBe(true);
      expect(comp.code.includes('---') || comp.code.trim().startsWith('<')).toBe(true);
    }

    const outDir = path.join(process.cwd(), 'test-output');
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, 'codestral-components.json');
    await fs.writeFile(outPath, JSON.stringify(parsed, null, 2), 'utf-8');

    console.log('Saved JSON to:', outPath);
  }, 180000);
});