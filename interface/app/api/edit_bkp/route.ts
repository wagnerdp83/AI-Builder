import { NextRequest, NextResponse } from 'next/server';
// import { dispatchEdit, analyzePrompt, canHandle } from '@/lib/routes/router';

/**
 * Unified API route for all edit operations
 * Routes requests to specialized handlers based on intent
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, component, filename } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log('\n=== BACKUP ROUTE - BASIC PROCESSING ===');
    console.log(`Prompt: "${prompt}"`);
    
    // Simple backup implementation - just log and return success
    // const analysis = analyzePrompt(prompt);
    
    console.log('✅ Backup route processing complete');
    
    // if (!canHandle(prompt)) {
    //   return NextResponse.json({ 
    //     error: 'Cannot handle this request', 
    //     reason: 'Unsupported operation' 
    //   }, { status: 400 });
    // }

    console.log('🚀 Dispatching edit request...');
    
    // const result = await dispatchEdit(prompt, component || undefined, filename || undefined);
    const result = { success: true, message: 'Backup route - no actual processing performed' };

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Backup Route Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle GET requests to show API documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'Unified Edit API',
    description: 'Processes edit requests and routes them to specialized handlers',
    routes: {
      text: 'Handles text content updates (headlines, titles, paragraphs)',
      style: 'Handles Tailwind CSS style updates (colors, spacing, sizing)',
      structure: 'Handles DOM structure changes (add/remove/move elements)',
      meta: 'Handles SEO and meta tag updates (coming soon)',
      media: 'Handles media updates (images, videos, URLs) (coming soon)'
    },
    examples: {
      text: [
        'hero: update headline to Welcome to Our Site',
        'pricing: update title to New Pricing Plans',
        'contact: update subtitle to Get in Touch Today'
      ],
      style: [
        'hero: change background color to blue',
        'button: update color to green',
        'update all sections color to red'
      ],
      structure: [
        'hero: add button after headline',
        'pricing: remove third card',
        'contact: add section before form'
      ]
    },
    usage: {
      endpoint: '/api/edit',
      method: 'POST',
      contentType: 'multipart/form-data',
      parameters: {
        prompt: 'Required. Natural language description of the change',
        component: 'Optional. Specific component name to target',
        filename: 'Optional. Specific file path to target'
      }
    }
  });
} 