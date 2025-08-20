import { 
  TestCase, 
  ComponentName,
  TestCaseType,
  MediaProperty,
  ImageTestConfig
} from '../../../../core/types/edit-types';
import { logTestActivity } from '../../../../core/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

interface ImageTestGenerationPrompt {
  component: ComponentName;
  context: string;
  config?: ImageTestConfig;
}

interface ImageTestCase extends TestCase {
  mediaType: 'image';
  expectedResult: {
    section: ComponentName;
    type: TestCaseType;
    property: MediaProperty;
    value: {
      src: string;
      alt?: string;
      width?: number;
      height?: number;
      optimization?: {
        format?: 'webp' | 'avif' | 'png' | 'jpg';
        quality?: number;
      };
    };
  };
}

export async function generateImageTestCase(
  component: ComponentName,
  config?: ImageTestConfig
): Promise<ImageTestCase> {
  console.log('\n🎨 Generating AI-driven image test case');
  console.log('='.repeat(50));

  try {
    // Step 1: Read component to get context
    const componentContext = await readComponentContext(component);
    
    // Step 2: Generate test through Codestral
    const prompt = formatImageTestPrompt({
      component,
      context: componentContext,
      config
    });

    // Step 3: Process Codestral response
    const response = await callCodestralAPI(prompt);
    return await processLLMResponse(response);
    
  } catch (error) {
    console.error('\n❌ Error generating image test case:', error);
    throw error;
  }
}

async function readComponentContext(component: ComponentName): Promise<string> {
  try {
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', `${component}.astro`);
    return await fs.readFile(componentPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read component file: ${error}`);
  }
}

function formatImageTestPrompt(params: ImageTestGenerationPrompt): string {
  const { component, context, config } = params;
  
  return `
As a UI/UX expert, analyze this component and suggest image improvements.

COMPONENT: ${component}
CONTEXT: ${context}

Consider:
- Image optimization
- Alt text improvements
- Responsive sizing
- Loading performance
- Accessibility

Return a JSON response with your suggested changes:
{
  "prompt": "Describe the image changes",
  "expectedResult": {
    "section": "${component}",
    "type": "media",
    "mediaType": "image",
    "property": "src|alt|dimensions|optimization",
    "value": {
      "src": "path/to/image",
      "alt": "Descriptive alt text",
      "width": number,
      "height": number,
      "optimization": {
        "format": "webp|avif|png|jpg",
        "quality": number
      }
    }
  }
}`;
}

async function processLLMResponse(response: string): Promise<ImageTestCase> {
  try {
    const cleanResponse = response.replace(/```json\n|\n```|```/g, '');
    const testCase = JSON.parse(cleanResponse);

    // Validate the structure
    if (!testCase.prompt || !testCase.expectedResult) {
      throw new Error('Invalid test case format: missing required fields');
    }

    return {
      id: `image-test-${Date.now()}`,
      mediaType: 'image',
      prompt: testCase.prompt,
      expectedResult: testCase.expectedResult
    };
  } catch (error) {
    throw new Error(`Error processing test case: ${error}`);
  }
}

async function callCodestralAPI(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY not found in environment variables');
  }

  const mistral = new Mistral({ apiKey });

  try {
  const response = await mistral.chat.complete({
    model: 'codestral-2405',
      messages: [
        {
          role: 'system',
          content: `You are a UI/UX expert focused on image optimization and accessibility. Suggest improvements for web component images.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content || Array.isArray(content)) {
      throw new Error('Invalid or missing content in Codestral response');
    }

    return content;
  } catch (error) {
    throw new Error(`Codestral API error: ${error}`);
  }
} 