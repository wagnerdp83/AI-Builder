import OpenAI from 'openai';
import { ProcessedLocation } from '../types/vision';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required but not found in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 60000 // 60 seconds
});

interface VisionRequest {
  image: string; // base64 encoded image
  prompt: string;
  highlight?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function analyzeScreenshot(request: VisionRequest): Promise<ProcessedLocation> {
  const systemPrompt = `You are an expert UI developer assistant. Analyze the screenshot and identify:
1. The exact component type (button, icon, text, etc.)
2. Its location in the UI
3. Unique identifying characteristics (classes, text content, etc.)
4. The specific change requested in the user's prompt

Format your response as JSON with the following structure:
{
  "component": "button/icon/etc",
  "selector": "precise CSS selector",
  "confidence": 0-1 score,
  "context": {
    "parentComponent": "name of parent component",
    "nearbyElements": ["list of adjacent elements"],
    "currentStyles": ["existing style classes"]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: request.prompt },
            {
              type: "image_url",
              image_url: {
                url: request.image,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    const result = JSON.parse(content);
    
    return {
      component: result.component,
      selector: result.selector,
      confidence: result.confidence,
      boundingBox: request.highlight || null,
      context: result.context
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      });
      throw new Error(`OpenAI API error: ${error.message}`);
    } else {
      console.error('Error analyzing screenshot:', error);
      throw new Error('Failed to analyze screenshot');
    }
  }
}

export async function generateSelector(location: ProcessedLocation): Promise<string> {
  // Use the context to generate a more precise selector
  const { component, context } = location;
  
  if (context.currentStyles && context.currentStyles.length > 0) {
    // Use existing classes for more precise targeting
    return context.currentStyles
      .filter(cls => cls.match(/^(flex|grid|size-|py-|px-)/))
      .join('.');
  }
  
  // Fallback to component + parent relationship
  return `${context.parentComponent} ${component}`;
} 