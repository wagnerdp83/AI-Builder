import { NextRequest, NextResponse } from 'next/server';
import { handleComponentCreation } from '@/lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    const result = await handleComponentCreation(prompt, context);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create component' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in create route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 