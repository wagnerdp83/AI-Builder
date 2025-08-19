import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';
import { getComponentsDir, getPagesDir } from '../utils/directory';

export interface FileCreatorInstructions {
  componentName: string; 
  position: string;
  template: string; 
}

export interface FileCreatorResult {
  success: boolean;
  filePath: string;
  error?: string;
}

function toPascalCase(str: string): string {
  const componentName = str.replace(/[^a-zA-Z0-9]/g, ' ').split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  return componentName.replace('.astro', '');
}

function toSpacedFormat(str: string): string {
  return str.replace('.astro', '').replace(/([A-Z])/g, ' $1').trim();
}

export async function executeFileCreator(instructions: FileCreatorInstructions): Promise<FileCreatorResult> {
  try {
  const { componentName, position, template } = instructions;
    const pascalCaseName = toPascalCase(componentName);
    
    // Get directories
    const componentsDir = await getComponentsDir();
    const pagesDir = await getPagesDir();
    
    // Validate template exists
    const templatePath = path.join(componentsDir, template);
    if (!await fs.access(templatePath).then(() => true).catch(() => false)) {
      throw new Error(`Template ${template} not found`);
    }

    // Create new component file path
    const newFilePath = path.join(componentsDir, `${pascalCaseName}.astro`);
    
    // Read template content
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Create new component from template
    await fs.writeFile(newFilePath, templateContent);

    // Update index.astro to include the new component
    const indexPath = path.join(pagesDir, 'index.astro');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    
    // Add import statement
    const importStatement = `import ${pascalCaseName} from '../components/${pascalCaseName}.astro';`;
    const updatedContent = indexContent.replace(
      /(import[\s\S]*?from ['"][@\.\/\w-]+['"];[\s]*)(---)/,
      `$1import ${pascalCaseName} from '../components/${pascalCaseName}.astro';\n$2`
    );
    
    // Add component section after specified position
    const sectionWrapper = `
    <SectionWrapper id="${componentName.toLowerCase()}" >
      <${pascalCaseName} />
    </SectionWrapper>

    <SectionWrapper id="${position}" >`;
    
    const finalContent = updatedContent.replace(
      new RegExp(`<SectionWrapper id="${position}"[^>]*>`),
      sectionWrapper
    );
    
    await fs.writeFile(indexPath, finalContent);

    return {
      success: true,
      filePath: newFilePath
    };

  } catch (error) {
    console.error('Error in file creator:', error);
    return {
      success: false,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error in file creator'
    };
  }
} 