// Deterministic, minimal normalization without external deps.
// Focus: consolidate @lucide/astro imports and trim redundant blank lines.

export function normalizeAstroCode(input: string): string {
  let code = input;
  // 1) Fix malformed double-quoted URLs like ""https://... -> "https://...
  code = code.replace(/""https:\/\//g, '"https://');
  // 2) Fix stray slash before attributes (e.g., </video attrs> or <source /  muted>)
  code = code.replace(/<source\s*\/\s+/g, '<source ');
  // Fix stray slash lines before attributes on <video>
  code = code.replace(/(<video[^>]*?)\n\s*\/\s+([a-zA-Z-]+)=/g, '$1 $2=');
  code = code.replace(/<video([^>]*?)\/>/g, '<video$1></video>');
  // 3) Normalize spaces around = in attributes
  code = code.replace(/\s*=\s*"/g, '="');
  code = code.replace(/\s*=\s*\{/g, '={');

  const lines = code.split(/\r?\n/);
  const otherLines: string[] = [];
  const lucideIcons = new Set<string>();
  let sawFrontmatterEnd = false;

  for (const line of lines) {
    const m = line.match(/^\s*import\s*\{([^}]+)\}\s*from\s*['"]@lucide\/astro['"];?\s*$/);
    if (m) {
      const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
      names.forEach(n => n && lucideIcons.add(n));
      continue; // drop original import
    }
    otherLines.push(line);
  }

  // Rebuild code with a single lucide import placed in frontmatter if possible
  code = otherLines.join('\n');
  const importLine = lucideIcons.size > 0 ? `import { ${Array.from(lucideIcons).join(', ')} } from '@lucide/astro';\n` : '';

  // Insert after starting frontmatter --- if present
  const fmStart = code.indexOf('---');
  if (fmStart !== -1) {
    const fmEnd = code.indexOf('---', fmStart + 3);
    if (fmEnd !== -1 && importLine) {
      const before = code.slice(0, fmEnd);
      const after = code.slice(fmEnd);
      code = `${before}\n${importLine}${after}`;
      sawFrontmatterEnd = true;
    }
  }
  if (!sawFrontmatterEnd && importLine) {
    code = `---\n${importLine}---\n\n` + code;
  }

  // Collapse multiple blank lines to at most one
  code = code.replace(/\n{3,}/g, '\n\n');
  return code;
}

