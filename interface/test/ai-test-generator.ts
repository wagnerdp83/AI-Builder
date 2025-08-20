import { 
  TestCase, 
  ComponentName,
  TestCaseType,
  StyleCategory,
  StyleProperty,
  TestGenerationConfig,
  ContentProperty,
  LayoutProperty
} from './types';
import { logTestActivity } from './logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import * as colors from './colors';
import { 
  STYLE_CATEGORIES,
  COMPONENT_STYLES,
  generateStyleUpdate,
  TAILWIND_CONFIG
} from './test-generation-config';

// Load environment variables from /interface/test/.env
dotenv.config({ path: join(process.cwd(), '.env') });

interface TestGenerationPrompt {
  component: ComponentName;
  context: string;
  config?: TestGenerationConfig;
}

interface MistralAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GeneratedTestCase {
  prompt: string;
  expectedResult: {
    section: ComponentName;
    type: TestCaseType;
    property: ContentProperty | StyleProperty | LayoutProperty;
    value: string;
  };
}

// Property mapping for style updates
const STYLE_PROPERTY_MAP: Record<string, StyleCategory> = {
  'backgroundColor': 'color',
  'textColor': 'color',
  'fontSize': 'typography',
  'spacing': 'spacing',
  'padding': 'spacing',
  'margin': 'spacing',
  'grid': 'layout',
  'flex': 'layout',
  'animation': 'animation',
  'hover': 'interaction',
  'focus': 'interaction',
  'active': 'interaction'
};

export async function generateAITestCase(
  component: ComponentName,
  config?: TestGenerationConfig
): Promise<TestCase> {
  console.log('\n🎲 Generating AI-driven test case');
  console.log('='.repeat(50));

  try {
    // Step 1: Read component to get context
    console.log('\n📦 Step 1: Reading component context');
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', `${component}.astro`);
    console.log('\n📁 Reading component file:', componentPath);
    
    const componentContext = await readComponentContext(component);
    console.log('\n📄 Component context:');
    console.log('='.repeat(50));
    console.log(componentContext);
    console.log('='.repeat(50));

    // Step 2: Generate test through Codestral
    console.log('\n🤖 Step 2: Requesting test case from Codestral');
    const prompt = formatTestGenerationPrompt({
      component,
      context: componentContext,
      config
    });

    console.log('\n📝 Sending prompt to Codestral:');
    console.log('='.repeat(50));
    console.log(prompt);
    console.log('='.repeat(50));

    // Step 3: Process Codestral response
    console.log('\n📝 Step 3: Processing Codestral response');
    const response = await callCodestralAPI(prompt);
    const testCase = await processLLMResponse(response);
    
    console.log('\n📄 Generated test case:');
    console.log('='.repeat(50));
    console.log(colors.success(JSON.stringify(testCase, null, 2)));
    console.log('='.repeat(50));

    return testCase;
  } catch (error) {
    console.error(colors.error('\n❌ Error generating test case:'), error);
    throw error;
  }
}

async function readComponentContext(component: ComponentName): Promise<string> {
  try {
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', `${component}.astro`);
    return await fs.readFile(componentPath, 'utf-8');
  } catch (error) {
    console.error(colors.error('⚠️ Failed to read component file:'), error);
    throw new Error(`Failed to read component file: ${error}`);
  }
}

function formatTestGenerationPrompt(params: TestGenerationPrompt): string {
  const { component, context, config } = params;
  
  // Get available style categories for this component
  const componentStyles = COMPONENT_STYLES[component];
  const availableCategories = Array.from(
    new Set(componentStyles.map(style => 
      style.value && typeof style.value === 'object' && 'shade' in style.value 
        ? 'color' as StyleCategory
        : 'typography' as StyleCategory
    ))
  );

  // Filter categories based on config
  const categories = config?.focus || availableCategories;
  
  // Create category probabilities string
  const categoryProbabilities = categories.map(cat => {
    const probability = STYLE_CATEGORIES[cat as StyleCategory] * 100;
    return `- ${cat}: ${probability}% probability`;
  }).join('\n');

  return `
As a UI/UX expert, analyze this component and suggest style improvements.

COMPONENT: ${component}
CONTEXT: ${context}

AVAILABLE STYLE CATEGORIES:
${categoryProbabilities}

COMPONENT-SPECIFIC STYLES:
${componentStyles.map(style => `- ${style.property}: ${JSON.stringify(style.value)}`).join('\n')}

TAILWIND CONFIGURATION:
Colors: ${Object.keys(TAILWIND_CONFIG.colors).join(', ')}
Spacing: ${TAILWIND_CONFIG.spacing.sizes.join(', ')}
Typography: ${TAILWIND_CONFIG.typography.sizes.join(', ')}
Breakpoints: ${TAILWIND_CONFIG.breakpoints.join(', ')}

Return a JSON response with your suggested changes:
{
  "prompt": "Describe the visual changes",
  "expectedResult": {
    "section": "${component}",
    "type": "style",
    "changes": [
      {
        "type": "style",
        "category": "One of: ${Object.keys(STYLE_CATEGORIES).join(', ')}",
        "property": "The style property to change",
        "value": "The new Tailwind class or value",
        "selector": "CSS selector if needed",
        "mediaQuery": "Breakpoint if needed",
        "state": "Interaction state if needed"
      }
    ]
  }
}`;
}

