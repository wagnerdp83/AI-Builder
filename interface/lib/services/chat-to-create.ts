// Lightweight HTML extractors to convert chat HTML into a minimal CREATE prompt
// No external dependencies; uses regex-based slicing robust enough for our chat format

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function findLandingStructureBlock(html: string): string {
  const h3Regex = /<h3[^>]*>\s*[^<]*landing page structure[^<]*<\/h3>/i;
  const startMatch = html.match(h3Regex);
  if (!startMatch) return '';
  const startIdx = startMatch.index ?? 0;
  // End at next H2 or end of document
  const after = html.slice(startIdx);
  const endH2 = after.search(/<h2[^>]*>/i);
  const block = endH2 > 0 ? after.slice(0, endH2) : after;
  return block;
}

function extractSectionsFromBlock(blockHtml: string): Array<{ title: string; content: string }>{
  const sections: Array<{ title: string; content: string }> = [];
  // Split by h4 (section titles), keep title text and following until next h4/h3
  const h4Regex = /<h4[^>]*>([\s\S]*?)<\/h4>/gi;
  let match: RegExpExecArray | null;
  const indices: Array<{ title: string; start: number; end: number }> = [];
  while ((match = h4Regex.exec(blockHtml))) {
    const titleRaw = stripTags(match[1]);
    indices.push({ title: titleRaw, start: match.index ?? 0, end: 0 });
  }
  // Determine slice ranges
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].start;
    const end = i + 1 < indices.length ? indices[i + 1].start : blockHtml.length;
    const chunk = blockHtml.slice(start, end);
    const titleMatch = /<h4[^>]*>([\s\S]*?)<\/h4>/i.exec(chunk);
    const title = titleMatch ? stripTags(titleMatch[1]) : indices[i].title;
    const body = stripTags(chunk.replace(/<h4[\s\S]*?<\/h4>/i, ''));
    sections.push({ title, content: body });
  }
  return sections;
}

function ensureHeaderFooter(sections: Array<{ title: string; content: string }>): Array<{ title: string; content: string }>{
  const titles = sections.map(s => s.title.toLowerCase());
  const out = [...sections];
  if (!titles.some(t => t.includes('header'))) {
    out.unshift({
      title: 'Header',
      content: 'Logo placeholder; primary navigation linking to all on-page sections in order; optional contact CTA.'
    });
  }
  if (!titles.some(t => t.includes('footer'))) {
    out.push({
      title: 'Footer',
      content: 'Logo placeholder; social icon placeholders; copyright; same navigation links as header.'
    });
  }
  return out;
}

export function chatToCreatePrompt(chatHtml: string, originalPrompt?: string): string {
  const block = findLandingStructureBlock(chatHtml);
  // If not found, fallback to whole html but still attempt to parse sections
  const source = block || chatHtml;
  let sections = extractSectionsFromBlock(source);
  sections = ensureHeaderFooter(sections);

  // Build a concise CREATE prompt for the Generic pipeline
  const lines: string[] = [];
  lines.push('CREATE landing page');
  if (originalPrompt) lines.push(`Context: ${stripTags(originalPrompt)}`);
  lines.push('Use these sections in order:');
  for (const s of sections) {
    const title = s.title.replace(/\s+/g, ' ').trim();
    const content = s.content.replace(/\s+/g, ' ').trim();
    lines.push(`- ${title}: ${content}`);
  }
  lines.push('Guidelines:');
  lines.push('- Use natural style descriptors (no class names, no code).');
  lines.push('- Use VIDEO_URL placeholder for any video; images via Unsplash; icons via Lucide, dynamically.');
  lines.push('- CSS-first interactions; no libraries or brands mentioned.');
  lines.push('- Ensure accessibility and performance (lazy media, proper alt text).');

  return lines.join('\n');
}

