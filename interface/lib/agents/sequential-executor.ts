import { ToolDecision, executeAgentDecision } from './tool-selector';

export interface SequentialResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  results: any[];
  failures: any[];
  summary: string;
}

export async function executeSequentialOperations(operations: ToolDecision[]): Promise<SequentialResult> {
  console.log(`\n🔄 SEQUENTIAL EXECUTION: ${operations.length} operations`);
  
  const results = [];
  const failures = [];
  let successfulOperations = 0;

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    console.log(`\n--- Operation ${i + 1}/${operations.length}: ${operation.reasoning || 'Processing'} ---`);

    try {
      const result = await executeAgentDecision(operation, 1);
      
      results.push({
        operationIndex: i + 1,
        operation: operation,
        result: result
      });

      if (result.success) {
        successfulOperations++;
        console.log(`✅ Operation ${i + 1} completed successfully`);
      } else {
        failures.push({
          operationIndex: i + 1,
          operation: operation,
          error: result.error
        });
        console.log(`❌ Operation ${i + 1} failed: ${result.error}`);
      }

    } catch (error) {
      failures.push({
        operationIndex: i + 1,
        operation: operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Operation ${i + 1} crashed:`, error);
    }
  }

  const successRate = Math.round((successfulOperations / operations.length) * 100);
  const summary = `Executed ${operations.length} operations: ${successfulOperations} successful (${successRate}%)`;
  
  console.log('\n📊 SEQUENTIAL EXECUTION COMPLETE');
  console.log(summary);
  
  if (failures.length > 0) {
    console.log(`❌ Failed operations: ${failures.map(f => f.operationIndex).join(', ')}`);
  }

  return {
    success: failures.length === 0,
    totalOperations: operations.length,
    successfulOperations,
    results,
    failures,
    summary
  };
} 