async function processLLMResponse(response: string): Promise<TestCase> {
  try {
    // Clean up the response
    let cleanResponse = response.replace(/```json\n|\n```|```/g, '');
    
    // Parse the response
    const testCase = JSON.parse(cleanResponse);

    // Validate the structure
    if (!testCase.prompt || !testCase.expectedResult) {
      throw new Error('Invalid test case format: missing required fields');
    }

    const { section, type, changes } = testCase.expectedResult;

    if (!section || !type || !Array.isArray(changes)) {
      throw new Error('Invalid test case format: missing required expectedResult fields');
    }

    // Validate each change
    changes.forEach((change, index) => {
      if (!change.type || !change.property || !change.value) {
        throw new Error(`Invalid change at index ${index}: missing required fields`);
      }
      
      if (change.type === 'style' && !change.category) {
        throw new Error(`Invalid style change at index ${index}: missing category`);
      }
    });

    // Return the validated test case
    return {
      id: `ai-test-${Date.now()}`,
      prompt: testCase.prompt,
      expectedResult: {
        section,
        type,
        changes
      }
    };
  } catch (error) {
    console.error(colors.error('\n❌ Error processing Codestral response:'));
    console.error(colors.error('Response:'), response);
    console.error(colors.error('Error:'), error);
    throw new Error(`Error processing test case: ${error}`);
  }
}

async function callCodestralAPI(prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'MISTRAL_API_KEY not found in environment variables.\n' +
      'Please check your /interface/.env file has the correct API key'
    );
  }

  console.log('\n🔑 Using Mistral API Key:', `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  // Initialize Mistral client
  const mistral = new Mistral({
    apiKey: apiKey
  });

  console.log('\n🚀 Calling Codestral API...');

  try {
    // Call Codestral to generate test case
    const response = await mistral.chat.complete({
      model: 'codestral-latest',
      messages: [
        {
          role: 'system',
          content: `You are a marketing consultant helping to improve web components. Your task is to suggest ONE simple content or style update that would enhance the component.

RULES:
1. Only suggest simple edits/updates (no complex changes)
2. Focus on content updates like:
   - Titles/Headlines
   - Subtitles
   - Button text
   - Descriptions
   - Feature names
3. Or style updates like:
   - Background colors
   - Text colors
   - Font sizes
   - Spacing
   - Padding/margins

Return a JSON response in this format:
{
  "prompt": "update [element] from [current value] to [new value]",
  "expectedResult": {
    "section": "ComponentName",
    "type": "content|style",
    "property": "title|subtitle|color|size|etc",
    "value": "new value"
  }
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    console.log('\n✅ Received response from Codestral');

    const content = response.choices[0]?.message?.content;
    if (!content || Array.isArray(content)) {
      throw new Error('Invalid or missing content in Codestral response');
    }

    return content;
  } catch (error) {
    console.error(colors.error('\n❌ Codestral API error:'), error);
    throw error;
  }
}

export async function generateAITestSuite(
  count: number = 1,
  config?: TestGenerationConfig
): Promise<TestCase[]> {
  const components: ComponentName[] = ['Hero', 'Features', 'Pricing', 'Testimonials', 'Contact'];
  const testCases: TestCase[] = [];

  for (let i = 0; i < count; i++) {
    const component = components[Math.floor(Math.random() * components.length)];
    
    // Generate either an AI test case or a direct style update
    const useAI = Math.random() < 0.7; // 70% chance to use AI
    
    let testCase: TestCase;
    if (useAI) {
      testCase = await generateAITestCase(component, config);
    } else {
      // Generate a direct style update
      const styleUpdate = generateStyleUpdate(component, config);
      testCase = {
        id: `style-test-${Date.now()}`,
        prompt: `Update ${component} ${styleUpdate.property} to ${styleUpdate.value}`,
        expectedResult: {
          section: component,
          type: 'style',
          changes: [{
            type: 'style',
            ...styleUpdate
          }]
        }
      };
    }
    
    testCases.push(testCase);
  }

  return testCases;
} 