import { Tool } from '@/lib/types/mistral';

export interface ToolDecision {
  tool: string;
  confidence: number;
  reasoning: string;
  instructions: Instruction | Instruction[];
}

export interface Instruction {
  filePath?: string;
  arrayName?: string;
  itemIndex?: number;
  updates?: Record<string, string>;
  originalContent?: string;
  newContent?: string;
  elementSelector?: string;
  contentMatch?: string;
  component?: string;
  operation?: string;
  context?: string;
  properties?: Record<string, any>;
  componentName?: string | string[];
  position?: string;
  template?: string;
  imageUrl?: string;
  prompt?: string;
}

export interface AgentResponse {
  success: boolean;
  tool: string;
  decision?: ToolDecision;
  decisions?: ToolDecision[];
  result?: any;
  error?: string;
  suggestions?: string[];
  reasoning: string;
  confidence: number;
  isMultiOperation?: boolean;
}

export interface AgentConfig {
  agentId: string;
  model: string;
  isSpecificAgent: boolean;
}

export interface MistralRequestPayload {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
} 