import { promises as fs } from 'fs';
import path from 'path';

interface ImageSize {
    w: number;
    h: number;
}

interface ImageCollection {
    collection: string;
    photos: string[];
}

interface ImageCollections {
    [key: string]: ImageCollection;
}

interface SizeMappings {
    [key: string]: ImageSize;
}

const IMAGE_COLLECTIONS: ImageCollections = {
    avatar: {
        collection: '1089',
        photos: [
            'photo-1472099645785-5658abf4ff4e',
            'photo-1494790108377-be9c29b29330',
            'photo-1507003211169-0a1dd7228f2d',
            'photo-1534528741775-53994a69daeb',
            'photo-1500648767791-00dcc994a43e'
        ]
    },
    product: {
        collection: '3511699',
        photos: [
            'photo-1523275335684-37898b6baf30',
            'photo-1572635196237-14b3f281503f',
            'photo-1581235720704-06d3acfcb36f',
            'photo-1542219550-37153d387c27',
            'photo-1553456558-aff63285bdd1'
        ]
    },
    hero: {
        collection: '317099',
        photos: [
            'photo-1557804506-669a67965ba0',
            'photo-1461749280684-dccba630e2f6',
            'photo-1504384308090-c894fdcc538d',
            'photo-1451187580459-43490279c0fa',
            'photo-1517245386807-bb43f82c33c4'
        ]
    }
};

const SIZE_MAPPINGS: SizeMappings = {
    'small square': { w: 400, h: 400 },
    'medium square': { w: 600, h: 600 },
    'large square': { w: 800, h: 800 },
    'small rectangle': { w: 600, h: 400 },
    'medium rectangle': { w: 800, h: 600 },
    'large rectangle': { w: 1200, h: 800 },
    'banner': { w: 1600, h: 600 },
    'thumbnail': { w: 300, h: 300 },
    'full width': { w: 1920, h: 1080 }
};

// Construct paths relative to the project structure
const publicPath = path.join(process.cwd(), '..', 'rendering', 'public');
const mockupsPath = path.join(publicPath, 'images', 'mockups');

let availableMockups: string[] = [];

async function loadImageAssets() {
  try {
    const mockupFiles = await fs.readdir(mockupsPath);
    availableMockups = mockupFiles.filter(file => !file.startsWith('.')); // Ignore files like .DS_Store
    console.log(`✅ Loaded ${availableMockups.length} mockup images.`);
  } catch (error) {
    console.warn(`⚠️ Could not load mockup images from ${mockupsPath}:`, error);
  }
}

// Load assets when the module is initialized
loadImageAssets();

function getRandomImage(imageList: string[]): string | undefined {
  if (imageList.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * imageList.length);
  return imageList[randomIndex];
}

export function getAvatarImagePath(): string {
  const imageName = getRandomImage(availableMockups);
  // Return a placeholder if no images are found, otherwise return the relative path from the mockups folder.
  return imageName ? `/images/mockups/${imageName}` : 'https://via.placeholder.com/150/E2E8F0/4A5568?text=Avatar';
}

export function getMockupImagePath(): string {
  const imageName = getRandomImage(availableMockups);
  // Return a placeholder if no images are found, otherwise return the relative path
  return imageName ? `/images/mockups/${imageName}` : 'https://via.placeholder.com/400x300/E2E8F0/4A5568?text=Mockup';
}

export function getImageUrl(type: string, dimensions: string): string {
    // Get size from dimensions
    let size = SIZE_MAPPINGS['medium rectangle'];
    Object.entries(SIZE_MAPPINGS).forEach(([key, value]) => {
        if (dimensions.toLowerCase().includes(key.toLowerCase())) {
            size = value;
        }
    });

    // Handle special cases
    if (type === 'icon') {
        return `https://via.placeholder.com/48x48/4F46E5/FFFFFF?text=🔧`;
    }
    if (type === 'logo') {
        return `https://via.placeholder.com/120x60/1F2937/FFFFFF?text=LOGO`;
    }

    // Get collection and random photo
    const collection = IMAGE_COLLECTIONS[type] || IMAGE_COLLECTIONS['product'];
    const randomPhoto = collection.photos[Math.floor(Math.random() * collection.photos.length)];

    // Build URL with parameters
    const baseUrl = `https://images.unsplash.com/${randomPhoto}`;
    const params = new URLSearchParams({
        w: size.w.toString(),
        h: size.h.toString(),
        fit: 'crop',
        q: '85',
        fm: 'jpg',
        auto: 'format,compress'
    });

    // Add type-specific parameters
    if (type === 'avatar') params.append('crop', 'faces');
    if (type === 'product') params.append('bg', 'white');

    return `${baseUrl}?${params.toString()}`;
}

export function validateImageType(type: string): boolean {
    return type in IMAGE_COLLECTIONS || type === 'icon' || type === 'logo';
}

export function validateDimensions(dimensions: string): boolean {
    return Object.keys(SIZE_MAPPINGS).some(key => 
        dimensions.toLowerCase().includes(key.toLowerCase())
    );
} 