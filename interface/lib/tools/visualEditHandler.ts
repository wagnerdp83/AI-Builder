import { promises as fs } from 'fs';
import path from 'path';
// Lazy-load heavy vision pipeline only when executing visual edits

function toPascalCase(str: string): string {
  return str
    .replace('.astro', '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

async function updateIndexAstro(componentName: string, position: string, preposition: string): Promise<void> {
    const componentDir = path.join(process.cwd(), '..', 'rendering', 'src');
    const indexPath = path.join(componentDir, 'pages', 'index.astro');

    try {
        let content = await fs.readFile(indexPath, 'utf-8');
        
        // Remove the Welcome placeholder component if it exists.
        console.log('[updateIndexAstro] Checking for and removing Welcome component...');
        const originalContent = content;
        content = content.replace(/(import Welcome from (?:'|").\/Welcome.astro(?:'|");?)\n?/g, '');
        content = content.replace(/<Welcome\s*\/>\n?/g, '');
        if (content !== originalContent) {
            console.log('[updateIndexAstro] Welcome component found and removed.');
        } else {
            console.log('[updateIndexAstro] Welcome component not found.');
        }
        
        const pascalName = toPascalCase(componentName);

        const importStatement = `import ${pascalName} from '../components/${componentName}.astro';`;
        if (!content.includes(importStatement)) {
            content = content.replace('---', `---\n${importStatement}`);
        }

        const sectionId = componentName.toLowerCase().replace(/\s+/g, '-');
        const componentTag = `\n    <SectionWrapper id="${sectionId}">\n      <${pascalName} />\n    </SectionWrapper>\n`;
        const positionRegex = new RegExp(`(<SectionWrapper\\s+id="${position.toLowerCase().replace(/\s+/g, '-')}"[\\s\\S]*?>[\\s\\S]*?<\\/SectionWrapper>)`, 'i');
        const match = content.match(positionRegex);

        if (match && match[0]) {
            const fullMatch = match[0];
            if (preposition === 'above' || preposition === 'before') {
                content = content.replace(fullMatch, `${componentTag}\n${fullMatch}`);
            } else {
                content = content.replace(fullMatch, `${fullMatch}\n${componentTag}`);
            }
        } else {
            content = content.replace('</main>', `${componentTag}\n</main>`);
        }

        await fs.writeFile(indexPath, content, 'utf-8');
        console.log(`✅ Successfully updated index.astro with ${pascalName} component.`);
    } catch (error) {
        console.error(`❌ Failed to update index.astro: ${error}`);
        throw new Error(`Component ${componentName} was created, but failed to update index.astro.`);
    }
}


export async function executeVisualEdit(instructions: {
    prompt: string,
    componentName: string,
    position: string,
    preposition: string,
    layout: string
}) {
  console.log('\n=== Visual Edit Handler ===');
  console.log('Instructions:', instructions);

    try {
        const { componentName, position, preposition, layout } = instructions;
    // Dynamic import to avoid loading vision pipeline unless needed
    const { executeVisionCreator } = await import('./visionCreateHandler');
    const result = await executeVisionCreator({
      componentName,
      position,
            imageUrl: layout
        });
    
        if (result.success && result.filePath) {
            await updateIndexAstro(componentName, position, preposition);
        } else {
            throw new Error(result.error || 'Failed to create visual component.');
    }

    return {
      success: true,
            message: `Component ${componentName} created and added to index.astro.`,
            componentPath: result.filePath
        };
    } catch (error: any) {
    return {
      success: false,
            error: error.message
        };
    }
} 