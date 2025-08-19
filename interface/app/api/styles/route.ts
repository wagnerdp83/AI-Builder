import { NextRequest, NextResponse } from 'next/server';
import { processStyleUpdate } from '@/lib/styles/style-service';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    console.log('\n=== Style Update Request ===');
    console.log('Prompt:', prompt);
    
    if (!prompt) {
      console.log('Error: Prompt is required');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // First check if this is actually a color-related request
    const colorRequest = prompt.toLowerCase().match(/(change|update|set).*(?:color|colour|background|bg-|text-color|border-color).*(?:to|from)/);
    if (!colorRequest) {
      console.log('Error: Not a color-related request');
      return NextResponse.json(
        { error: 'This endpoint only handles color-related requests. Use the main API for text content updates.' },
        { status: 400 }
      );
    }

    // Check if this is a global update request
    const isGlobalUpdate = prompt.toLowerCase().includes('all sections') || prompt.toLowerCase().includes('all components');
    
    let componentName = '*';  // Wildcard for all components
    let targetColor;

    if (isGlobalUpdate) {
      // Extract color from global update prompt
      const colorMatch = prompt.match(/(?:to|from)\s+(?:the\s+)?(\w+)(?:\s+colour|\s+color)?/i);
      if (!colorMatch) {
        console.log('Error: Invalid prompt format - missing target color');
        return NextResponse.json(
          { error: 'Target color not found in prompt. Format should be "update all sections ... to [color]"' },
          { status: 400 }
        );
      }
      targetColor = colorMatch[1];
    } else {
      // Handle specific component update
      const componentMatch = prompt.match(/^(\w+):/);
      if (componentMatch) {
        componentName = componentMatch[1];
        const colorMatch = prompt.match(/(?:to|from)\s+(\w+)$/);
        if (!colorMatch) {
          console.log('Error: Invalid prompt format - missing target color');
          return NextResponse.json(
            { error: 'Target color not found in prompt. Format should be "ComponentName: change color to [color]"' },
            { status: 400 }
          );
        }
        targetColor = colorMatch[1];
      } else {
        // General color update without component specification
        const colorMatch = prompt.match(/(?:to|from)\s+(\w+)$/);
        if (!colorMatch) {
          console.log('Error: Invalid prompt format - missing target color');
          return NextResponse.json(
            { error: 'Target color not found in prompt. Please specify: "change [element] color to [color]"' },
            { status: 400 }
          );
        }
        targetColor = colorMatch[1];
      }
    }

    console.log('Extracted data:', {
      componentName,
      targetColor,
      isGlobalUpdate
    });

    const result = await processStyleUpdate({
      type: 'color',
      from: '#383877',  // Current button color
      to: targetColor,
      reference: componentName
    });

    console.log('Style update result:', result);
    console.log('=== End Style Update ===\n');

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('\n=== Style Update Error ===');
    console.error('Error details:', error);
    console.error('=== End Error ===\n');
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 