// Backup note: New deterministic renderer scaffold. No existing code removed.

import { ComponentIR, IRConstant } from '../types/ir';
import { capabilityTokens, getCapabilitiesVersion } from '../config/capabilities';
import { loadStyleAdapter } from './adapter-loader';

function ensureBaseConstants(ir: ComponentIR): IRConstant[] {
  const existingNames = new Set((ir.constants || []).map(c => c.name));
  const base: IRConstant[] = [];
  if (!existingNames.has('title')) base.push({ name: 'title', value: ir.componentName || 'Section' });
  if (!existingNames.has('subtitle')) base.push({ name: 'subtitle', value: '' });
  return [ ...(ir.constants || []), ...base ];
}

function renderItems(ir: ComponentIR, fontClass: string): string {
  const items = ir.content?.items || [];
  if (items.length === 0) return '';
  
  // Handle both array and object formats for interactions
  const interactions: any = (ir as any).interactions || {};
  const wantsBeforeAfter = Array.isArray(interactions)
    ? interactions.includes('beforeAfterHover')
    : !!interactions.beforeAfterHover;
    
  return `
    <div class="overflow-x-auto pb-4">
      <div class="flex space-x-8 min-w-max">
        {items.map((item) => (
          <div class="flex-shrink-0 w-80 bg-white rounded-lg shadow-lg overflow-hidden group">
            <div class="relative h-96">
              ${wantsBeforeAfter ? `
              <img src={item.beforeImage || "{{MOCKUP_IMAGE}}"} alt={item.title || 'Before image'} class="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0" />
              <img src={item.afterImage || "{{MOCKUP_IMAGE}}"} alt={item.title || 'After image'} class="w-full h-full object-cover absolute top-0 left-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              ` : `
              <img src={item.image || "{{MOCKUP_IMAGE}}"} alt={item.title || 'Gallery image'} class="w-full h-full object-cover" />
              `}
            </div>
            <div class="p-6">
              <p class="text-gray-800 ${fontClass}">{item.title}</p>
              {item.description && (<p class="text-gray-600 ${fontClass} mt-2">{item.description}</p>)}
            </div>
          </div>
        ))}
      </div>
    </div>`;
}

export function renderAstroFromIR(ir: ComponentIR): string {
  const semantic = ir.semanticTag || 'section';
  const uniqueIcons = Array.from(new Set(ir.lucideIcons || []));
  const iconImports = uniqueIcons.length > 0
    ? `import { ${uniqueIcons.join(', ')} } from '@lucide/astro';\n\n`
    : '';

  const constants = ensureBaseConstants(ir)
    .map(c => `const ${c.name} = ${JSON.stringify(c.value)};`)
    .join('\n');

  const theme = ir.theme || {};
  const adapter = (globalThis as any).__styleAdapter as any;
  const defaults = capabilityTokens.themeDefaults;
  const fontMap = adapter?.theme?.fontFamilyMap || { serif: 'font-serif', sans: 'font-sans', mono: 'font-mono' };
  const bgClass = theme.background || adapter?.theme?.backgroundDefault || defaults.background;
  const fontFamily = theme.fontFamily || defaults.fontFamily;
  const fontClass = fontMap[fontFamily] || fontMap.serif;
  const containerKey = ir.layout?.container || 'default';
  const containerClass = (adapter?.layout?.container?.[containerKey]) || capabilityTokens.layout.container[containerKey] || capabilityTokens.layout.container.default;

  const headingLevel = ir.a11y?.headingLevel || 2;
  const headingTag = `h${headingLevel}`;

  const headings = ((ir as any).content?.headings || [])
    .map((h: string) => `<${headingTag} class=\"text-4xl ${fontClass} text-gray-800 mb-4\">${h}</${headingTag}>`)
    .join('\n');

  const paragraphs = (ir.content?.paragraphs || [])
    .map(p => `<p class=\"text-gray-600 ${fontClass}\">${p}</p>`)
    .join('\n');

  const itemsBlock = renderItems(ir, fontClass);

  const iconsBlock = uniqueIcons.length > 0
    ? `<div class=\"flex items-center gap-4 mt-6 text-purple-600\">${uniqueIcons.map(name => `<${name} class=\"w-5 h-5\" />`).join(' ')}</div>`
    : '';

const videoSourceVar = '{{VIDEO_URL}}';
const videoBlock = (ir.placeholders || []).includes('VIDEO_URL')
    ? `\n    <video class=\"w-full h-64 object-cover rounded-lg mt-8\" muted playsinline loop preload=\"metadata\">\n      <source src=\"${videoSourceVar}\" type=\"video/mp4\" />\n    </video>`
    : '';

  // Optional carousel enhancement: emit safe script only if requested
  const wantsCarousel = Array.isArray(ir.interactions)
    ? ir.interactions.includes('carousel')
    : !!(ir as any).interactions?.carousel;
  const carouselScript = '';

  const body = `
<${semantic} class=\"py-16 ${bgClass}\">
  <div class=\"${containerClass}\">
    ${headings}
    {subtitle && (<p class=\"text-xl ${fontClass} text-gray-600 mb-8\">{subtitle}</p>)}
    ${paragraphs}
    ${itemsBlock}
    ${iconsBlock}
    ${videoBlock}
  </div>
</${semantic}>`.trim();

  const frontmatter = `---\n${iconImports}const items = ${(ir.content?.items || []).length > 0 ? JSON.stringify(ir.content?.items, null, 2) : '[]'};\nconst capabilitiesVersion = "${getCapabilitiesVersion()}";\n${constants}\n---\n\n`;
  return frontmatter + body + carouselScript + '\n';
}

