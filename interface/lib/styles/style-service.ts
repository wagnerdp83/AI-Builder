import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { findColorReferences, analyzeStyleDependencies, generateStyleUpdate } from './style-analyzer';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

interface StyleUpdateRequest {
  type: 'color' | 'class';
  from: string;
  to: string;
  reference?: string;
}

export async function processStyleUpdate(request: StyleUpdateRequest) {
  console.log('\n=== Processing Style Update ===');
  console.log('Request:', request);
  
  try {
    // Find all color references in interface components only
    console.log('Finding color references...');
    const references = await findColorReferences(request.reference || '', PROJECT_ROOT);
    console.log('Found references:', references);
    
    // Analyze dependencies
    console.log('Analyzing style dependencies...');
    const dependencies = await analyzeStyleDependencies(request.from, PROJECT_ROOT);
    console.log('Found dependencies:', dependencies);
    
    // Generate updates
    const updates = [];
    
    // Update component styles
    console.log('\nApplying updates to components...');
    for (const ref of references) {
      console.log(`\nProcessing reference:`, ref);
      
      const updater = await generateStyleUpdate(
        request.from, 
        request.to, 
        ref.source.type === 'tailwind' ? 'tailwind-class' : 'inline-hex',
        PROJECT_ROOT
      );
      
      if (updater) {
        console.log('Generated updater:', updater);
        const content = await readFile(ref.source.file, 'utf-8');
        const newContent = updater.update(content);
        
        if (content === newContent) {
          console.log('No changes needed for this reference');
          continue;
        }
        
        console.log(`Writing updates to ${ref.source.file}`);
        await writeFile(ref.source.file, newContent, 'utf-8');
        updates.push({
          file: ref.source.file,
          type: ref.source.type,
          status: 'updated'
        });
        console.log('Update successful');
      } else {
        console.log('No updater generated for this reference');
      }
    }
    
    const result = {
      success: true,
      updates,
      dependencies,
      references
    };
    
    console.log('\nFinal result:', result);
    console.log('=== End Processing ===\n');
    
    return result;
    
  } catch (error) {
    console.error('\n=== Style Service Error ===');
    console.error('Error details:', error);
    console.error('=== End Error ===\n');
    throw error;
  }
}

export async function extractStyleFromComponent(componentName: string, selector: string) {
  try {
    const componentPath = join(PROJECT_ROOT, 'components', `${componentName}.tsx`);
    const content = await readFile(componentPath, 'utf-8');
    
    // Find the element and its styles using the selector
    const elementRegex = new RegExp(`<[^>]*${selector}[^>]*class="([^"]+)"[^>]*>`, 'g');
    const match = elementRegex.exec(content);
    
    if (!match) return null;
    
    return {
      classes: match[1].split(' '),
      source: componentPath,
      selector
    };
    
  } catch (error) {
    console.error('Error extracting style from component:', error);
    return null;
  }
}

export async function applyStyleToComponent(
  componentName: string,
  selector: string,
  styles: { classes: string[] }
) {
  try {
    const componentPath = join(PROJECT_ROOT, 'components', `${componentName}.tsx`);
    let content = await readFile(componentPath, 'utf-8');
    
    // Update the element's classes
    const classString = styles.classes.join(' ');
    const elementRegex = new RegExp(`(<[^>]*${selector}[^>]*class=")[^"]+(")`);
    content = content.replace(elementRegex, `$1${classString}$2`);
    
    await writeFile(componentPath, content, 'utf-8');
    
    return {
      success: true,
      file: componentPath,
      updatedClasses: styles.classes
    };
    
  } catch (error) {
    console.error('Error applying style to component:', error);
    throw error;
  }
} 