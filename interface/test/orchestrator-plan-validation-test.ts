import { describe, it, expect, beforeEach } from 'vitest';

// Mock Orchestrator Agent
class MockOrchestratorAgent {
  private planValidationCache: Map<string, any> = new Map();

  validatePlanStructure(plan: any): {
    isValid: boolean;
    hasTasks: boolean;
    hasExecutionOrder: boolean;
    tasksLength: number;
    executionOrderLength: number;
    estimatedTime: string | undefined;
    confidence: string | undefined;
  } {
    const hasTasks = Array.isArray(plan.tasks) && plan.tasks.length > 0;
    const hasExecutionOrder = Array.isArray(plan.executionOrder) && plan.executionOrder.length > 0;
    const tasksLength = hasTasks ? plan.tasks.length : 0;
    const executionOrderLength = hasExecutionOrder ? plan.executionOrder.length : 0;
    const estimatedTime = plan.estimatedTime;
    const confidence = plan.confidence;

    // Validate required fields
    const isValid = hasTasks && 
                   tasksLength > 0 && 
                   typeof estimatedTime === 'string' && 
                   typeof confidence === 'string';

    return {
      isValid,
      hasTasks,
      hasExecutionOrder,
      tasksLength,
      executionOrderLength,
      estimatedTime,
      confidence
    };
  }

  createFallbackPlan(): any {
    return {
      tasks: [
        {
          task_id: 1,
          type: 'requirements',
          description: 'Parse user intent and extract requirements',
          dependencies: [],
          estimated_time: '5 minutes',
          confidence: 0.8
        },
        {
          task_id: 2,
          type: 'generation',
          description: 'Generate component code',
          dependencies: [1],
          estimated_time: '10 minutes',
          confidence: 0.7
        },
        {
          task_id: 3,
          type: 'validation',
          description: 'Validate and optimize code',
          dependencies: [2],
          estimated_time: '3 minutes',
          confidence: 0.9
        }
      ],
      executionOrder: [1, 2, 3],
      estimatedTime: '18 minutes',
      confidence: '0.8'
    };
  }

  executePlan(plan: any): Promise<any> {
    const validation = this.validatePlanStructure(plan);
    
    if (!validation.isValid) {
      console.log('❌ Invalid plan structure, using fallback');
      const fallbackPlan = this.createFallbackPlan();
      return this.executePlan(fallbackPlan);
    }

    return Promise.resolve({
      successfulTasks: validation.tasksLength,
      totalTasks: validation.tasksLength,
      plan: plan
    });
  }

  // Test various malformed plan structures
  getMalformedPlans(): any[] {
    return [
      // Missing tasks array
      {
        executionOrder: [1, 2, 3],
        estimatedTime: '15 minutes',
        confidence: '0.8'
      },

      // Empty tasks array
      {
        tasks: [],
        executionOrder: [1, 2, 3],
        estimatedTime: '15 minutes',
        confidence: '0.8'
      },

      // Missing estimatedTime
      {
        tasks: [
          {
            task_id: 1,
            type: 'requirements',
            description: 'Parse requirements'
          }
        ],
        confidence: '0.8'
      },

      // Missing confidence
      {
        tasks: [
          {
            task_id: 1,
            type: 'requirements',
            description: 'Parse requirements'
          }
        ],
        estimatedTime: '15 minutes'
      },

      // Invalid task structure
      {
        tasks: [
          {
            description: 'Invalid task without required fields'
          }
        ],
        estimatedTime: '15 minutes',
        confidence: '0.8'
      },

      // Tasks not an array
      {
        tasks: 'not an array',
        estimatedTime: '15 minutes',
        confidence: '0.8'
      }
    ];
  }

  getValidPlans(): any[] {
    return [
      // Complete valid plan
      {
        tasks: [
          {
            task_id: 1,
            type: 'requirements',
            description: 'Parse user intent',
            dependencies: [],
            estimated_time: '5 minutes',
            confidence: 0.8
          },
          {
            task_id: 2,
            type: 'generation',
            description: 'Generate code',
            dependencies: [1],
            estimated_time: '10 minutes',
            confidence: 0.7
          }
        ],
        executionOrder: [1, 2],
        estimatedTime: '15 minutes',
        confidence: '0.75'
      },

      // Plan with execution order
      {
        tasks: [
          {
            task_id: 1,
            type: 'requirements',
            description: 'Parse requirements',
            dependencies: [],
            estimated_time: '3 minutes',
            confidence: 0.9
          }
        ],
        executionOrder: [1],
        estimatedTime: '3 minutes',
        confidence: '0.9'
      }
    ];
  }
}

