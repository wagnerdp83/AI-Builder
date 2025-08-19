import { NextRequest, NextResponse } from 'next/server';
import { DebugRequestParsing } from '../../../lib/tools/debug-request-parsing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userRequest, testType } = body;

    console.log('🔍 [DEBUG API] Received request for debugging');
    console.log('🔍 [DEBUG API] Test Type:', testType);
    console.log('🔍 [DEBUG API] User Request Length:', userRequest?.length || 0);

    const debugTool = new DebugRequestParsing();
    let result;

    if (testType === 'fashion-salon') {
      console.log('🔍 [DEBUG API] Running fashion salon test');
      result = await debugTool.testWithFashionSalonRequest();
    } else if (testType === 'car-dealership') {
      console.log('🔍 [DEBUG API] Running car dealership test');
      result = await debugTool.testWithCarDealershipRequest();
    } else if (testType === 'expert-car-dealership') {
      console.log('🔍 [DEBUG API] Running expert car dealership test');
      result = await debugTool.testWithExpertCarDealershipRequest();
    } else if (userRequest) {
      console.log('🔍 [DEBUG API] Running custom request test');
      result = await debugTool.debugRequestParsing(userRequest);
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Please provide userRequest or testType.' },
        { status: 400 }
      );
    }

    console.log('🔍 [DEBUG API] Debug completed successfully');
    
    return NextResponse.json({
      success: true,
      result,
      summary: {
        intentDetected: result.intentDetection.intent,
        confidence: result.intentDetection.confidence,
        sectionsDetected: result.intentDetection.sections.length,
        businessType: result.businessContext.businessType,
        irlComponents: result.irlStructure.components.length,
        ragPatternsFound: result.ragAnalysis.patternsFound,
        ragConfidence: result.ragAnalysis.confidence
      }
    });

  } catch (error) {
    console.error('🔍 [DEBUG API] Error during debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 