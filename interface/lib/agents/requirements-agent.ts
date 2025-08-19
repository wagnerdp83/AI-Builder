import { LLMRequirementsParser } from '../services/llm-requirements-parser';
import { ComponentKnowledgeBase } from '../services/component-knowledge-base';

interface RequirementsAgentResponse {
  requirements: any;
  confidence: number;
  reasoning: string;
  usedRAG: boolean;
  similarPatterns: any[];
}

export class RequirementsAgent {
  private knowledgeBase: ComponentKnowledgeBase;
  private parser: typeof LLMRequirementsParser;

  constructor() {
    this.knowledgeBase = new ComponentKnowledgeBase();
    this.parser = LLMRequirementsParser;
  }

  /**
   * Parse user requirements using LLM + RAG approach
   */
  async parseRequirements(
    prompt: string,
    componentName?: string
  ): Promise<RequirementsAgentResponse> {
    
    console.log('[RequirementsAgent] Starting intelligent requirements parsing...');
    
    // Step 1: Try RAG-based approach first
    const ragRequirements = await this.knowledgeBase.generateRequirementsWithRAG(prompt, componentName);
    
    if (ragRequirements) {
      console.log('[RequirementsAgent] Using RAG-based requirements');
      
      // Find similar patterns for context
      const similarPatterns = await this.knowledgeBase.findSimilarPatterns(prompt, componentName, 3);
      
      return {
        requirements: ragRequirements,
        confidence: 0.9,
        reasoning: 'Requirements generated using RAG with similar patterns',
        usedRAG: true,
        similarPatterns: similarPatterns.map(entry => ({
          userRequest: entry.pattern.userRequest,
          success: entry.pattern.success,
          similarity: entry.similarity
        }))
      };
    }

    // Step 2: Fallback to pure LLM approach
    console.log('[RequirementsAgent] Using LLM-only approach');
    
    const llmRequirements = await this.parser.parseComponentRequirements(prompt, componentName);
    
    return {
      requirements: llmRequirements.requirements[0] || {},
      confidence: llmRequirements.confidence,
      reasoning: llmRequirements.reasoning,
      usedRAG: false,
      similarPatterns: []
    };
  }

  /**
   * Generate component code based on requirements
   */
  async generateComponentCode(
    requirements: any,
    originalPrompt: string
  ): Promise<string> {
    
    console.log('[RequirementsAgent] Generating component code from requirements...');
    
    return await this.parser.generateComponentCode(requirements, originalPrompt);
  }

  /**
   * Learn from generation results
   */
  async learnFromGeneration(
    userRequest: string,
    componentName: string,
    requirements: any,
    generatedCode: string,
    success: boolean,
    feedback?: string
  ): Promise<void> {
    
    console.log('[RequirementsAgent] Learning from generation result...');
    
    await this.knowledgeBase.learnFromGeneration(
      userRequest,
      componentName,
      requirements,
      generatedCode,
      success,
      feedback
    );
  }

  /**
   * Validate requirements
   */
  validateRequirements(requirements: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.parser.validateRequirements([requirements]);
  }

  /**
   * Get knowledge base statistics
   */
  getKnowledgeBaseStats(): any {
    return this.knowledgeBase.getStats();
  }

  /**
   * Enhanced parsing with multiple strategies
   */
  async parseWithMultipleStrategies(
    prompt: string,
    componentName?: string
  ): Promise<RequirementsAgentResponse> {
    
    console.log('[RequirementsAgent] Using multi-strategy parsing...');
    
    // CRITICAL FIX: Validate inputs before RAG
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.warn('[RequirementsAgent] Invalid prompt for RAG, using LLM-only approach');
      const llmResult = await this.parser.parseComponentRequirements(prompt || 'Generate component', componentName);
      return {
        requirements: llmResult.requirements[0] || {},
        confidence: llmResult.confidence,
        reasoning: 'LLM-only approach due to invalid prompt',
        usedRAG: false,
        similarPatterns: []
      };
    }
    
    // Strategy 1: RAG-based parsing
    const ragResult = await this.knowledgeBase.generateRequirementsWithRAG(prompt, componentName);
    
    // Strategy 2: LLM-based parsing
    const llmResult = await this.parser.parseComponentRequirements(prompt, componentName);
    
    // Strategy 3: Hybrid approach (combine both)
    if (ragResult && llmResult.requirements.length > 0) {
      console.log('[RequirementsAgent] Using hybrid RAG + LLM approach');
      
      // Merge the best parts of both approaches
      const hybridRequirements = this.mergeRequirements(ragResult, llmResult.requirements[0]);
      
      return {
        requirements: hybridRequirements,
        confidence: Math.max(llmResult.confidence, 0.85),
        reasoning: 'Hybrid approach combining RAG patterns with LLM parsing',
        usedRAG: true,
        similarPatterns: []
      };
    }
    
    // Fallback to best available result
    if (ragResult) {
      return {
        requirements: ragResult,
        confidence: 0.9,
        reasoning: 'RAG-based requirements',
        usedRAG: true,
        similarPatterns: []
      };
    }
    
    return {
      requirements: llmResult.requirements[0] || {},
      confidence: llmResult.confidence,
      reasoning: llmResult.reasoning,
      usedRAG: false,
      similarPatterns: []
    };
  }

  /**
   * Merge requirements from different sources
   */
  private mergeRequirements(ragRequirements: any, llmRequirements: any): any {
    const merged = { ...ragRequirements };
    
    // Merge layout specifications
    if (llmRequirements.layout && !merged.layout) {
      merged.layout = llmRequirements.layout;
    }
    
    // Merge content specifications
    if (llmRequirements.content) {
      merged.content = {
        ...merged.content,
        ...llmRequirements.content,
        elements: [...(merged.content?.elements || []), ...(llmRequirements.content?.elements || [])],
        counts: { ...(merged.content?.counts || {}), ...(llmRequirements.content?.counts || {}) },
        text: { ...(merged.content?.text || {}), ...(llmRequirements.content?.text || {}) }
      };
    }
    
    // Merge styling specifications
    if (llmRequirements.styling) {
      merged.styling = { ...merged.styling, ...llmRequirements.styling };
    }
    
    return merged;
  }

  /**
   * Get detailed analysis of user request
   */
  async analyzeUserRequest(prompt: string): Promise<{
    complexity: 'low' | 'medium' | 'high';
    components: string[];
    layoutSpecifications: string[];
    contentSpecifications: string[];
    stylingSpecifications: string[];
  }> {
    
    const analysis = await this.parser.parseComponentRequirements(prompt);
    
    const components = analysis.requirements.map((req: any) => req.componentName);
    const layoutSpecs = analysis.requirements
      .filter((req: any) => req.layout)
      .map((req: any) => `${req.componentName}: ${JSON.stringify(req.layout)}`);
    const contentSpecs = analysis.requirements
      .filter((req: any) => req.content)
      .map((req: any) => `${req.componentName}: ${JSON.stringify(req.content)}`);
    const stylingSpecs = analysis.requirements
      .filter((req: any) => req.styling)
      .map((req: any) => `${req.componentName}: ${JSON.stringify(req.styling)}`);
    
    const complexity = analysis.requirements.length > 3 ? 'high' : 
                     analysis.requirements.length > 1 ? 'medium' : 'low';
    
    return {
      complexity,
      components,
      layoutSpecifications: layoutSpecs,
      contentSpecifications: contentSpecs,
      stylingSpecifications: stylingSpecs
    };
  }
} 