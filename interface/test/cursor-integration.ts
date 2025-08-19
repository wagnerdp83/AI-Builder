import { TestRequest, CursorPrompt } from './types';
import { ComponentName } from './types';
import { logTestActivity } from './logger';

// Generate Cursor prompt for error fixing
export function generateCursorPrompt(
  testRequest: TestRequest,
  error: string,
  componentContent: string
): string {
  const component = testRequest.component;
  const operation = testRequest.operation;
  const instructions = testRequest.instructions;

  logTestActivity(testRequest.id, 'info', 'Generating Cursor prompt for manual intervention');

  const prompt = `
🔧 AUTOMATED TEST FAILURE - MANUAL INTERVENTION NEEDED

Test ID: ${testRequest.id}
Component: ${component}
Operation: ${operation}
Error: ${error}

ORIGINAL REQUEST:
${testRequest.description}

FAILED INSTRUCTIONS:
- Element Selector: ${instructions.elementSelector || 'N/A'}
- New Content: ${instructions.newContent}
- Operation: ${instructions.operation || 'replace'}

COMPONENT CONTENT:
\`\`\`astro
${componentContent}
\`\`\`

CURSOR INSTRUCTIONS:
1. Analyze the component structure above
2. Identify why the selector "${instructions.elementSelector}" failed
3. Look for the correct element that matches the intent: "${testRequest.description}"
4. Apply the change manually: ${instructions.newContent}
5. Test the change in the browser (localhost:4321)
6. If successful, update the test selector for future runs
7. If still failing, analyze the component structure and suggest improvements

COMMON ISSUES TO CHECK:
- Selector might be too specific or incorrect
- Element might be dynamically generated
- Tailwind classes might need escaping
- Component might be using different HTML structure than expected
- Content might be in a different location (child elements, etc.)

Please fix this manually and then run the next test in the queue.
  `;

  return prompt.trim();
}

