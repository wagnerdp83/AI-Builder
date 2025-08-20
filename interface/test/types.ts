// Component Types
export type ComponentName = 'Hero' | 'Features' | 'Pricing' | 'Testimonials' | 'Contact';

// Clarification Types
export interface ClarificationPrompt {
  question: string;
  options: string[];
  context: string;
}

// Test Request Types
export interface TestRequest {
  id: string;
  description: string;
  component: ComponentName;
  operation: 'style-update' | 'text-edit' | 'component-edit';
  instructions: TestInstructions;
  expectedOutcome?: string;
  priority: number;
  needsClarification?: boolean;
  clarificationPrompt?: ClarificationPrompt;
}

export interface TestInstructions {
  elementSelector?: string;
  selector?: string;
  content?: string;
  newContent?: string;
  style?: Record<string, any>;
  layout?: string;
  action?: 'create' | 'update' | 'delete';
  operation?: 'replace' | 'update' | 'delete' | 'create' | 'prop-update' | 'state-update';
  preserveLayout?: boolean;
  preserveStyle?: boolean;
  itemCount?: number;
  context?: string;
  properties?: Record<string, any>;
  usePropUpdate?: boolean;
  propName?: string;
  alternativeSelectors?: string[];
  useStateUpdate?: boolean;
  stateName?: string;
  usePartialMatch?: boolean;
  similarityThreshold?: number;
}

