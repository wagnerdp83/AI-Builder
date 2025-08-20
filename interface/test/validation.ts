interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedFix?: string;
}

interface ValidationRequest {
  originalCode: string;
  updatedCode: string;
  request: string;
  expectedValue: string;
}

/**
 * Validates the updated code against the original request using LLM
 */
export async function validateWithLLM(request: ValidationRequest): Promise<ValidationResult> {
  const { originalCode, updatedCode, request: userRequest, expectedValue } = request;

  // Compare the codes to find what changed
  const changes = findChanges(originalCode, updatedCode);

  // For spacing changes, we need to check if the new gap value matches the expected value
  if (userRequest.toLowerCase().includes('spacing')) {
    const gapMatch = changes.match(/gap-(\d+)/);
    if (!gapMatch) {
      return {
        isValid: false,
        reason: 'No gap class found in the updated code',
        suggestedFix: 'Add a gap class to control spacing'
      };
    }

    const actualValue = parseInt(gapMatch[1]) / 4; // Convert Tailwind units back to rem
    const expectedRemValue = parseFloat(expectedValue);

    if (Math.abs(actualValue - expectedRemValue) > 0.1) { // Allow small rounding differences
      return {
        isValid: false,
        reason: `Expected spacing value "${expectedValue}" not found in updated code.`,
        suggestedFix: `Update the gap class to use the exact value: gap-${Math.round(expectedRemValue * 4)}`
      };
    }
  }

  return {
    isValid: true
  };
}

/**
 * Helper function to find differences between two code strings
 */
function findChanges(originalCode: string, updatedCode: string): string {
  const originalLines = originalCode.split('\n');
  const updatedLines = updatedCode.split('\n');
  const changes: string[] = [];

  for (let i = 0; i < updatedLines.length; i++) {
    if (i >= originalLines.length || originalLines[i] !== updatedLines[i]) {
      changes.push(updatedLines[i]);
    }
  }

  return changes.join('\n');
} 