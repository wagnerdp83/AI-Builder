import { NextRequest, NextResponse } from 'next/server';
import { executeVisualEdit } from '@/lib/tools/visualEditHandler';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const image = formData.get('image') as File;

    if (!prompt || !image) {
      return NextResponse.json({ success: false, error: 'Missing prompt or image file' }, { status: 400 });
    }

    console.log(`\n=== Received Visual Edit Request ===`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Image: ${image.name}, Size: ${image.size} bytes`);
    
    // In a real-world scenario, you would send the image and prompt
    // to a multimodal LLM here to get a precise description of the target.
    // For now, we are simulating this by passing the raw prompt directly
    // to our intelligent handler, which contains the logic to parse it.

    const result = await executeVisualEdit({ prompt });

    return NextResponse.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in visual-edit route:', errorMessage);
    return NextResponse.json({ success: false, error: 'Failed to process visual edit request', details: errorMessage }, { status: 500 });
  }
} 