// Mistral API Types
export interface MistralConfig {
  apiKey: string;
  agentId: string;
  apiUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface MistralRequest {
  model: string;
  messages: MistralMessage[];
  temperature: number;
  max_tokens: number;
}

export interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Test case types
export type TestCaseType = 'content' | 'style' | 'layout' | 'interaction' | 'animation';

// Style categories for better organization
export type StyleCategory = 
  | 'color'      // Colors, backgrounds, borders
  | 'typography' // Font sizes, weights, families
  | 'spacing'    // Margins, padding, gaps
  | 'layout'     // Grid, flex, positioning
  | 'animation'  // Transitions, transforms
  | 'interaction'; // Hover, focus, active states

// Specific style properties
export type StyleProperty = {
  category: StyleCategory;
  property: string;
  value: string;
  selector?: string;
  mediaQuery?: string;
  state?: 'hover' | 'focus' | 'active' | 'disabled';
};

// Content properties remain the same but more organized
export type ContentProperty = 
  | 'title' 
  | 'subtitle' 
  | 'description' 
  | 'buttonText'
  | 'text'
  | 'label'
  | 'placeholder'
  | 'altText'
  | 'metaTitle'
  | 'metaDescription';

// Layout properties
export type LayoutProperty =
  | 'grid'
  | 'flex'
  | 'position'
  | 'display'
  | 'container'
  | 'responsive';

// Test case interface with enhanced property types
export interface TestCase {
  id: string;
  prompt: string;
  expectedResult: {
    section: ComponentName;
    type: TestCaseType;
    changes: Array<{
      type: 'style' | 'content' | 'layout';
      property: string;
      value: string;
      category?: StyleCategory;
      selector?: string;
      mediaQuery?: string;
      state?: string;
      context?: {
        before?: string;
        after?: string;
        parentSelector?: string;
        childSelector?: string;
      };
    }>;
  };
}

// Mistral API response interface
export interface MistralResponse {
  success: boolean;
  updatedCode?: string;
  error?: string;
}

// Test result with detailed changes
export interface TestResult {
  success: boolean;
  duration: number;
  changes?: Array<{
    type: TestCaseType;
    property: string;
    oldValue: string;
    newValue: string;
    selector?: string;
    appliedAt: string;
  }>;
  error?: {
    code: string;
    message: string;
    context?: any;
  };
  validation: {
    passed: boolean;
    issues: string[];
  };
}

// Tool Decision Types (copied from main system)
export interface ToolDecision {
  tool: string;
  confidence: number;
  reasoning: string;
  instructions: {
    elementSelector?: string;
    contentMatch?: string;
    newContent?: string;
    component?: string;
    filePath?: string;
    operation?: string;
    context?: string;
    properties?: Record<string, any>;
    usePropUpdate?: boolean;
    propName?: string;
    alternativeSelectors?: string[];
    useStateUpdate?: boolean;
    stateName?: string;
    usePartialMatch?: boolean;
    similarityThreshold?: number;
  };
}

// Test Execution Types
export interface TestSuiteResult {
  suiteId: string;
  results: TestResult[];
  startTime: Date;
  endTime: Date;
  totalDuration: number;
}

// Error Recovery Types
export interface ErrorRecoveryOptions {
  enableCursorPrompts: boolean;
  enableCodestralRecovery: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface RecoveryAction {
  type: 'cursor-prompt' | 'codestral-fix' | 'retry' | 'skip';
  description: string;
  payload?: any;
}

// Cursor Integration Types
export interface CursorPrompt {
  action: 'fix-error' | 'analyze-component' | 'suggest-improvement';
  context: {
    component: ComponentName;
    filePath: string;
    error: string;
    originalRequest: string;
  };
  prompt: string;
}

// Log Types
export interface TestLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  testId: string;
  message: string;
  data?: any;
}

export interface SystemState {
  currentTest?: TestResult;
  activeComponent?: ComponentName;
  lastError?: string;
  retryAttempts: number;
  logs: TestLog[];
}

export interface ComponentCode {
  path: string;
  content: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedFix?: string;
}

export interface ValidationRequest {
  originalCode: string;
  updatedCode: string;
  request: string;
  expectedValue: string;
}

// Test execution context
export interface TestContext {
  component: ComponentName;
  originalCode: string;
  backupPath?: string;
  environment: {
    isDarkMode: boolean;
    viewport: {
      width: number;
      height: number;
    };
    mediaQueries: string[];
  };
}

// Tailwind-specific types for style values
export type TailwindColor = {
  scale: number;        // 50-900
  opacity?: number;     // 0-100
  shade?: string;      // primary, secondary, accent, etc.
};

export type TailwindSpacing = {
  size: number;         // 0-16 or px, rem values
  axis?: 'x' | 'y';    // For specific axis
  responsive?: boolean; // If it should be responsive
};

export type TailwindBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Style update configuration
export interface StyleUpdateConfig {
  property: string;
  value: string | TailwindColor | TailwindSpacing;
  selector?: string;
  important?: boolean;
  breakpoint?: TailwindBreakpoint;
  state?: 'hover' | 'focus' | 'active' | 'disabled';
  scope?: 'local' | 'global' | 'component';
  specificity?: number;
}

// Test generation configuration
export interface TestGenerationConfig {
  focus?: StyleCategory[];
  exclude?: StyleCategory[];
  preferredProperties?: string[];
  constraints?: {
    maxChanges?: number;
    allowedSelectors?: string[];
    restrictedSelectors?: string[];
    requireContext?: boolean;
  };
}

// Version control for type changes
export type Version = `v${number}.${number}.${number}`;

// Versioned component type
export interface VersionedComponent {
  version: Version;
  name: ComponentName;
  schema: ComponentSchema;
}

// Component schema to track available modifications
export interface ComponentSchema {
  styles: {
    [K in StyleCategory]?: {
      properties: string[];
      constraints?: {
        allowedValues?: string[];
        validation?: (value: any) => boolean;
      };
    };
  };
  content: {
    [K in ContentProperty]?: {
      type: 'text' | 'html' | 'markdown';
      multiline: boolean;
      validation?: (value: string) => boolean;
    };
  };
  layout: {
    [K in LayoutProperty]?: {
      breakpoints: TailwindBreakpoint[];
      constraints?: {
        minValue?: number;
        maxValue?: number;
        allowedValues?: string[];
      };
    };
  };
}

// Enhanced test case with version control
export interface VersionedTestCase extends TestCase {
  version: Version;
  componentVersion: Version;
  metadata: {
    author?: string;
    createdAt: Date;
    dependencies?: {
      component: string;
      version: Version;
    }[];
    rollbackStrategy?: 'revert' | 'compensate';
  };
  validation: {
    preConditions?: Array<{
      check: string;
      errorMessage: string;
    }>;
    postConditions?: Array<{
      check: string;
      errorMessage: string;
    }>;
  };
}

// Enhanced test result with detailed tracking
export interface EnhancedTestResult extends TestResult {
  version: Version;
  metadata: {
    environment: {
      nodeVersion: string;
      dependencies: Record<string, string>;
      timestamp: Date;
    };
    performance: {
      executionTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  changes: Array<{
    type: TestCaseType;
    property: string;
    oldValue: string;
    newValue: string;
    selector?: string;
    appliedAt: string;
    version: Version;
    hash: string; // Hash of the change for integrity checking
    dependencies?: string[]; // Other changes this change depends on
  }>;
  rollback?: {
    strategy: 'revert' | 'compensate';
    steps: Array<{
      action: string;
      target: string;
      value: string;
    }>;
  };
}

// Component configuration types
export interface StyleConfig {
  properties: string[];
  constraints?: {
    allowedValues?: string[];
    validation?: (value: any) => boolean;
  };
}

export interface ContentConfig {
  type: 'text' | 'html' | 'markdown';
  multiline: boolean;
  validation?: (value: string) => boolean;
}

export interface LayoutConfig {
  breakpoints: TailwindBreakpoint[];
  constraints?: {
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
  };
} 