import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';
import { ASTRO_TOOLS } from '../../../lib/tools/astro-tools';
import { handlers } from '../../../lib/tools/astro-handlers';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { analyzeScreenshot } from '@/lib/services/vision-api';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd().replace('/interface', '');
const ASTRO_SERVER = process.env.NEXT_PUBLIC_ASTRO_URL || 'http://localhost:4321';

const config = {
  apiKey: process.env.MISTRAL_API_KEY,
  agentId: process.env.MISTRAL_AGENT_ID,
  apiUrl: process.env.MISTRAL_API_URL,
  debug: process.env.DEBUG_MISTRAL === 'true'
};

// Debug logging for environment variables
if (config.debug) {
  console.log('Mistral Config Debug:', {
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey?.length || 0,
    hasAgentId: !!config.agentId,
    apiUrl: config.apiUrl,
    debug: config.debug
  });
}

const mistralClient = new Mistral({
  apiKey: config.apiKey as string,
  ...(config.apiUrl && { baseURL: config.apiUrl })
});

// Helper to find all Astro components
async function findAllAstroComponents(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`cd "${PROJECT_ROOT}/rendering" && find src -type f -name "*.astro"`);
    return stdout.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding components:', error);
    return [];
  }
}

// Helper to refresh Astro preview
async function refreshAstroPreview(): Promise<boolean> {
  const endpoints = [
    `${ASTRO_SERVER}/_refresh`,
    `${ASTRO_SERVER}/__refresh`,
    `${ASTRO_SERVER}/_hmr`,
    `${ASTRO_SERVER}/__hmr`,
    `${ASTRO_SERVER}/__vite_ws`,
    `${ASTRO_SERVER}/__vite_hmr`,
  ];

  let success = false;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      if (response.ok || response.status === 426) {
        success = true;
        break;
      }
    } catch (error) {
      console.error(`Failed to refresh using ${endpoint}:`, error);
    }
  }

  return success;
}

interface ToolCall {
  function: {
    name: keyof typeof handlers;
    arguments: string;
  };
}

interface MistralResponse {
  choices: [{
    message: {
      tool_calls?: ToolCall[];
      content?: string;
    };
  }];
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Mistral API Request ===');
    
    // Parse form data
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const image = formData.get('image') as File | null;
    const highlightStr = formData.get('highlight') as string | null;
    
    console.log('Prompt received:', prompt);
    console.log('Image provided:', !!image);
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if this is a style-related request (colors only, not text content)
    const styleMatch = prompt.toLowerCase().match(/(change|update|set).*(?:color|colour|background|bg-|text-color|border-color).*(?:to|from)/);
    if (styleMatch) {
      console.log('Detected style request, forwarding to styles API');
      
      try {
        // Use absolute URL for the fetch
        const baseUrl = request.url.replace('/api/mistral', '');
        const styleResponse = await fetch(`${baseUrl}/api/styles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        if (!styleResponse.ok) {
          const errorText = await styleResponse.text();
          console.error('Style API error:', errorText);
          throw new Error(`Failed to process style update: ${errorText}`);
        }

        const result = await styleResponse.json();
        console.log('Style update successful');
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error forwarding to styles API:', error);
        return NextResponse.json(
          { error: 'Failed to process style request', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Check if this is a content update request (text, headlines, etc.)
    const contentMatch = prompt.toLowerCase().match(/(\w+):\s*update\s+(headline|title|text|content)/);
    if (contentMatch) {
      console.log('Detected content request, forwarding to content API');
      
      try {
        // Use absolute URL for the fetch
        const baseUrl = request.url.replace('/api/mistral', '');
        const contentResponse = await fetch(`${baseUrl}/api/content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        if (!contentResponse.ok) {
          const errorText = await contentResponse.text();
          console.error('Content API error:', errorText);
          throw new Error(`Failed to process content update: ${errorText}`);
        }

        const result = await contentResponse.json();
        console.log('Content update successful');
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error forwarding to content API:', error);
        return NextResponse.json(
          { error: 'Failed to process content request', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Check if API key is available
    if (!process.env.MISTRAL_API_KEY) {
      console.warn('No Mistral API key found, returning mock response');
      return NextResponse.json({
        success: true,
        result: 'Mock response: Mistral API key not configured',
        mock: true
      });
    }

    let visualContext = null;
    if (image) {
      try {
        // Convert image to base64
        const imageBuffer = await image.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const imageUrl = `data:${image.type};base64,${base64Image}`;

        // Parse highlight if present
        const highlight = highlightStr ? JSON.parse(highlightStr) : undefined;

        // Analyze screenshot
        visualContext = await analyzeScreenshot({
          image: imageUrl,
          prompt,
          highlight
        });
        console.log('Visual context analyzed:', visualContext);
      } catch (error) {
        console.error('Error analyzing image:', error);
        // Continue without visual context
      }
    }

    // Use the Mistral client instead of direct fetch
    try {
      console.log('Calling Mistral API...');
      
      const chatResponse = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: `You are an expert UI developer assistant. Your task is to help modify UI components based on user requests.
            ${visualContext ? `Visual Context: ${JSON.stringify(visualContext, null, 2)}` : ''}
            
            Available tools: ${Object.keys(handlers).join(', ')}
            
            Respond with specific instructions for modifying the UI components.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        maxTokens: 1000
      });

      console.log('Mistral response received');

      // For now, return a simplified response without tool calls
      return NextResponse.json({
        success: true,
        result: chatResponse.choices?.[0]?.message?.content || 'No response generated',
        visualContext,
        mistralResponse: chatResponse
      });

    } catch (mistralError) {
      console.error('Mistral API error:', mistralError);
      
      // Return a fallback response
      return NextResponse.json({
        success: true,
        result: `I understand you want to: ${prompt}. However, I'm currently unable to process this request through Mistral AI. Please try a simpler request or check the API configuration.`,
        error: 'Mistral API unavailable',
        fallback: true
      });
    }

  } catch (error: any) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 