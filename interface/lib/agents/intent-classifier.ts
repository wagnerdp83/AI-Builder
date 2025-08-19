// @ts-ignore
import { Mistral } from '@mistralai/mistralai';

// A self-contained client for intent classification.
export class IntentClassifier {
  private mistral: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY is not configured for IntentClassifier');
    }
    this.mistral = new Mistral({ apiKey });
  }

  async classify(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.mistral.chat.complete({
        model: 'mistral-small-latest', // Using a small model for fast classification
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.0,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('[IntentClassifier] Error during classification:', error);
      // Fallback to a default intent or throw the error
      return 'CHAT'; 
    }
  }
}
