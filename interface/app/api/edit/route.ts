import { NextResponse } from 'next/server';
import { selectTool, executeAgentDecision } from '@/lib/agents/tool-selector';
import { RequestClassifier } from '@/lib/agents/utils/request-classifier';
import { VisualRequestHandler } from '@/lib/agents/visual/visual-handler';

export async function POST(request: Request) {
  try {
    const { prompt, disambiguation, image, layout } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // First, classify the request
    const requestType = RequestClassifier.classifyRequest(prompt, !!image, !!layout);

    // If it's a visual request, handle it separately
    if (requestType.type === 'visual') {
      console.log('\n=== Processing Visual Edit Request ===');
      console.log('Prompt:', prompt);
      console.log('Has Image:', !!image);
      console.log('Has Layout:', !!layout);

      const visualResponse = await VisualRequestHandler.handleRequest({
        prompt,
        image,
        layout
      });

      if (!visualResponse.success) {
        return NextResponse.json(
          { error: visualResponse.error || 'Visual request processing failed' },
          { status: 500 }
        );
      }

      return NextResponse.json(visualResponse);
    }

    // Handle standard (non-visual) requests as before
    console.log('\n=== Processing Standard Edit Request ===');
    console.log('Prompt:', prompt);
    if (disambiguation) {
      console.log('Disambiguation:', disambiguation);
    }

    try {
      const decision = await selectTool(prompt, disambiguation);
      console.log('Tool Decision:', JSON.stringify(decision, null, 2));

      const result = await executeAgentDecision(decision);
      console.log('Execution Result:', JSON.stringify(result, null, 2));

      if (!result.success) {
        return NextResponse.json(
          { 
            error: result.error || 'Tool execution failed',
            details: {
              tool: result.tool,
              reasoning: result.reasoning
            }
          },
          { status: 500 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in tool selection/execution:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Unknown error in tool processing',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in the main edit API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 