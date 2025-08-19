# AI-Powered Component Edit Testing Framework

This document outlines the architecture and usage of the AI-powered component edit testing framework. The framework is designed to test the "Edit" functionality, which allows users to modify web components using natural language prompts.

## Tech Stack

- **TypeScript**: For type safety and robust code
- **Node.js**: As the runtime environment for running the tests
- **Codestral API**: The AI model responsible for generating intelligent code modifications
- **Props-based Architecture**: For dynamic component updates and state management
- **Automated Backup System**: For safe component modifications with rollback capability

## Process Overview

The testing process follows these steps:

1. **Test Case Generation**: A request Edit is created using Codestral's natural language processing. Example: "Update hero headline to Testing Hero Headline content update." The request includes marketing-focused context to ensure high-quality suggestions.

2. **Component Backup**: Before any modifications, the framework automatically creates a timestamped backup of the target component (e.g., `Hero.astro.backup-testId-timestamp`).

3. **Component Code Retrieval**: The framework fetches the current component code from `/rendering/src/components/`.

4. **Prompt Generation**: A natural language prompt is created based on the test case, enriched with marketing context.

5. **AI Processing**: The Codestral API processes the prompt and generates code modifications with detailed explanations.

6. **Code Update Verification**: The framework verifies that the changes match the expected outcome. If validation fails, the backup can be used for automatic rollback.

7. **Code Update**: After validation, the component is updated with the new code while preserving the backup for safety.

8. **Detailed Reporting**: Test results are logged with timing, success rates, code differences, and backup locations.

## Test Case Types

The framework supports four main types of updates:

1. **Text Updates** ✅
   - Component titles
   - Descriptions
   - Button text
   - Content blocks

2. **Style Updates** ✅
   - Background colors
   - Text colors
   - Border styles
   - Spacing

3. **Layout Updates** ✅
   - Grid columns
   - Flex layouts
   - Component spacing
   - Responsive breakpoints

## Backup System

The framework includes a robust backup system:

```typescript
// Backup Creation
async function backupComponent(componentPath: string, testId: string): Promise<string>

// Backup Restoration
async function restoreFromBackup(backupPath: string): Promise<boolean>

// Backup Cleanup
async function cleanupOldBackups(olderThanDays: number): Promise<void>
```

## Test Results

The framework provides detailed test results including:

- Test duration for each case
- Success/failure status
- Code differences before and after
- Backup file locations
- Performance metrics
- Top performing tests sorted by duration

Example output:
```bash
TEST SUMMARY
------------
Total Tests: 2
Successful: 2
Failed: 0
Success Rate: 100%
Average Duration: 1047ms
Backup Created: Hero.astro.backup-test-1750084307663

TOP PERFORMING TESTS
------------------
✅ content-update (1010ms)
  Backup: Hero.astro.backup-test-1750084307663
```

## Code Difference Analysis

The framework shows detailed code differences with backup references:

```bash
Changes detected:
Backup created at: Hero.astro.backup-test-1750084307663

Line 91:
  Before: <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  After:  <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
```

## Type Definitions

Enhanced type safety with specific type definitions:

```typescript
type TestCaseType = 'text' | 'style' | 'layout' | 'content' | 'animation';

type TestCaseProperty = 
  | 'title' 
  | 'subtitle' 
  | 'description' 
  | 'background' 
  | 'text' 
  | 'border' 
  | 'spacing' 
  | 'animation' 
  | 'layout' 
  | 'content';

type ComponentSection = 
  | 'Hero' 
  | 'Features' 
  | 'Pricing' 
  | 'Testimonials' 
  | 'Footer' 
  | 'Visual-Design';

interface BackupInfo {
  path: string;
  timestamp: number;
  testId: string;
  componentName: string;
}
```

## How to Run Tests

To run the test suite with automatic backups:

```bash
npx ts-node interface/test/run-random-tests.ts
```

This will:
1. Create backups of components before testing
2. Execute test cases
3. Log results and backup locations
4. Maintain backup history

## Configuration

The test framework can be configured through environment variables:

```bash
# Number of random tests to run
export NUM_TESTS=1

# Test types to include
export TEST_TYPES=text,style,layout,animation

# Components to test
export TEST_COMPONENTS=Hero,Features,Pricing,Testimonials

# Backup retention (days)
export BACKUP_RETENTION_DAYS=7
```

## Future Improvements

- ✅ **Backup System**: Implemented with timestamp-based naming
- ✅ **Test Case Generation**: Enhanced with marketing context
- ✅ **Component Coverage**: Added support for all main components
- ✅ **Detailed Logging**: Added with backup tracking
- 🟡 **Performance Metrics**: Basic implementation, needs enhancement
- ⚪ **Visual Regression**: Planned for future release
- ⚪ **Batch Testing**: Planned for future release
- ⚪ **Custom Test Cases**: Planned for future release

## Contributing

To contribute to the framework:

1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Run the test suite
5. Submit a pull request

Please ensure all new features include appropriate test cases, documentation, and backup handling.