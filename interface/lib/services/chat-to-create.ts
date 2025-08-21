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

/**
 * Extracts the content from the "Landing Page Scope" section of the chat HTML.
 * @param chatHtml The full HTML content from the chat response.
 * @returns The extracted scope content as a string, or an empty string if not found.
 */
export function extractLandingPageScope(chatHtml: string): string {
  const scopeMarker = '🏗️ Landing Page Scope';
  const startIndex = chatHtml.indexOf(scopeMarker);

  if (startIndex === -1) {
    // Fallback for cases where the marker is inside an HTML tag
    const regex = new RegExp(`>\s*${scopeMarker}\s*<`);
    const match = chatHtml.match(regex);
    if (match && typeof match.index === 'number') {
      const scopeContent = chatHtml.substring(match.index + match[0].length).trim();
      // Clean up potential closing tags at the beginning
      return scopeContent.replace(/^\s*<\/[^>]+>\s*/, '');
    }
    return ''; // Marker not found
  }

  // Return everything after the marker
  const scopeContent = chatHtml.substring(startIndex + scopeMarker.length);
  return scopeContent.trim();
}

/**
 * Detects if the user's prompt indicates a positive intent to create.
 * @param prompt The user's text prompt.
 * @returns True if a creation intent is detected, false otherwise.
 */
export function detectCreateIntent(prompt: string): boolean {
  const positiveKeywords = [
    'yes',
    'yep',
    'yup',
    'ok',
    'okay',
    'go ahead',
    'proceed',
    'do it',
    'create it',
    'build it',
    'sounds good',
    'looks good',
    'perfect',
    'great',
    'awesome',
    'make it',
  ];
  const lowerPrompt = prompt.toLowerCase().trim();

  if (positiveKeywords.includes(lowerPrompt)) {
    return true;
  }

  return positiveKeywords.some(keyword => lowerPrompt.startsWith(keyword));
}

export function chatToCreatePrompt(chatHtml: string, originalPrompt?: string): string {
  const scope = extractLandingPageScope(chatHtml);

  // If a specific scope is found, use it directly to preserve all details.
  if (scope) {
    console.log('[ChatToCreate] Extracted scope found. Using it directly for creation.');
    // We prepend a simple instruction, but the main content is the detailed scope.
    return `Create a landing page based on this content: ${scope}`;
  }

  // Fallback to the old logic if the specific scope marker isn't found.
  console.log('[ChatToCreate] Scope marker not found, using legacy block extraction.');
  const block = findLandingStructureBlock(chatHtml);
  const source = block || chatHtml;
  let sections = extractSectionsFromBlock(source);
  sections = ensureHeaderFooter(sections);

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

