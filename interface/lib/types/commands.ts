import { KNOWN_COMPONENTS } from '@/components/PromptBuilder';

export type CommandType = 'edit' | 'create' | 'delete' | 'chat';

export interface CommandIntent {
  type: CommandType;
  component?: string;
  action?: string;
  target?: string;
  content?: string;
  isValid: boolean;
  reason?: string;
}

// Command patterns for each type of operation
export const COMMAND_PATTERNS = {
  edit: [
    /^(?:edit|update|change|modify|set)\s+(\w+)\s+(.+)$/i,
    /^(\w+):\s*(?:edit|update|change|modify|set)\s+(.+)$/i,
    /^(\w+)\s+(?:edit|update|change|modify|set)\s+(.+)$/i,
  ],
  create: [
    /^(?:create|add|new)\s+(?:a|an)\s+(.+?)(?:\s+section)?$/i
  ],
  delete: [
    /^(?:delete|remove)\s+(?:the\s+)?(\w+)(?:\s+section)?$/i,
    /^(\w+):\s*(?:delete|remove)$/i,
  ]
};

// Helper function to parse commands
export function parseCommand(input: string): CommandIntent {
  // Normalize input
  const normalizedInput = input.trim().toLowerCase();
  
  // Check for edit commands
  for (const pattern of COMMAND_PATTERNS.edit) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const component = match[1];
      const rest = match[2];
      
      // Validate component
      if (!KNOWN_COMPONENTS.includes(component.toLowerCase())) {
        return {
          type: 'edit',
          isValid: false,
          reason: `Unknown component: ${component}. Available components: ${KNOWN_COMPONENTS.join(', ')}`
        };
      }
      
      return {
        type: 'edit',
        component,
        content: rest,
        isValid: true
      };
    }
  }
  
  // Check for create commands
  for (const pattern of COMMAND_PATTERNS.create) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const component = match[1];
      
      return {
        type: 'create',
        component,
        isValid: true
      };
    }
  }
  
  // Check for delete commands
  for (const pattern of COMMAND_PATTERNS.delete) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const component = match[1];
      
      // Validate component
      if (!KNOWN_COMPONENTS.includes(component.toLowerCase())) {
        return {
          type: 'delete',
          isValid: false,
          reason: `Unknown component: ${component}. Available components: ${KNOWN_COMPONENTS.join(', ')}`
        };
      }
      
      return {
        type: 'delete',
        component,
        isValid: true
      };
    }
  }
  
  // If no command patterns match, treat as chat
  return {
    type: 'chat',
    isValid: true
  };
}

// Helper to check if input is a command
export function isCommand(input: string): boolean {
  const { type } = parseCommand(input);
  return type !== 'chat';
} 