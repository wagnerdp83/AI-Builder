import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    console.log('\n=== Content Update Request ===');
    console.log('Prompt:', prompt);
    
    if (!prompt) {
      console.log('Error: Prompt is required');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Parse component and content update request
    const componentMatch = prompt.match(/^(\w+):\s*(.+)$/);
    if (!componentMatch) {
      console.log('Error: Invalid format - expected "component: instruction"');
      return NextResponse.json(
        { error: 'Invalid format. Expected: "ComponentName: update instruction"' },
        { status: 400 }
      );
    }

    const [, componentName, instruction] = componentMatch;
    console.log('Component:', componentName);
    console.log('Instruction:', instruction);

    // Check if this is a headline update
    const headlineMatch = instruction.match(/update\s+headline\s+to\s+(.+)/i);
    if (headlineMatch) {
      const newHeadline = headlineMatch[1];
      console.log('New headline:', newHeadline);

      // Find and update the component file
      const componentFile = join(PROJECT_ROOT, 'rendering', 'src', 'components', `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}.astro`);
      
      try {
        const content = await readFile(componentFile, 'utf-8');
        
        // Find the main headline (h1) and replace it
        const updatedContent = content.replace(
          /(<h1[^>]*>)([^<]+)(<\/h1>)/i,
          `$1${newHeadline}$3`
        );

        if (content === updatedContent) {
          console.log('No h1 found, trying h2...');
          const updatedContent2 = content.replace(
            /(<h2[^>]*>)([^<]+)(<\/h2>)/i,
            `$1${newHeadline}$3`
          );
          
          if (content === updatedContent2) {
            return NextResponse.json(
              { error: 'No headline found in component' },
              { status: 404 }
            );
          }
          
          await writeFile(componentFile, updatedContent2, 'utf-8');
        } else {
          await writeFile(componentFile, updatedContent, 'utf-8');
        }

        console.log('Content update successful');
        console.log('=== End Content Update ===\n');

        return NextResponse.json({
          success: true,
          component: componentName,
          action: 'headline_update',
          newHeadline,
          file: componentFile
        });

      } catch (fileError) {
        console.error('File error:', fileError);
        return NextResponse.json(
          { error: `Component file not found: ${componentName}` },
          { status: 404 }
        );
      }
    }

    // Handle other content updates here
    return NextResponse.json(
      { error: 'Unsupported content update type. Currently supports: headline updates' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('\n=== Content Update Error ===');
    console.error('Error details:', error);
    console.error('=== End Error ===\n');
    
    return NextResponse.json(
      { error: 'Failed to process content update' },
      { status: 500 }
    );
  }
} 