import { promises as fs } from 'fs';
import { getComponentFilePath } from '@/lib/agents/file-utils';
import { parse, HTMLElement } from 'node-html-parser';

export interface VideoHandlerInstructions {
  elementSelector?: string;
  newContent?: string; // This will be the video URL
  component?: string;
}

export interface VideoHandlerResult {
  success: boolean;
  elementsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
  details?: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // 1. Check if it's already a valid embed URL
  if (url.includes('youtube.com/embed/')) {
    console.log('✅ URL is already a valid embed URL.');
    return url;
  }
  
  let videoId: string | null = null;
  try {
    const urlObject = new URL(url);
    // 2. Handle short 'youtu.be' links
    if (urlObject.hostname === 'youtu.be') {
      videoId = urlObject.pathname.slice(1);
    // 3. Handle standard 'youtube.com/watch' links
    } else if (urlObject.hostname.includes('youtube.com')) {
      videoId = urlObject.searchParams.get('v');
    }
  } catch (error) {
      console.error("Invalid URL for YouTube parsing:", error);
      // Fallback for non-URL strings that might just be the ID
      if (url.length === 11 && !url.includes('.')) {
          videoId = url;
      }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  console.warn(`Could not extract YouTube video ID from URL: ${url}`);
  return null;
}

export async function executeVideoHandler(instructions: VideoHandlerInstructions): Promise<VideoHandlerResult> {
  console.log('\n=== Video Handler ===');
  console.log('Instructions:', instructions);

  const { component, elementSelector, newContent: videoUrl } = instructions;

  if (!component || !videoUrl) {
    return { success: false, error: 'Component and video URL are required.', filePath: '', elementsModified: [], transformationsApplied: 0 };
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  if (!embedUrl) {
    return { success: false, error: `Invalid YouTube URL: ${videoUrl}`, filePath: '', elementsModified: [], transformationsApplied: 0 };
  }
  
  const filePath = getComponentFilePath(component);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const root = parse(fileContent);

    // The agent will likely target the image. We replace it with the iframe.
    const selector = elementSelector || 'img'; // Default to replacing the first image if no selector is given
    const elementToReplace = root.querySelector(selector);

    if (!elementToReplace) {
      throw new Error(`Could not find an element to replace with selector: "${selector}"`);
    }

    console.log(`✅ Found element to replace with video: <${elementToReplace.tagName}>`);

    const iframe = `<iframe src="${embedUrl}" class="w-full aspect-video rounded-lg" frameborder="0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    
    // Replace the outer HTML of the element
    elementToReplace.replaceWith(iframe);

    await fs.writeFile(filePath, root.toString(), 'utf-8');

    return {
      success: true,
      elementsModified: [selector],
      transformationsApplied: 1,
      filePath,
      details: 'Replaced image with YouTube video embed.'
    };

  } catch (error) {
    console.error('❌ Video Handler Error:', error);
    return {
      success: false,
      elementsModified: [],
      transformationsApplied: 0,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error during video handling'
    };
  }
} 