import { TestCase, MistralResponse } from './types';
import { logTestActivity } from './logger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { validateWithLLM } from './validation';

interface ComponentCode {
  path: string;
  content: string;
  section: string;
}

// Function to get component code based on section
async function getComponentCode(section: string): Promise<ComponentCode> {
  try {
    // Convert section name to match file naming convention (e.g., 'features' -> 'Features.astro')
    const fileName = section.charAt(0).toUpperCase() + section.slice(1) + '.astro';
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', fileName);
    
    console.log('\n📁 Reading component file:', componentPath);
    
    // Read the actual component file
    const content = await fs.readFile(componentPath, 'utf-8');
    
    console.log('\n📄 Current component code:');
    console.log('='.repeat(50));
    console.log(content);
    console.log('='.repeat(50));

    return {
      path: componentPath,
      content,
      section
    };
  } catch (error) {
    throw new Error(`Failed to read component file: ${error}`);
  }
}

// Function to format prompt for Mistral
function formatMistralPrompt(testCase: TestCase, componentCode: ComponentCode): string {
  const prompt = `
Please update the following Astro component code according to this request:
"${testCase.prompt}"

Current component code:
${componentCode.content}

Please provide only the updated code without any explanations.
`;

  console.log('\n🤖 Sending prompt to Mistral:');
  console.log('='.repeat(50));
  console.log(prompt);
  console.log('='.repeat(50));

  return prompt;
}

