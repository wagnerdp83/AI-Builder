import { NextRequest, NextResponse } from 'next/server';
import { DebugKnowledgeBase } from '../../../lib/tools/debug-knowledge-base';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType } = body;

    console.log('🧠 [KNOWLEDGE BASE API] Starting knowledge base test:', testType);

    const debugKnowledgeBase = new DebugKnowledgeBase();
    let result;

    switch (testType) {
      case 'basic':
        result = await debugKnowledgeBase.testKnowledgeBaseFunctionality();
        break;
      case 'fashion-salon':
        result = await debugKnowledgeBase.testWithFashionSalonRequest();
        break;
      case 'car-dealership':
        result = await debugKnowledgeBase.testWithCarDealershipRequest();
        break;
      case 'integration':
        result = await debugKnowledgeBase.testKnowledgeBaseIntegration();
        break;
      default:
        result = await debugKnowledgeBase.testKnowledgeBaseFunctionality();
    }

    // Create summary for easy reading
    const summary = {
      testName: result.testName,
      knowledgeBaseInitialized: result.knowledgeBaseStatus.isInitialized,
      patternsCount: result.knowledgeBaseStatus.patternsCount,
      embeddingsGenerated: result.knowledgeBaseStatus.embeddingsGenerated,
      patternStorageSuccess: result.patternStorage.storageSuccess,
      patternsAdded: result.patternStorage.patternsAdded,
      patternsRetrieved: result.patternStorage.patternsRetrieved,
      similaritySearchSuccess: result.similaritySearch.searchSuccess,
      patternsFound: result.similaritySearch.patternsFound,
      embeddingGenerationSuccess: result.embeddingGeneration.generationSuccess,
      embeddingLength: result.embeddingGeneration.embeddingLength,
      errorCount: result.errorLog.length,
      errors: result.errorLog
    };

    console.log('🧠 [KNOWLEDGE BASE API] Test completed successfully');
    console.log('🧠 [KNOWLEDGE BASE API] Summary:', summary);

    return NextResponse.json({
      success: true,
      result,
      summary,
      message: 'Knowledge base test completed successfully'
    });

  } catch (error) {
    console.error('🧠 [KNOWLEDGE BASE API] Error during knowledge base test:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Knowledge base test failed'
    }, { status: 500 });
  }
} 