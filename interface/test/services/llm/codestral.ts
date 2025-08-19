import { Mistral } from '@mistralai/mistralai';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '..', '.env') });

/**
 * Calls Codestral API to update component code
 */
export async function callCodestral(prompt: string): Promise<string | null> {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not found in environment variables');
    }

    const mistral = new Mistral({
      apiKey: apiKey
    });

    const response = await mistral.chat.complete({
      model: 'codestral-2405',
      messages: [
        {
          role: 'system',
          content: `You are an expert code editor. Your task is to update the provided code according to the user's request.
IMPORTANT:
1. Return ONLY the complete updated code
2. Do not include any explanations or comments
3. Make sure to preserve all imports, types, and structure
4. Only change what was specifically requested`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.0,
      maxTokens: 4096
    });

    const updatedCode = response.choices[0]?.message?.content as string | null;
    if (!updatedCode) {
      throw new Error('No code received from Codestral');
    }

    return updatedCode;
  } catch (error) {
    console.error('Codestral API error:', error);
    return null;
  }
} 