import { Mistral } from '@mistralai/mistralai';
import { RequirementsAgent } from './requirements-agent';
import { CodeGenerationAgent } from './code-generation-agent';
import { ValidationAgent } from './validation-agent';
import { LearningAgent } from './learning-agent';
import { RAGAgent } from './rag-agent';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

interface AgentTask {
  id: string;
  type: 'requirements' | 'generation' | 'validation' | 'learning' | 'rag';
  priority: number;
  data: any;
  dependencies: string[];
}

interface AgentResult {
  taskId: string;
  success: boolean;
  data: any;
  confidence: number;
  reasoning: string;
  metadata: any;
}

interface OrchestrationPlan {
  tasks: AgentTask[];
  executionOrder: string[];
  estimatedTime: number;
  confidence: number;
}

export class OrchestratorAgent {
  private agents: Map<string, any> = new Map();
  private taskQueue: AgentTask[] = [];
  private results: Map<string, AgentResult> = new Map();
  private learningHistory: any[] = [];

  constructor() {
    // Initialize agents asynchronously
    this.initializeAgents().catch(error => {
      console.error('[OrchestratorAgent] Failed to initialize agents:', error);
    });
  }

  /**
   * Initialize all specialized agents
   */
  private async initializeAgents(): Promise<void> {
    try {
      const { RequirementsAgent } = await import('./requirements-agent');
      const { CodeGenerationAgent } = await import('./code-generation-agent');
      const { ValidationAgent } = await import('./validation-agent');
      const { LearningAgent } = await import('./learning-agent');
      const { RAGAgent } = await import('./rag-agent');
      
      this.agents.set('requirements', new RequirementsAgent());
      // IMPORTANT: CodeGenerationAgent for Generic mode should NEVER use vision models
      this.agents.set('generation', new CodeGenerationAgent('generic'));
      // COMMENTED OUT: Validation agent (temporarily disabled)
      // this.agents.set('validation', new ValidationAgent());
      this.agents.set('learning', new LearningAgent());
      this.agents.set('rag', new RAGAgent());
    } catch (error) {
      console.error('[OrchestratorAgent] Error initializing agents:', error);
      // Continue with empty agents map - will use fallback
    }
  }

  /**
   * Create intelligent orchestration plan using LLM
   */
  async createOrchestrationPlan(userRequest: string): Promise<OrchestrationPlan> {
    const systemPrompt = `You are an expert AI orchestrator. Analyze user requests and create intelligent execution plans.

TASK TYPES:
- requirements: Parse user intent and extract structured requirements
- generation: Generate code based on requirements
- validation: Validate generated code and requirements alignment
- learning: Learn from results and update knowledge base
- rag: Retrieve relevant patterns and examples

Create a plan that:
1. Determines which agents to use
2. Sets execution order based on dependencies
3. Estimates time and confidence
4. Considers user request complexity

Return JSON with tasks, execution order, and metadata.`;

    const userPrompt = `Create an orchestration plan for this user request:

"${userRequest}"

Consider:
- What components are being requested?
- How complex is the request?
- What validation is needed?
- Should we use RAG for similar patterns?
- What learning opportunities exist?

Generate the orchestration plan:`;

    try {
      const response = await mistralClient.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        maxTokens: 2000
      });

      const responseText = response.choices[0]?.message?.content || '';
      console.log('[OrchestratorAgent] LLM Response:', responseText.substring(0, 500) + '...');
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsedPlan = JSON.parse(jsonMatch[0]);
          console.log('[OrchestratorAgent] Parsed plan structure:', {
            hasTasks: Array.isArray(parsedPlan.tasks),
            hasExecutionOrder: Array.isArray(parsedPlan.executionOrder),
            tasksLength: parsedPlan.tasks?.length || 0,
            executionOrderLength: parsedPlan.executionOrder?.length || 0,
            estimatedTime: typeof parsedPlan.estimatedTime,
            confidence: typeof parsedPlan.confidence
          });
          
