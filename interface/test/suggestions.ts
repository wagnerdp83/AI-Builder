import { TestRequest } from './types';

// 5 Style Change Test Suggestions
export const TEST_SUGGESTIONS: TestRequest[] = [
  {
    id: 'test-001',
    description: 'Hero: Update headline to "Let\'s test our Headline text update!"',
    component: 'Hero',
    operation: 'text-edit',
    instructions: {
      elementSelector: 'h1',
      newContent: 'Let\'s test our Headline text update!',
      operation: 'replace'
    },
    expectedOutcome: 'Hero section headline should be updated to the new text',
    priority: 1
  },
  
  {
    id: 'test-002', 
    description: 'Features: Change icon background colors to theme orange',
    component: 'Features',
    operation: 'style-update',
    instructions: {
      elementSelector: '.bg-gradient-to-br',
      newContent: 'from-[#ea580c] to-[#ea580c]',
      operation: 'replace'
    },
    expectedOutcome: 'All feature icons should have orange background instead of gradient',
    priority: 2
  },

  {
    id: 'test-003',
    description: 'Benefits: Update section title to "Amazing Benefits for Everyone"',
    component: 'Benefits', 
    operation: 'text-edit',
    instructions: {
      elementSelector: 'h2',
      newContent: 'Amazing Benefits for Everyone',
      operation: 'replace'
    },
    expectedOutcome: 'Benefits section title should be updated with new text',
    priority: 3
  },

  {
    id: 'test-004',
    description: 'Pricing: Change primary button background to emerald green',
    component: 'Pricing',
    operation: 'style-update', 
    instructions: {
      elementSelector: '.bg-blue-600',
      newContent: 'bg-emerald-600 hover:bg-emerald-700',
      operation: 'replace'
    },
    expectedOutcome: 'Primary pricing button should be emerald green instead of blue',
    priority: 4
  },

  {
    id: 'test-005',
    description: 'Testimonials: Update customer quote to test content update',
    component: 'Testimonials',
    operation: 'text-edit',
    instructions: {
      elementSelector: '.quote-text, blockquote p',
      newContent: 'This is a test quote to verify our content update system is working perfectly!',
      operation: 'replace'
    },
    expectedOutcome: 'First testimonial quote should be updated with test content',
    priority: 5
  }
];

// Additional test variations for comprehensive testing
export const EXTENDED_TEST_SUGGESTIONS: TestRequest[] = [
  {
    id: 'test-006',
    description: 'Header: Change navigation link colors to purple theme',
    component: 'Header',
    operation: 'style-update',
    instructions: {
      elementSelector: '.nav-link, nav a',
      newContent: 'text-purple-600 hover:text-purple-800',
      operation: 'replace'
    },
    expectedOutcome: 'Navigation links should be purple themed',
    priority: 6
  },

  {
    id: 'test-007', 
    description: 'FAQ: Update first question to "How does our testing system work?"',
    component: 'FAQ',
    operation: 'text-edit',
    instructions: {
      elementSelector: '.faq-question:first-child, .accordion-trigger:first-child',
      newContent: 'How does our testing system work?',
      operation: 'replace'
    },
    expectedOutcome: 'First FAQ question should be updated',
    priority: 7
  },

  {
    id: 'test-008',
    description: 'Contact: Change contact form button to gradient style',
    component: 'Contact',
    operation: 'style-update',
    instructions: {
      elementSelector: '.submit-btn, button[type="submit"]',
      newContent: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
      operation: 'replace'
    },
    expectedOutcome: 'Contact form submit button should have gradient background',
    priority: 8
  }
];

// Test suggestion utilities
export function getRandomTestSuggestion(): TestRequest {
  const allSuggestions = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS];
  return allSuggestions[Math.floor(Math.random() * allSuggestions.length)];
}

export function getTestSuggestionsByComponent(component: string): TestRequest[] {
  const allSuggestions = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS];
  return allSuggestions.filter(test => test.component === component);
}

export function getTestSuggestionsByOperation(operation: string): TestRequest[] {
  const allSuggestions = [...TEST_SUGGESTIONS, ...EXTENDED_TEST_SUGGESTIONS];
  return allSuggestions.filter(test => test.operation === operation);
} 