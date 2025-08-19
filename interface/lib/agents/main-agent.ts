import { Intent } from './utils/intent-classifier';
import { ToolDecision } from './types/agent.types';
// NOTE: visualEditHandler is lazily imported where necessary to avoid loading the vision pipeline during non-visual intents
import { Agent as CoreAgent } from './core/agent';

class Agent {
    async selectTool(prompt: string, disambiguation?: string, image?: File, componentNames?: string[]): Promise<ToolDecision> {
        console.log(`[DEBUG] main-agent.ts: selectTool called. Prompt: "${prompt}"`);

        // If the intent is to create, use the simple logic below.
        if (prompt.toLowerCase().includes('create')) {
            // console.log('[DEBUG] main-agent.ts: Matched CREATE intent.');
            // const createMatch = prompt.match(/create\\s+(?:a\\s+)?(?:new\\s+)?(?:section\\s+)?called\\s+([a-zA-Z0-9\\s]+?)\\s+(?:underneath|under|above|below|before|after)\\s+([a-zA-Z0-9\\s]+)/i);
            // if (!createMatch) {
            //     console.error('[DEBUG] main-agent.ts: Create intent matched but regex failed to parse details.');
            //     throw new Error('Could not parse component name and position from create request. Please use format: "create [section] called [name] underneath/above [position]"');
            // }

            // const [_, rawComponentName, rawPosition] = createMatch;
            // const componentName = rawComponentName.trim().toLowerCase().replace(/\\s+/g, '-');
            // const position = rawPosition.trim().toLowerCase();

            // console.log(`[DEBUG] main-agent.ts: Parsed create request for component '${componentName}' at position '${position}'.`);
            
            // return {
            //     tool: 'visual-edit',
            //     confidence: 1.0,
            //     reasoning: `Creating new component '${componentName}' ${position} existing section using GPT-4V + Mistral pipeline`,
            //     instructions: {
            //         // prompt,
            //         componentName,
            //         position
            //     }
            // };
        }
        
        // For all other intents (like EDIT), delegate to the core agent.
        console.log("[DEBUG] main-agent.ts: Delegating to core agent for all intents.");
        const coreAgent = new CoreAgent();
        return coreAgent.selectTool(prompt, disambiguation, image, componentNames);
    }

    async classifyIntent(prompt: string): Promise<Intent> {
        // For now, default to CHAT if we can't determine intent
        return 'CHAT';
    }
}

export const mainAgent = new Agent(); 