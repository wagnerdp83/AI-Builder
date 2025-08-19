import { TestCase } from './types';

// Component update templates
const updateTemplates = {
  hero: {
    text: [
      'update the hero headline to "{value}"',
      'change the hero description to "{value}"',
      'modify the hero button text to "{value}"'
    ],
    style: [
      'change the hero background color to {value}',
      'update the hero text color to {value}',
      'adjust the hero section spacing to {value}rem'
    ]
  },
  features: {
    text: [
      'update the features section title to "{value}"',
      'change feature card {index} title to "{value}"',
      'modify feature {index} description to "{value}"'
    ],
    style: [
      'change the features grid layout to {value} columns',
      'update feature cards background to {value}',
      'adjust feature icons size to {value}px'
    ]
  },
  pricing: {
    text: [
      'update the pricing section title to "{value}"',
      'change the {index} plan name to "{value}"',
      'modify the {index} plan description to "{value}"'
    ],
    style: [
      'change pricing cards border color to {value}',
      'update pricing highlight color to {value}',
      'adjust pricing cards spacing to {value}rem'
    ]
  },
  testimonials: {
    text: [
      'update testimonial {index} quote to "{value}"',
      'change testimonial {index} author to "{value}"',
      'modify testimonials section title to "{value}"'
    ],
    style: [
      'change testimonials background to {value}',
      'update testimonial cards style to {value}',
      'adjust testimonials layout to {value} columns'
    ]
  }
};

// Sample values for different types of updates
const sampleValues = {
  headlines: [
    'Transform Your Business Today',
    'Innovate with Confidence',
    'Build Better Solutions',
    'Empower Your Workflow'
  ],
  descriptions: [
    'Streamline your processes with our cutting-edge solutions',
    'Experience the future of web development',
    'Create stunning websites with ease',
    'Unlock your team\'s full potential'
  ],
  colors: [
    'primary',
    'secondary',
    'accent',
    '#4A90E2',
    '#50C878',
    '#FFD700'
  ],
  sizes: ['1', '1.5', '2', '2.5', '3', '4'],
  layouts: ['2', '3', '4', 'flex', 'grid']
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function formatPrompt(template: string): string {
  let prompt = template;
  
  // Replace {value} with appropriate random value
  if (prompt.includes('color')) {
    prompt = prompt.replace('{value}', getRandomItem(sampleValues.colors));
  } else if (prompt.includes('size') || prompt.includes('spacing')) {
    prompt = prompt.replace('{value}', getRandomItem(sampleValues.sizes));
  } else if (prompt.includes('layout') || prompt.includes('columns')) {
    prompt = prompt.replace('{value}', getRandomItem(sampleValues.layouts));
  } else if (prompt.includes('title') || prompt.includes('headline')) {
    prompt = prompt.replace('"{value}"', `"${getRandomItem(sampleValues.headlines)}"`);
  } else {
    prompt = prompt.replace('"{value}"', `"${getRandomItem(sampleValues.descriptions)}"`);
  }
  
  // Replace {index} with random number
  if (prompt.includes('{index}')) {
    prompt = prompt.replace('{index}', String(Math.floor(Math.random() * 3) + 1));
  }
  
  return prompt;
}

// Generate a single random test case
export async function generateRandomTestCase(): Promise<TestCase> {
  // Select random section and update type
  const sections = Object.keys(updateTemplates);
  const section = getRandomItem(sections);
  const updateType = getRandomItem(['text', 'style']) as 'text' | 'style';
  
  // Get random template for selected section and type
  const templates = updateTemplates[section as keyof typeof updateTemplates][updateType];
  const template = getRandomItem(templates);
  
  // Format the prompt
  const prompt = formatPrompt(template);

  return {
    id: `random-test-${Date.now()}`,
    prompt,
    expectedResult: {
      success: true,
      section,
      property: updateType,
      action: prompt.split(' ')[0]
    }
  };
}

// Generate multiple random test cases
export async function generateRandomTestSuite(count: number = 2): Promise<TestCase[]> {
  const testCases: TestCase[] = [];
  
  for (let i = 0; i < count; i++) {
    const testCase = await generateRandomTestCase();
    testCases.push(testCase);
  }

  return testCases;
} 