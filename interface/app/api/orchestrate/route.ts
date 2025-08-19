import { NextRequest, NextResponse } from 'next/server';
import { orchestrateComplexRequest } from '../../../lib/agents/orchestrator';

export async function POST(request: NextRequest) {
  console.log('\n=== COMPLEX ORCHESTRATION API ===');
  
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Complex Request:', prompt);
    console.log('🤖 Using Mistral Codestral Agent for Orchestration');
    
    // Use the orchestrator for complex multi-operation requests
    const orchestrationResult = await orchestrateComplexRequest(prompt);
    
    console.log('📊 Orchestration Summary:');
    console.log(`Total Operations: ${orchestrationResult.totalOperations}`);
    console.log(`Successful: ${orchestrationResult.successfulOperations}`);
    console.log(`Failed: ${orchestrationResult.failedOperations.length}`);
    console.log(`Success Rate: ${Math.round((orchestrationResult.successfulOperations / orchestrationResult.totalOperations) * 100)}%`);
    
    // Return comprehensive results
    return NextResponse.json({
      success: orchestrationResult.success,
      type: 'orchestrated-complex-request',
      summary: orchestrationResult.summary,
      totalOperations: orchestrationResult.totalOperations,
      successfulOperations: orchestrationResult.successfulOperations,
      failedOperations: orchestrationResult.failedOperations,
      operations: orchestrationResult.operations.map(op => ({
        id: op.id,
        description: op.description,
        tool: op.tool,
        component: op.component,
        priority: op.priority,
        complexity: op.estimatedComplexity
      })),
      executionPlan: orchestrationResult.executionPlan,
      results: orchestrationResult.results,
      recommendations: generateRecommendations(orchestrationResult),
      nextSteps: generateNextSteps(orchestrationResult)
    });

  } catch (error) {
    console.error('❌ Orchestration API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Orchestration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Try breaking your request into smaller parts',
          'Make sure your request is clear and specific',
          'Check if all referenced components exist'
        ]
      },
      { status: 500 }
    );
  }
}

// Generate recommendations based on execution results
function generateRecommendations(result: any): string[] {
  const recommendations = [];
  
  if (result.successfulOperations === result.totalOperations) {
    recommendations.push('🎉 All operations completed successfully! Your changes are live.');
  } else if (result.successfulOperations > 0) {
    recommendations.push(`✅ ${result.successfulOperations} operations completed. Check failed operations for next steps.`);
  }
  
  if (result.failedOperations.length > 0) {
    recommendations.push('❌ Some operations failed. Review the error details and try again with more specific instructions.');
  }
  
  if (result.totalOperations > 5) {
    recommendations.push('💡 Complex request detected. Consider testing changes incrementally in the browser.');
  }
  
  return recommendations;
}

// Generate next steps suggestions
function generateNextSteps(result: any): string[] {
  const nextSteps = [];
  
  if (result.success) {
    nextSteps.push('🚀 Review the changes in your browser (localhost:4321)');
    nextSteps.push('🔍 Test all modified functionality');
    nextSteps.push('📱 Check responsive design on different screen sizes');
  } else {
    nextSteps.push('🔧 Review failed operations and refine your request');
    nextSteps.push('🎯 Try breaking complex requests into smaller parts');
    nextSteps.push('📋 Check component structure if targeting specific elements');
  }
  
  // Add component-specific suggestions
  const componentsModified = [...new Set(result.operations.map((op: any) => op.component).filter(Boolean))];
  if (componentsModified.length > 0) {
    nextSteps.push(`📂 Modified components: ${componentsModified.join(', ')}`);
  }
  
  return nextSteps;
} 