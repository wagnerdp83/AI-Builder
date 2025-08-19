import { 
  TestCase, 
  ComponentName,
  TestCaseType,
  MediaProperty,
  VideoTestConfig
} from '../../../../core/types/edit-types';
import { logTestActivity } from '../../../../core/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

interface VideoTestGenerationPrompt {
  component: ComponentName;
  context: string;
  config?: VideoTestConfig;
}

interface VideoTestCase extends TestCase {
  mediaType: 'video';
  expectedResult: {
    section: ComponentName;
    type: TestCaseType;
    property: MediaProperty;
    value: {
      src: string;
      poster?: string;
      width?: number;
      height?: number;
      autoplay?: boolean;
      controls?: boolean;
      muted?: boolean;
      loop?: boolean;
      preload?: 'auto' | 'metadata' | 'none';
      optimization?: {
        format?: 'mp4' | 'webm';
        quality?: number;
        maxDuration?: number;
      };
    };
  };
}

export async function generateVideoTestCase(
  component: ComponentName,
  config?: VideoTestConfig
): Promise<VideoTestCase> {
  console.log('\n🎥 Generating AI-driven video test case');
  console.log('='.repeat(50));

  try {
    // Step 1: Read component to get context
    const componentContext = await readComponentContext(component);
    
    // Step 2: Generate test through Codestral
    const prompt = formatVideoTestPrompt({
      component,
      context: componentContext,
      config
    });

    // Step 3: Process Codestral response
    const response = await callCodestralAPI(prompt);
    return await processLLMResponse(response);
    
  } catch (error) {
    console.error('\n❌ Error generating video test case:', error);
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

function formatVideoTestPrompt(params: VideoTestGenerationPrompt): string {
  const { component, context, config } = params;
  
  return `
As a UI/UX expert, analyze this component and suggest video improvements.

COMPONENT: ${component}
CONTEXT: ${context}

Consider:
- Video optimization
- Playback settings
- Responsive behavior
- Loading performance
- Accessibility
- User experience

Return a JSON response with your suggested changes:
{
  "prompt": "Describe the video changes",
  "expectedResult": {
    "section": "${component}",
    "type": "media",
    "mediaType": "video",
    "property": "src|poster|dimensions|optimization|playback",
    "value": {
      "src": "path/to/video",
      "poster": "path/to/poster",
      "width": number,
      "height": number,
      "autoplay": boolean,
      "controls": boolean,
      "muted": boolean,
      "loop": boolean,
      "preload": "auto|metadata|none",
      "optimization": {
        "format": "mp4|webm",
        "quality": number,
        "maxDuration": number
      }
    }
  }
}`;
}

async function processLLMResponse(response: string): Promise<VideoTestCase> {
  try {
    const cleanResponse = response.replace(/```json\n|\n```|```/g, '');
    const testCase = JSON.parse(cleanResponse);

    // Validate the structure
    if (!testCase.prompt || !testCase.expectedResult) {
      throw new Error('Invalid test case format: missing required fields');
    }

    return {
      id: `video-test-${Date.now()}`,
      mediaType: 'video',
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
          content: `You are a UI/UX expert focused on video optimization and user experience. Suggest improvements for web component videos.`
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