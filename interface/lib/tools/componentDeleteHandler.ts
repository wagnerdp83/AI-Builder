import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export interface ComponentDeleteInstructions {
  component?: string;
}

export interface ComponentDeleteResult {
  success: boolean;
  filePath: string;
  error?: string;
}

export async function executeComponentDelete(
  instructions: ComponentDeleteInstructions
): Promise<ComponentDeleteResult> {
  console.log('\n=== Component Delete Handler ===');
  console.log('Instructions:', instructions);

  try {
    const { component } = instructions;
    
    if (!component) {
      throw new Error('Component name is required for deletion');
    }

    const componentName = component.charAt(0).toUpperCase() + component.slice(1);
    const componentFileName = `${componentName}.astro`;
    const componentFilePath = join(
      PROJECT_ROOT,
      'rendering',
      'src',
      'components',
      componentFileName
    );

    const pagePath = join(
      PROJECT_ROOT,
      'rendering',
      'src',
      'pages',
      'index.astro'
    );

    // Step 1: Remove component from the page
    console.log(`Removing component ${componentName} from ${pagePath}`);
    const pageContent = await readFile(pagePath, 'utf-8');
    
    // This regex is designed to be flexible and robustly find and remove a component
    // instance along with its SectionWrapper from an Astro file.
    // It accounts for different formatting and attribute orders.
    const componentRegex = new RegExp(
      `\\s*<SectionWrapper\\s+[^>]*?id="${component.toLowerCase()}"[^>]*?>[\\s\\S]*?<\\/${componentName}\\s*\\/?>[\\s\\S]*?<\\/SectionWrapper>`,
      'gs'
    );

    let newPageContent = pageContent.replace(componentRegex, '');

    if (pageContent === newPageContent) {
      console.warn(`Could not find component ${componentName} wrapped in a SectionWrapper with id '${component.toLowerCase()}'. The component might have been removed or the structure is unexpected.`);
    }
    
    // Clean up extra newlines
    newPageContent = newPageContent.replace(/(\\r\\n|\\n|\\r){3,}/g, '$1\n');


    if (pageContent !== newPageContent) {
        await writeFile(pagePath, newPageContent, 'utf-8');
        console.log(`Successfully removed ${componentName} from ${pagePath}`);
    } else {
        console.warn(`Component ${componentName} not found in ${pagePath}. It might have already been removed.`);
    }

    // Reread content for import removal
    const updatedPageContentForImportRemoval = await readFile(pagePath, 'utf-8');

    // Step 2: Remove component import from the page
    const importRegex = new RegExp(`import ${componentName} from ['"]../components/${componentFileName}['"];?\\s*`, 'g');
    const finalPageContent = updatedPageContentForImportRemoval.replace(importRegex, '');

    if (updatedPageContentForImportRemoval !== finalPageContent) {
        await writeFile(pagePath, finalPageContent, 'utf-8');
        console.log(`Successfully removed import for ${componentName} from ${pagePath}`);
    } else {
        console.warn(`Import for ${componentName} not found in ${pagePath}.`);
    }

    // Step 3: Delete the component file itself
    console.log(`Deleting component file: ${componentFilePath}`);
    try {
        await unlink(componentFilePath);
        console.log(`Successfully deleted ${componentFilePath}`);
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            console.warn(`Component file not found, skipping deletion: ${componentFilePath}`);
        } else {
            throw e;
        }
    }

    console.log('=== End Component Delete ===\n');

    return {
      success: true,
      filePath: componentFilePath,
    };

  } catch (error) {
    console.error('Component delete error:', error);
    
    return {
      success: false,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 