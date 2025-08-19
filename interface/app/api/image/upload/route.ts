import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp
    const processedImage = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate unique filename
    const filename = `${uuidv4()}.webp`;
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), '..', 'rendering', 'public', 'images', 'uploaded');
    await fs.mkdir(uploadDir, { recursive: true });

    // Save the file
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, processedImage);

    // Return the public URL
    const imageUrl = `/images/uploaded/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process image upload' },
      { status: 500 }
    );
  }
} 