import { Agent } from './core/agent';
import { ToolExecutor } from './tools/tool-executor';
import { AgentResponse, ToolDecision } from './types/agent.types';

const agent = new Agent();

export async function selectTool(prompt: string, disambiguation?: string): Promise<ToolDecision> {
  return agent.selectTool(prompt, disambiguation);
}

export async function executeAgentDecision(
  decision: ToolDecision,
  prompt?: string
): Promise<AgentResponse> {
  return ToolExecutor.executeDecision(decision, prompt);
}

export async function getToolDecision(request: string, context: any): Promise<ToolDecision> {
  return agent.selectTool(request);
}

// Re-export types
export type { AgentResponse, ToolDecision };