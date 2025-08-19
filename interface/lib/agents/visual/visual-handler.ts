import { RequestClassifier } from '../utils/request-classifier';
import { executeVisionCreator } from '@/lib/tools/visionCreateHandler';
import { promises as fs } from 'fs';
import path from 'path';
import { toPascalCase } from '@/lib/tools/utils/toPascalCase';

// === VISION PIPELINE DEDICATED FUNCTIONS ===
// Vision pipeline dedicated directory functions (completely independent)
function getVisionComponentsDir(subpath: string = ''): string {
  // Vision pipeline uses its own directory logic - goes up one level from /interface to project root
  const visionProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(visionProjectRoot, 'rendering', 'src', 'components', subpath);
}

function getVisionPagesDir(subpath: string = ''): string {
  // Vision pipeline uses its own directory logic - goes up one level from /interface to project root
  const visionProjectRoot = path.resolve(process.cwd(), '..');
  return path.join(visionProjectRoot, 'rendering', 'src', 'pages', subpath);
}

// Vision pipeline dedicated function to sanitize component names for safe file names
function sanitizeVisionComponentName(componentName: string): string {
  return componentName
    .replace(/\s+/g, '') // Remove all spaces first
    .replace(/[^a-zA-Z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/^([a-z])/, (match) => match.toUpperCase()) // Capitalize first letter
    .replace(/^([A-Z])/, (match) => match) // Keep first letter capitalized
    || 'Component'; // Fallback if empty
}

export interface VisualRequest {
  prompt: string;
  image?: string;  // Base64 encoded image or URL
  layout?: string; // Base64 encoded layout screenshot or URL
}

export interface VisualResponse {
  success: boolean;
  error?: string;
  details?: {
    changes: string[];
    imageUsage?: string;
    layoutChanges?: string[];
  };
}

export class VisualRequestHandler {
  static async handleRequest(request: VisualRequest): Promise<VisualResponse> {
    try {
      // First, validate the request
      RequestClassifier.validateVisualRequest(request.prompt, request.image, request.layout);

      // Parse the command to determine if it's a create request
      const isCreateRequest = request.prompt.toLowerCase().includes('create');
      
      if (isCreateRequest) {
        // --- BEGIN: Old extraction logic (commented out, do not delete) ---
        /*
        // Extract component name and position from prompt with improved regex
        const match = request.prompt.match(/create\s+(?:a\s+)?(?:new\s+)?(?:section\s+)?called\s+([a-zA-Z0-9\s]+?)\s+(underneath|above|below|before|after)\s+([a-zA-Z0-9\s]+)/i);
        
        if (!match) {
          throw new Error('Could not parse component name and position from create request. Please use format: "create [section] called [name] [underneath/above] [position]"');
        }

        const [_, rawComponentName, preposition, rawPosition] = match;
        const componentName = rawComponentName.trim().toLowerCase().replace(/\s+/g, '-');
        const position = rawPosition.trim().toLowerCase();
        */
        // --- END: Old extraction logic ---

        // --- BEGIN: New extraction logic (matches orchestrator visual create) ---
        // Extract component name and position from prompt using orchestrator's robust regex logic
        // This matches the orchestrator's visual create extraction for consistency
        const createMatch = request.prompt.trim().match(/create(?: a new| me a)?\s*(?:section|component)?\s*(?:called)?\s*['"]?([\w\s-.]+?)['"]?(?=\s+underneath|\s+above|\s+below|\s+right|\s+directly|:|\s+layout is|\s+based on|\s+from the attached|$)/i);
        const rawComponentName = createMatch ? createMatch[1].replace(/[.:]/g, '').trim() : 'component';

        // This non-greedy regex correctly extracts the target component for positioning.
        const positionRegex = /(underneath|above|below|right of|left of)\s+(?:the\s+)?([\w\s]+?)\s*(?:\.|,|$)/i;
        const positionMatch = request.prompt.match(positionRegex);

        const componentName = rawComponentName.trim().replace(/\s+/g, '-');
        const position = positionMatch ? positionMatch[2].replace(/['"]/g, '').trim() : '';
        const preposition = positionMatch ? positionMatch[1].trim() : 'below';
        // --- END: New extraction logic ---

        // If no image is provided but layout is mentioned, throw a helpful error
        if (!request.image && request.prompt.toLowerCase().includes('layout')) {
          throw new Error('Layout was mentioned but no image was provided. Please attach a layout image.');
        }

        // Execute the vision creator with the extracted information
        const result = await executeVisionCreator({
          componentName,
          position,
          imageUrl: request.image || ''
        });

        if (!result.success || !result.filePath) {
          throw new Error(result.error || 'Failed to create component');
        }

        // After creating the component, update index.astro
        await VisualRequestHandler.updateIndexAstro(componentName, position, preposition);

        return {
          success: true,
          details: {
            changes: [`Created new component: ${componentName}`],
            imageUsage: request.image ? 'Used for component layout and design' : 'No image provided, using default layout',
          }
        };
      }

      // For non-create requests, throw not implemented error
      throw new Error('Visual request handling for non-create operations is not yet implemented. Please use the standard edit endpoint for non-visual changes.');

    } catch (error) {
      console.error('Error handling visual request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in visual request handler'
      };
    }
  }

  private static async updateIndexAstro(componentName: string, position: string, preposition: string): Promise<void> {
    const pagesDir = getVisionPagesDir(); // Use Vision-specific directory function
    const indexPath = path.join(pagesDir, 'index.astro');
    
    try {
      let content = await fs.readFile(indexPath, 'utf-8');
      const sanitizedName = sanitizeVisionComponentName(componentName); // Use Vision-specific sanitization
      const pascalName = toPascalCase(sanitizedName);
      
      // Add import statement
      const importStatement = `import ${pascalName} from '../components/${pascalName}.astro';`;
      if (!content.includes(importStatement)) {
        content = content.replace('---', `---\n${importStatement}`);
      }
      
      // Add component to the page
      const sectionId = componentName.toLowerCase().replace(/\s+/g, '-');
      const componentTag = `    <SectionWrapper id="${sectionId}">\n      <${pascalName} />\n    </SectionWrapper>`;
      
      const positionRegex = new RegExp(`(<SectionWrapper id="${position.toLowerCase().replace(/\s+/g, '-')}"[^>]*>[\\s\\S]*?</SectionWrapper>)`, 'i');
      const match = content.match(positionRegex);

      if (match) {
        const fullMatch = match[0];
        if (preposition === 'above' || preposition === 'before') {
          content = content.replace(fullMatch, `${componentTag}\n\n${fullMatch}`);
        } else { // 'underneath', 'below', 'after'
          content = content.replace(fullMatch, `${fullMatch}\n\n${componentTag}`);
        }
      } else {
        // Fallback: add to the end of main
        content = content.replace('</main>', `  ${componentTag}\n\n</main>`);
      }
      
      await fs.writeFile(indexPath, content, 'utf-8');
      console.log(`[VisionPipeline] Successfully updated index.astro with ${pascalName} component.`);
      
    } catch (error) {
      console.error(`[VisionPipeline] Failed to update index.astro: ${error}`);
      throw new Error(`Component ${componentName} was created, but failed to update index.astro.`);
    }
  }

  private static async validateImageData(imageData?: string): Promise<void> {
    if (!imageData) return;

    // Validate base64 image data
    if (!imageData.startsWith('data:image/')) {
      throw new Error('Invalid image data format. Must be base64 encoded with proper mime type.');
    }

    // Add size validation if needed
    const sizeInBytes = Buffer.from(imageData.split(',')[1], 'base64').length;
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB limit
    if (sizeInBytes > maxSizeInBytes) {
      throw new Error('Image size exceeds 5MB limit');
    }
  }

  private static async validateLayoutData(layoutData?: string): Promise<void> {
    if (!layoutData) return;

    // Similar validation for layout screenshots
    if (!layoutData.startsWith('data:image/')) {
      throw new Error('Invalid layout data format. Must be base64 encoded with proper mime type.');
    }

    const sizeInBytes = Buffer.from(layoutData.split(',')[1], 'base64').length;
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB limit for layouts
    if (sizeInBytes > maxSizeInBytes) {
      throw new Error('Layout size exceeds 10MB limit');
    }
  }
} 