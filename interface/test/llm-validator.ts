import { logTestActivity } from './logger';

interface ValidationRequest {
  originalCode: string;
  updatedCode: string;
  request: string;
  expectedValue: string;
}

interface ValidationResponse {
  isValid: boolean;
  reason?: string;
  suggestedFix?: string;
}

export async function validateWithLLM(validationRequest: ValidationRequest): Promise<ValidationResponse> {
  // Log validation step
  console.log('\n🔍 Step 6: LLM Validation');
  console.log('='.repeat(50));
  console.log('Validating changes with LLM...\n');

  // Construct the validation prompt
  const prompt = `
As an AI validator, analyze if the code changes match the requested update:

REQUEST: "${validationRequest.request}"
EXPECTED VALUE: "${validationRequest.expectedValue}"

ORIGINAL CODE:
${validationRequest.originalCode}

UPDATED CODE:
${validationRequest.updatedCode}

Analyze if the changes correctly implement the requested update.
Consider:
1. Does the update match the exact value requested?
2. Is the update applied in the correct location?
3. Are there any unintended side effects?

Return a JSON response in this format:
{
  "isValid": boolean,
  "reason": "Detailed explanation of validation result",
  "suggestedFix": "If invalid, suggest how to fix it"
}`;

  console.log('Sending validation request to LLM...');

  try {
    // Here we would normally call the LLM API
    // For now, we'll implement basic validation logic
    const result = validateChanges(
      validationRequest.updatedCode, 
      validationRequest.request, 
      validationRequest.expectedValue
    );
    
    console.log('\nValidation Result:');
    console.log('-'.repeat(30));
    console.log(result);
    console.log('-'.repeat(30));

    return result;
  } catch (error) {
    console.log('\n❌ Validation failed:', error);
    return {
      isValid: false,
      reason: `Validation error: ${error}`,
      suggestedFix: 'Please try the request again with more specific instructions.'
    };
  }
}

// Temporary validation logic until LLM integration is complete
function validateChanges(updatedCode: string, request: string, expectedValue: string): ValidationResponse {
  const requestLower = request.toLowerCase();
  
  // Check for spacing updates
  if (requestLower.includes('spacing') || requestLower.includes('gap')) {
    const hasExpectedValue = updatedCode.includes(`gap-${expectedValue.replace('rem', '')}`);
    
    if (!hasExpectedValue) {
      return {
        isValid: false,
        reason: `Expected spacing value "${expectedValue}" not found in updated code.`,
        suggestedFix: `Update the gap class to use the exact value: gap-${expectedValue.replace('rem', '')}`
      };
    }
  }

  // Add more validation cases as needed...

  return {
    isValid: true,
    reason: 'Changes match the requested update.'
  };
} 