// Function to simulate Mistral API call (replace with actual API call)
async function callMistralAPI(prompt: string): Promise<MistralResponse> {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract the original code and request
    const originalCode = prompt.split('Current component code:\n')[1].split('\n\nPlease provide')[0];
    const request = prompt.split('"')[1].toLowerCase();
    
    // Create a modified version of the code based on the request
    let updatedCode = originalCode;
    
    // Extract the new value from the request (text between quotes)
    const matches = prompt.match(/"([^"]*)"/g);
    if (!matches || matches.length < 2) {
      throw new Error('Invalid request format');
    }
    
    const newValue = matches[matches.length - 1].replace(/"/g, '');
    
    // Helper function to update a property value
    const updateProperty = (property: string, value: string, index = -1) => {
      const lines = updatedCode.split('\n');
      let currentIndex = -1;
      let inTargetObject = false;
      let objectLevel = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Track object nesting level
        objectLevel += (line.match(/{/g) || []).length;
        objectLevel -= (line.match(/}/g) || []).length;
        
        // Check if we're entering a new object
        if (line.includes('{')) {
          inTargetObject = true;
        }
        
        // Update the property if found
        if (inTargetObject && line.includes(`${property}:`)) {
          if (index === -1 || currentIndex === index) {
            lines[i] = line.replace(/"[^"]*"/, `"${value}"`);
            break;
          }
        }
        
        // Check if we're exiting the current object
        if (objectLevel === 0) {
          inTargetObject = false;
          if (index !== -1) {
            currentIndex++;
          }
        }
      }
      
      return lines.join('\n');
    };

    // Helper function to update a style class
    const updateStyle = (oldClass: string, newClass: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(oldClass)) {
          lines[i] = lines[i].replace(oldClass, newClass);
          updated = true;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };

    // Helper function to update a default prop value
    const updateDefaultProp = (property: string, value: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`${property} = "`)) {
          lines[i] = lines[i].replace(/"[^"]*"/, `"${value}"`);
          updated = true;
          break;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };

    // Helper function to update spacing
    const updateSpacing = (value: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        // Update grid gap classes
        if (lines[i].includes('gap-')) {
          // Convert rem value to tailwind spacing unit (e.g. 1.5rem -> 6)
          const remValue = parseFloat(value);
          const tailwindValue = Math.round(remValue * 4); // Convert rem to tailwind spacing units (1rem = 4 units)
          lines[i] = lines[i].replace(/gap-\d+/, `gap-${tailwindValue}`);
          updated = true;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };

    // Helper function to update border color
    const updateBorderColor = (value: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('border-gray-200')) {
          lines[i] = lines[i].replace('border-gray-200', `border-[${value}]`);
          updated = true;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };

    // Helper function to update layout
    const updateLayout = (value: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        // Update grid columns
        if (lines[i].includes('grid-cols-')) {
          lines[i] = lines[i].replace(/grid-cols-\d+/, `grid-cols-${value}`);
          updated = true;
        }
        // Update flex columns
        if (lines[i].includes('flex-') && lines[i].includes('basis-')) {
          const newBasis = (100 / parseInt(value)).toFixed(0);
          lines[i] = lines[i].replace(/basis-\d+/, `basis-${newBasis}`);
          updated = true;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };

    // Helper function to update animation
    const updateAnimation = (value: string) => {
      const lines = updatedCode.split('\n');
      let updated = false;
      
      for (let i = 0; i < lines.length; i++) {
        // Add animation class
        if (lines[i].includes('class="') && !lines[i].includes('animate-')) {
          lines[i] = lines[i].replace('class="', `class="animate-${value} `);
          updated = true;
        }
        // Update existing animation
        if (lines[i].includes('animate-')) {
          lines[i] = lines[i].replace(/animate-[^\s"]+/, `animate-${value}`);
          updated = true;
        }
      }
      
      return updated ? lines.join('\n') : updatedCode;
    };
    
    // Update based on request type
    if (request.includes('title')) {
      if (request.includes('section')) {
        updatedCode = updateDefaultProp('title', newValue);
      } else {
        updatedCode = updateProperty('title', newValue);
      }
    } else if (request.includes('subtitle')) {
      updatedCode = updateProperty('subtitle', newValue);
    } else if (request.includes('description')) {
      updatedCode = updateProperty('description', newValue);
    } else if (request.includes('text')) {
      const testimonialIndex = parseInt(request.match(/testimonial\s+(\d+)/)?.[1] || '1') - 1;
      updatedCode = updateProperty('text', newValue, testimonialIndex);
    } else if (request.includes('author')) {
      const testimonialIndex = parseInt(request.match(/testimonial\s+(\d+)/)?.[1] || '1') - 1;
      updatedCode = updateProperty('name', newValue, testimonialIndex);
    } else if (request.includes('plan')) {
      const planIndex = parseInt(request.match(/plan\s+(\d+)/)?.[1] || '1') - 1;
      if (request.includes('name')) {
        updatedCode = updateProperty('name', newValue, planIndex);
      } else if (request.includes('description')) {
        updatedCode = updateProperty('description', newValue, planIndex);
      }
    } else if (request.includes('color')) {
      // Handle color updates
      if (request.includes('text')) {
        updatedCode = updateStyle('text-update-800', 'text-first');
        updatedCode = updateStyle('text-gray-800', 'text-first');
      } else if (request.includes('border')) {
        updatedCode = updateBorderColor(newValue);
      }
    } else if (request.includes('size')) {
      // Handle size updates
      if (request.includes('icon')) {
        const oldSize = 'size-7';
        const newSize = `size-${newValue.replace('px', '')}`;
        updatedCode = updateStyle(oldSize, newSize);
      }
    } else if (request.includes('background')) {
      // Handle background updates
      if (request.includes('feature') && request.includes('card')) {
        updatedCode = updateStyle('bg-white', `bg-${newValue}`);
      } else if (request.includes('testimonial')) {
        updatedCode = updateStyle('bg-white', `bg-${newValue}`);
        updatedCode = updateStyle('bg-gray-50', `bg-${newValue}`);
      }
    } else if (request.includes('spacing')) {
      updatedCode = updateSpacing(newValue);
    } else if (request.includes('layout')) {
      // Handle layout updates
      const columns = request.match(/(\d+)\s*columns?/)?.[1];
      if (columns) {
        updatedCode = updateLayout(columns);
      }
    } else if (request.includes('animation')) {
      // Handle animation updates
      const animation = request.match(/add\s+(\w+(?:-\w+)*)\s+animation/)?.[1];
      if (animation) {
        updatedCode = updateAnimation(animation);
      }
    }

    // Check if any changes were made
    if (updatedCode === originalCode) {
      throw new Error('No changes were made to the code');
    }

    return {
      success: true,
      updatedCode
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process request: ${error}`
    };
  }
}

// Function to apply code changes to the actual component file
async function applyCodeChanges(componentPath: string, updatedCode: string): Promise<void> {
  try {
    console.log('\n📝 Step 5: Applying code changes');
    console.log('='.repeat(50));
    console.log(`Updating component file: ${componentPath}`);
    
    // Write the updated code to the component file
    await fs.writeFile(componentPath, updatedCode, 'utf-8');
    
    console.log('✅ Successfully applied code changes');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Failed to apply code changes:', error);
    throw error;
  }
}

// Main function to process a test case through Mistral
export async function processMistralUpdate(testCase: TestCase): Promise<boolean> {
  try {
    // Get component code
    console.log('\n🎯 Processing test case:', testCase.prompt);
    console.log('\n📦 Step 1: Getting component code');
    const componentCode = await getComponentCode(testCase.expectedResult.section);

    // Format prompt
    console.log('\n📝 Step 2: Formatting prompt');
    const prompt = formatMistralPrompt(testCase, componentCode);

    // Call Mistral API
    console.log('\n🚀 Step 3: Calling Mistral API');
    const response = await callMistralAPI(prompt);

    if (!response.success || !response.updatedCode) {
      console.error('Failed to get updated code from Mistral');
      return false;
    }

    // Show differences
    console.log('\n🔄 Step 4: Code differences');
    console.log('='.repeat(50));
    showCodeDifferences(componentCode.content, response.updatedCode);
    console.log('='.repeat(50));

    // Apply changes
    console.log('\n📝 Step 5: Applying code changes');
    console.log('='.repeat(50));
    console.log('Updating component file:', componentCode.path);
    await applyCodeChanges(componentCode.path, response.updatedCode);
    console.log('✅ Successfully applied code changes');
    console.log('='.repeat(50));

    // Validate changes with LLM
    const validationResult = await validateWithLLM({
      originalCode: componentCode.content,
      updatedCode: response.updatedCode,
      request: testCase.prompt,
      expectedValue: testCase.expectedResult.value
    });

    if (!validationResult.isValid) {
      console.log('\n❌ Validation failed:', validationResult.reason);
      if (validationResult.suggestedFix) {
        console.log('💡 Suggested fix:', validationResult.suggestedFix);
      }
      return false;
    }

    console.log('\n✅ Successfully processed Mistral update');
    return true;
  } catch (error) {
    console.log('\n❌ Failed to process Mistral update:', error);
    return false;
  }
}

// Helper function to show code differences
function showCodeDifferences(originalCode: string, updatedCode: string) {
  console.log('='.repeat(50));
  console.log('Changes detected:');
  
  const originalLines = originalCode.split('\n');
  const updatedLines = updatedCode.split('\n');
  let changes = 0;
  
  for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i] !== updatedLines[i]) {
      console.log(`\nLine ${i + 1}:`);
      console.log(`  Before: ${originalLines[i].trim()}`);
      console.log(`  After:  ${updatedLines[i].trim()}`);
      changes++;
    }
  }
  
  if (changes === 0) {
    console.log('No changes detected in the code.');
  }
  
  console.log('='.repeat(50));
}

// Helper function to extract expected value from prompt
function extractExpectedValue(prompt: string): string {
  // Extract numeric values with units
  const valueMatch = prompt.match(/(\d+\.?\d*)\s*(rem|px|em|%)/i);
  if (valueMatch) {
    return valueMatch[0];
  }

  // Extract color values
  const colorMatch = prompt.match(/#[0-9a-f]{3,6}|rgb\([^)]+\)|[a-z]+-\d+/i);
  if (colorMatch) {
    return colorMatch[0];
  }

  // Extract quoted strings
  const quoteMatch = prompt.match(/"([^"]+)"/);
  if (quoteMatch) {
    return quoteMatch[1];
  }

  // Extract the last word as fallback
  const words = prompt.split(' ');
  return words[words.length - 1];
} 