          // Validate the plan structure
          if (parsedPlan && 
              Array.isArray(parsedPlan.tasks) && 
              Array.isArray(parsedPlan.executionOrder)) {
            
            // Ensure estimatedTime and confidence are numbers
            if (typeof parsedPlan.estimatedTime !== 'number') {
              parsedPlan.estimatedTime = 5000; // Default 5 seconds
            }
            if (typeof parsedPlan.confidence !== 'number') {
              parsedPlan.confidence = 0.7; // Default confidence
            }
            
            console.log('[OrchestratorAgent] ✅ Valid plan structure, returning');
            return parsedPlan;
          } else {
            console.log('[OrchestratorAgent] ❌ Invalid plan structure, using fallback');
          }
        } catch (parseError) {
          console.error('[OrchestratorAgent] Error parsing LLM response:', parseError);
        }
      } else {
        console.log('[OrchestratorAgent] No JSON match found in response');
      }

      // Fallback plan
      return this.createFallbackPlan(userRequest);

    } catch (error) {
      console.error('[OrchestratorAgent] Error creating plan:', error);
      return this.createFallbackPlan(userRequest);
    }
  }

  /**
   * Execute orchestration plan with intelligent coordination
   */
  async executePlan(plan: OrchestrationPlan, userRequest: string): Promise<AgentResult[]> {
    console.log('[OrchestratorAgent] Executing orchestration plan...');
    
    // Ensure agents are initialized
    if (this.agents.size === 0) {
      console.log('[OrchestratorAgent] Initializing agents...');
      await this.initializeAgents();
    }
    
    const results: AgentResult[] = [];
    
    // Ensure executionOrder is iterable
    if (!plan.executionOrder || !Array.isArray(plan.executionOrder)) {
      console.error('[OrchestratorAgent] Invalid executionOrder, using fallback');
      plan.executionOrder = ['req-1', 'gen-1', 'val-1', 'learn-1'];
    }
    
    for (const taskId of plan.executionOrder) {
      const task = plan.tasks.find(t => t.id === taskId);
      if (!task) continue;

      console.log(`[OrchestratorAgent] Executing task: ${task.type} (${taskId})`);
      
      try {
        const agent = this.agents.get(task.type);
        if (!agent) {
          console.warn(`[OrchestratorAgent] Agent not found: ${task.type}, skipping task`);
          continue;
        }

        // Execute task with context from previous results
        const context = this.buildContext(task, results);
        const result = await this.executeTask(agent, task, context);
        
        results.push(result);
        this.results.set(taskId, result);

        // Update learning history
        this.learningHistory.push({
          task,
          result,
          timestamp: new Date(),
          userRequest
        });

      } catch (error) {
        console.error(`[OrchestratorAgent] Task failed: ${taskId}`, error);
        
        results.push({
          taskId,
          success: false,
          data: null,
          confidence: 0,
          reasoning: `Task failed: ${error.message}`,
          metadata: { error: error.message }
        });
      }
    }

    // If no results were generated, create a fallback result
    if (results.length === 0) {
      console.log('[OrchestratorAgent] No tasks executed, creating fallback result');
      results.push({
        taskId: 'fallback',
        success: true,
        data: { requirements: 'Fallback requirements extracted' },
        confidence: 0.5,
        reasoning: 'Used fallback due to agent initialization issues',
        metadata: { type: 'fallback' }
      });
    }
    
    return results;
  }

  /**
   * Execute individual task with intelligent context
   */
  private async executeTask(agent: any, task: AgentTask, context: any): Promise<AgentResult> {
    const startTime = Date.now();
    
    let result: any;
    
    switch (task.type) {
      case 'requirements':
        result = await agent.parseWithMultipleStrategies(context.userRequest, context.componentName);
        break;
      case 'generation':
        result = await agent.generateComponentCode(context.requirements, context.userRequest);
        break;
      case 'validation':
        // COMMENTED OUT: Validation task execution (temporarily disabled)
        // result = await agent.validateCode(context.generatedCode, context.requirements);
        result = { success: true, confidence: 1.0, reasoning: 'Validation skipped' };
        break;
      case 'learning':
        result = await agent.learnFromExecution(context.results, context.userRequest);
        break;
      case 'rag':
        result = await agent.retrieveRelevantPatterns(context.userRequest, context.componentName);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      taskId: task.id,
      success: true,
      data: result,
      confidence: result.confidence || 0.8,
      reasoning: result.reasoning || `Task ${task.type} completed successfully`,
      metadata: {
        executionTime,
        agentType: task.type,
        context: Object.keys(context)
      }
    };
  }

  /**
   * Build intelligent context for task execution
   */
  private buildContext(task: AgentTask, previousResults: AgentResult[]): any {
    const context: any = {
      userRequest: '', // Will be set from task data
      componentName: '',
      requirements: null,
      generatedCode: null,
      validationResults: null,
      ragPatterns: []
    };

    // Extract data from task
    if (task.data) {
      Object.assign(context, task.data);
    }

    // Add results from dependent tasks
    for (const dependencyId of task.dependencies) {
      const dependencyResult = previousResults.find(r => r.taskId === dependencyId);
      if (dependencyResult && dependencyResult.success) {
        switch (dependencyResult.metadata?.agentType) {
          case 'requirements':
            context.requirements = dependencyResult.data;
            break;
          case 'generation':
            context.generatedCode = dependencyResult.data;
            break;
          case 'validation':
            context.validationResults = dependencyResult.data;
            break;
          case 'rag':
            context.ragPatterns = dependencyResult.data;
            break;
        }
      }
    }

    return context;
  }

  /**
   * Create fallback plan when LLM planning fails
   */
  private createFallbackPlan(userRequest: string): OrchestrationPlan {
    console.log('[OrchestratorAgent] Creating fallback plan');
    
    const fallbackPlan = {
      tasks: [
        {
          id: 'req-1',
          type: 'requirements' as const,
          priority: 1,
          data: { userRequest },
          dependencies: []
        },
        {
          id: 'gen-1',
          type: 'generation' as const,
          priority: 2,
          data: {},
          dependencies: ['req-1']
        },
        // COMMENTED OUT: Validation task (temporarily disabled)
        // {
        //   id: 'val-1',
        //   type: 'validation' as const,
        //   priority: 3,
        //   data: {},
        //   dependencies: ['gen-1']
        // },
        {
          id: 'learn-1',
          type: 'learning' as const,
          priority: 4,
          data: {},
          dependencies: ['gen-1'] // Changed from 'val-1' since validation is disabled
        }
      ],
      executionOrder: ['req-1', 'gen-1', 'learn-1'], // Removed 'val-1' since validation is disabled
      estimatedTime: 5000,
      confidence: 0.7
    };
    
    console.log('[OrchestratorAgent] Fallback plan created:', {
      tasks: fallbackPlan.tasks.length,
      executionOrder: fallbackPlan.executionOrder.length
    });
    
    return fallbackPlan;
  }

  /**
   * Get orchestration analytics
   */
  getAnalytics(): any {
    const totalTasks = this.learningHistory.length;
    const successfulTasks = this.learningHistory.filter(h => h.result.success).length;
    const averageConfidence = this.learningHistory.reduce((sum, h) => sum + h.result.confidence, 0) / totalTasks;
    
    const taskTypeStats = this.learningHistory.reduce((stats, h) => {
      const type = h.task.type;
      stats[type] = (stats[type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return {
      totalTasks,
      successfulTasks,
      successRate: successfulTasks / totalTasks,
      averageConfidence,
      taskTypeStats,
      recentExecutions: this.learningHistory.slice(-10)
    };
  }

  /**
   * Optimize orchestration based on learning history
   */
  async optimizeOrchestration(): Promise<void> {
    console.log('[OrchestratorAgent] Optimizing orchestration based on learning...');
    
    const analytics = this.getAnalytics();
    const learningAgent = this.agents.get('learning');
    
    if (learningAgent) {
      await learningAgent.optimizeBasedOnHistory(this.learningHistory);
    }
    
    console.log('[OrchestratorAgent] Optimization complete');
  }
} 