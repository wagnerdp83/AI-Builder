import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function handleImageUpload(imageFile: File): Promise<string | null> {
  try {
    console.log('🖼️ Image received:', imageFile.name, imageFile.size, 'bytes');
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Sanitize original filename and add timestamp
    const originalName = path.parse(imageFile.name).name.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${originalName}-${Date.now()}.webp`;
    
    const renderingPublicPath = path.resolve(process.cwd(), '..', 'rendering', 'public', 'images', 'uploaded');
    
    if (!fs.existsSync(renderingPublicPath)) {
      console.log(`Creating directory: ${renderingPublicPath}`);
      fs.mkdirSync(renderingPublicPath, { recursive: true });
    }

    const filePath = path.join(renderingPublicPath, filename);
    console.log(`Attempting to save image to: ${filePath}`);
    
    await sharp(imageBuffer)
      .webp({ quality: 80 })
      .toFile(filePath);

    console.log('✅ Image saved and converted:', filePath);

    // Verify file exists after saving
    if (fs.existsSync(filePath)) {
      console.log(`✅ File successfully verified at: ${filePath}`);
    } else {
      console.error(`❌ CRITICAL: File not found at ${filePath} after save operation!`);
      throw new Error('File was not saved correctly to the filesystem.');
    }

    const imageUrl = `/images/uploaded/${filename}`;
    console.log('🌐 Public URL:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    return null;
  }
}

export async function handleMultipleImageUploads(imageFiles: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];
  for (const imageFile of imageFiles) {
    const imageUrl = await handleImageUpload(imageFile);
    if (imageUrl) {
      uploadedUrls.push(imageUrl);
    }
  }
  return uploadedUrls;
} 