// Generate improvement suggestions
export function generateImprovementSuggestions(
  testResults: any[],
  component: ComponentName
): string[] {
  const suggestions: string[] = [];
  
  const failedTests = testResults.filter(result => !result.success);
  const componentTests = failedTests.filter(result => result.component === component);
  
  if (componentTests.length > 0) {
    suggestions.push(`Consider reviewing ${component} component structure for test compatibility`);
    
    const commonErrors = componentTests.map(test => test.error).reduce((acc, error) => {
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonError = Object.entries(commonErrors).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (mostCommonError) {
      suggestions.push(`Most common error in ${component}: ${mostCommonError[0]} (${mostCommonError[1]} occurrences)`);
    }
  }
  
  return suggestions;
}

// Generate component analysis prompt
export function generateComponentAnalysisPrompt(
  component: ComponentName,
  componentContent: string
): string {
  return `
🔍 COMPONENT ANALYSIS REQUEST

Component: ${component}
Task: Analyze this component for test automation compatibility

COMPONENT CONTENT:
\`\`\`astro
${componentContent}
\`\`\`

ANALYSIS CHECKLIST:
1. Identify all major sections and elements
2. List available CSS selectors for automation
3. Note any dynamic content or conditional rendering
4. Identify text content that can be modified
5. List style classes that can be updated
6. Check for any accessibility attributes (id, data-*, aria-*)
7. Note any potential issues for automated testing

PLEASE PROVIDE:
1. A list of reliable selectors for each major element
2. Recommended selectors for text updates
3. Recommended selectors for style updates
4. Any warnings about complex or dynamic content
5. Suggestions for improving test automation compatibility

This analysis will help improve our automated testing system.
  `;
}

// Generate test debugging prompt
export function generateTestDebuggingPrompt(
  testRequest: TestRequest,
  error: string,
  attemptedSelector: string,
  componentContent: string
): string {
  return `
🐛 TEST DEBUGGING SESSION

Test: ${testRequest.id} - ${testRequest.description}
Failed Selector: ${attemptedSelector}
Error: ${error}

COMPONENT CONTENT:
\`\`\`astro
${componentContent}
\`\`\`

DEBUGGING STEPS:
1. Search for the intended element in the component above
2. Try these alternative selectors:
   - Tag-based: h1, h2, p, div, span, button
   - Class-based: .class-name, [class*="partial"]
   - Text-based: :contains("text"), [title*="text"]
   - Position-based: :first-child, :last-child, :nth-child(n)
   - Attribute-based: [data-*], [id*=""], [aria-*]

3. Test each selector in browser dev tools:
   \`document.querySelector('your-selector')\`

4. Once you find the correct selector, update the test configuration

5. Consider if the element structure has changed since test creation

SUGGESTED FIXES:
- If targeting text: try 'h1', 'h2', '.title', '.headline'
- If targeting buttons: try 'button', '.btn', '[type="submit"]'
- If targeting icons: try '.icon', 'svg', '[role="img"]'
- If targeting containers: try '.container', '.section', 'main'

Please fix and rerun the test.
  `;
}

// Format cursor prompts for display
export function formatCursorPromptsForDisplay(prompts: string[]): string {
  if (prompts.length === 0) {
    return 'No Cursor prompts generated.';
  }

  return prompts
    .map((prompt, index) => `\n--- Cursor Prompt ${index + 1} ---\n${prompt}`)
    .join('\n\n');
}

// Export cursor prompts to file
export async function exportCursorPrompts(
  testId: string,
  prompts: string[]
): Promise<string> {
  const { promises: fs } = await import('fs');
  const { join } = await import('path');
  
  try {
    const filename = `cursor-prompts-${testId}-${Date.now()}.md`;
    const filepath = join(process.cwd(), 'test', 'cursor-prompts', filename);
    
    // Ensure directory exists
    await fs.mkdir(join(process.cwd(), 'test', 'cursor-prompts'), { recursive: true });
    
    const content = `# Cursor Prompts for Test ${testId}\n\n${formatCursorPromptsForDisplay(prompts)}`;
    await fs.writeFile(filepath, content, 'utf-8');
    
    console.log(`📋 Cursor prompts exported to ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Failed to export cursor prompts', error);
    throw error;
  }
}

// Generate recovery strategy
export function generateRecoveryStrategy(
  error: string,
  testRequest: TestRequest
): string {
  const strategy = [];
  
  if (error.includes('not found') || error.includes('selector')) {
    strategy.push('SELECTOR_FIX: Update the element selector to match the current component structure');
  }
  
  if (error.includes('timeout') || error.includes('connection')) {
    strategy.push('RETRY: Wait and retry the operation');
  }
  
  if (error.includes('permission') || error.includes('access')) {
    strategy.push('PERMISSION_FIX: Check file permissions and access rights');
  }
  
  if (error.includes('syntax') || error.includes('parse')) {
    strategy.push('SYNTAX_FIX: Check for syntax errors in the generated code');
  }
  
  if (strategy.length === 0) {
    strategy.push('MANUAL_REVIEW: Manual intervention required');
  }
  
  return strategy.join(', ');
}

// Generate component-specific guidance
export function generateComponentGuidance(component: ComponentName): string {
  const guidance: Record<ComponentName, string> = {
    Hero: 'Usually contains h1 for headlines, .hero-section for container, .cta-button for call-to-action',
    Culture: 'Company culture section with values, mission, and team information',
    Benefits: 'Typically has .benefit-list, .benefit-item, .benefit-description elements',
    VisualDesign: 'Visual design showcase with images, galleries, and design elements',
    Features: 'Look for .feature-item, .feature-icon, .feature-title for individual features',
    Testimonials: 'Contains .testimonial, .quote, .author elements for testimonial content',
    Reinforcement: 'Reinforcement section for additional messaging and calls-to-action',
    Pricing: 'Has .pricing-card, .price, .plan-name, .feature-list for pricing elements',
    FAQ: 'Uses .faq-item, .question, .answer, .accordion for FAQ structure',
    Contact: 'Contains form elements, .contact-form, input, button[type="submit"]',
    Header: 'Navigation elements like nav, .nav-link, .logo, .menu-toggle',
    Footer: 'Footer content, .footer-section, .social-links, .copyright'
  };

  return guidance[component] || 'No specific guidance available for this component';
} 