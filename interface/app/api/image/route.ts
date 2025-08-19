import { NextRequest, NextResponse } from 'next/server';
import { handleImageUpload } from '@/lib/image-handler';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const imageUrl = await handleImageUpload(imageFile);

    if (imageUrl) {
      return NextResponse.json({ success: true, url: imageUrl });
    } else {
      return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ API Error in /api/image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Image upload failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
