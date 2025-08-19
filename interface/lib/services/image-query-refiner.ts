import { Mistral } from '@mistralai/mistralai';

export interface GalleryItemLike {
  clientName?: string;
  service?: string;
  title?: string;
  description?: string;
}

export async function refineGallerySearch(item: GalleryItemLike, prompt?: string): Promise<string> {
  const base = buildHeuristic(item);
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return base;
  try {
    const client = new Mistral({ apiKey });
    const system = 'Refine a short, specific Unsplash search query. Return only the query, no markdown.';
    const user = `User request: ${prompt || ''}
Item:
${JSON.stringify(item)}
Heuristic query: ${base}
Return a concise query (<=6 words) that best finds a relevant photo for the item.`;
    const resp = await client.chat.complete({
      model: 'codestral-2405',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.1,
    });
    const refined = (resp.choices?.[0]?.message?.content || '').trim();
    return refined || base;
  } catch {
    return base;
  }
}

function buildHeuristic(item: GalleryItemLike): string {
  const parts: string[] = [];
  if (item.service) parts.push(item.service);
  if (item.clientName) parts.push(item.clientName);
  if (item.title) parts.push(item.title);
  if (item.description) parts.push(item.description);
  const phrase = parts.join(' ').trim();
  return phrase || 'before after transformation';
}