describe('Orchestrator Plan Validation', () => {
  let orchestrator: MockOrchestratorAgent;

  beforeEach(() => {
    orchestrator = new MockOrchestratorAgent();
  });

  it('should validate complete plan structure', () => {
    const validPlan = {
      tasks: [
        {
          task_id: 1,
          type: 'requirements',
          description: 'Parse user intent',
          dependencies: [],
          estimated_time: '5 minutes',
          confidence: 0.8
        }
      ],
      estimatedTime: '5 minutes',
      confidence: '0.8'
    };

    const validation = orchestrator.validatePlanStructure(validPlan);
    
    expect(validation.isValid).toBe(true);
    expect(validation.hasTasks).toBe(true);
    expect(validation.tasksLength).toBe(1);
    expect(validation.estimatedTime).toBe('5 minutes');
    expect(validation.confidence).toBe('0.8');
  });

  it('should reject plans without tasks', () => {
    const invalidPlan = {
      executionOrder: [1, 2, 3],
      estimatedTime: '15 minutes',
      confidence: '0.8'
    };

    const validation = orchestrator.validatePlanStructure(invalidPlan);
    
    expect(validation.isValid).toBe(false);
    expect(validation.hasTasks).toBe(false);
    expect(validation.tasksLength).toBe(0);
  });

  it('should reject plans with empty tasks array', () => {
    const invalidPlan = {
      tasks: [],
      estimatedTime: '15 minutes',
      confidence: '0.8'
    };

    const validation = orchestrator.validatePlanStructure(invalidPlan);
    
    expect(validation.isValid).toBe(false);
    expect(validation.tasksLength).toBe(0);
  });

  it('should reject plans without estimatedTime', () => {
    const invalidPlan = {
      tasks: [
        {
          task_id: 1,
          type: 'requirements',
          description: 'Parse requirements'
        }
      ],
      confidence: '0.8'
    };

    const validation = orchestrator.validatePlanStructure(invalidPlan);
    
    expect(validation.isValid).toBe(false);
    expect(validation.estimatedTime).toBeUndefined();
  });

  it('should reject plans without confidence', () => {
    const invalidPlan = {
      tasks: [
        {
          task_id: 1,
          type: 'requirements',
          description: 'Parse requirements'
        }
      ],
      estimatedTime: '15 minutes'
    };

    const validation = orchestrator.validatePlanStructure(invalidPlan);
    
    expect(validation.isValid).toBe(false);
    expect(validation.confidence).toBeUndefined();
  });

  it('should create fallback plan when validation fails', async () => {
    const invalidPlan = {
      tasks: 'not an array',
      estimatedTime: '15 minutes',
      confidence: '0.8'
    };

    const result = await orchestrator.executePlan(invalidPlan);
    
    expect(result.successfulTasks).toBe(3); // Fallback plan has 3 tasks
    expect(result.totalTasks).toBe(3);
    expect(result.plan.tasks).toBeDefined();
    expect(result.plan.estimatedTime).toBe('18 minutes');
    expect(result.plan.confidence).toBe('0.8');
  });

  it('should handle all malformed plan types', () => {
    const malformedPlans = orchestrator.getMalformedPlans();
    
    for (const plan of malformedPlans) {
      const validation = orchestrator.validatePlanStructure(plan);
      expect(validation.isValid).toBe(false);
    }
  });

  it('should accept all valid plan types', () => {
    const validPlans = orchestrator.getValidPlans();
    
    for (const plan of validPlans) {
      const validation = orchestrator.validatePlanStructure(plan);
      expect(validation.isValid).toBe(true);
    }
  });

  it('should execute valid plans successfully', async () => {
    const validPlan = {
      tasks: [
        {
          task_id: 1,
          type: 'requirements',
          description: 'Parse requirements',
          dependencies: [],
          estimated_time: '3 minutes',
          confidence: 0.9
        }
      ],
      estimatedTime: '3 minutes',
      confidence: '0.9'
    };

    const result = await orchestrator.executePlan(validPlan);
    
    expect(result.successfulTasks).toBe(1);
    expect(result.totalTasks).toBe(1);
    expect(result.plan).toEqual(validPlan);
  });
}); 