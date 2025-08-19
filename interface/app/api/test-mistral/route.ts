import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

export async function GET(request: NextRequest) {
  try {
    console.log('\n=== MISTRAL API CONNECTION TEST ===');
    
    // Check API key
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'MISTRAL_API_KEY not configured',
        details: 'Environment variable missing'
      }, { status: 500 });
    }

    console.log('✅ API Key found:', `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

    // Initialize client
    const mistral = new Mistral({
      apiKey: apiKey,
    });

    console.log('🔧 Mistral client initialized');

    // Test API call
    const testPayload = {
      model: 'codestral-latest' as const,
      messages: [
        {
          role: 'user' as const,
          content: 'Respond with a simple JSON object: {"test": "success", "timestamp": "current_time"}'
        }
      ],
      temperature: 0.1,
      maxTokens: 100
    };

    console.log('🚀 Making test API call...');
    const startTime = Date.now();
    
    const response = await mistral.chat.complete(testPayload);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('📨 API Response received:', {
      responseTime: `${responseTime}ms`,
      model: response.model,
      id: response.id,
      choices: response.choices?.length || 0,
      usage: response.usage
    });

    const content = response.choices[0]?.message?.content;
    
    return NextResponse.json({
      success: true,
      apiConnection: {
        apiKeyConfigured: true,
        apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
        clientInitialized: true
      },
      testCall: {
        model: response.model,
        responseTime: `${responseTime}ms`,
        id: response.id,
        usage: response.usage,
        content: content,
        timestamp: new Date().toISOString()
      },
      verdict: '✅ Your Mistral API is working correctly!'
    });

  } catch (error) {
    console.error('❌ Mistral API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiConnection: {
        apiKeyConfigured: !!process.env.MISTRAL_API_KEY,
        apiKeyPreview: process.env.MISTRAL_API_KEY ? 
          `${process.env.MISTRAL_API_KEY.substring(0, 8)}...${process.env.MISTRAL_API_KEY.substring(process.env.MISTRAL_API_KEY.length - 4)}` : 
          'NOT_SET',
        clientInitialized: false
      },
      verdict: '❌ Mistral API connection failed'
    }, { status: 500 });
  }
} 