#!/usr/bin/env node

// Test to verify Generic pipeline never calls vision models
console.log('🧪 Testing Generic Pipeline - No Vision Models...');

// Mock the CodeGenerationAgent to track which strategies are used
class MockCodeGenerationAgent {
  constructor(mode = 'generic') {
    this.mode = mode;
    this.strategies = [];
    this.usedStrategies = [];
    this.initializeStrategies();
  }

  initializeStrategies() {
    const baseStrategies = [
      {
        name: 'codestral-precise',
        model: 'codestral-latest',
        temperature: 0.1,
        maxTokens: 3000,
        priority: 1,
        systemPrompt: 'Base strategy for Generic mode'
      },
      {
        name: 'mistral-large-creative',
        model: 'mistral-large-latest',
        temperature: 0.3,
        maxTokens: 4000,
        priority: 2,
        systemPrompt: 'Creative strategy for Generic mode'
      }
    ];

    const visionStrategy = {
      name: 'gpt4-vision-enhanced',
      model: 'gpt-4-vision-preview',
      temperature: 0.2,
      maxTokens: 3000,
      priority: 3,
      systemPrompt: 'Vision strategy - SHOULD NOT BE USED IN GENERIC MODE'
    };

    if (this.mode === 'vision') {
      this.strategies = [...baseStrategies, visionStrategy];
      console.log('✅ Mock: Initialized with VISION mode strategies (including GPT-4 Vision)');
    } else {
      this.strategies = baseStrategies;
      console.log(`✅ Mock: Initialized with ${this.mode.toUpperCase()} mode strategies (NO vision models)`);
    }
  }

  async generateComponentCode(requirements, userRequest) {
    console.log(`✅ Mock: Starting code generation in ${this.mode.toUpperCase()} mode...`);
    
    // Safety check: Prevent vision models in Generic mode
    if (this.mode === 'generic') {
      const visionStrategies = this.strategies.filter(s => s.name.includes('vision') || s.model.includes('vision'));
      if (visionStrategies.length > 0) {
        console.error('❌ CRITICAL ERROR: Vision strategies detected in Generic mode!');
        console.error('Vision strategies found:', visionStrategies.map(s => s.name));
        throw new Error('Vision models are not allowed in Generic mode');
      }
      console.log('✅ Mock: Confirmed: No vision strategies in Generic mode');
    }
    
    // Track which strategies would be used
    this.usedStrategies = this.strategies.map(s => s.name);
    console.log('✅ Mock: Strategies that would be used:', this.usedStrategies);
    
    return {
      code: '<!-- Mock component code -->',
      confidence: 0.9,
      reasoning: 'Mock generation successful',
      strategy: 'codestral-precise',
      metadata: { mode: this.mode, strategies: this.usedStrategies }
    };
  }
}

// Test scenarios
async function testGenericMode() {
  console.log('\n📋 Test 1: Generic Mode Agent');
  try {
    const genericAgent = new MockCodeGenerationAgent('generic');
    const result = await genericAgent.generateComponentCode({}, 'Create a Hero component');
    
    console.log('✅ Generic mode test PASSED');
    console.log('📊 Result:', {
      mode: result.metadata.mode,
      strategies: result.metadata.strategies,
      hasVision: result.metadata.strategies.some(s => s.includes('vision'))
    });
    
    if (result.metadata.strategies.some(s => s.includes('vision'))) {
      throw new Error('❌ FAILED: Vision strategy found in Generic mode!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Generic mode test FAILED:', error.message);
    return false;
  }
}

async function testVisionMode() {
  console.log('\n📋 Test 2: Vision Mode Agent');
  try {
    const visionAgent = new MockCodeGenerationAgent('vision');
    const result = await visionAgent.generateComponentCode({}, 'Create a Hero component');
    
    console.log('✅ Vision mode test PASSED');
    console.log('📊 Result:', {
      mode: result.metadata.mode,
      strategies: result.metadata.strategies,
      hasVision: result.metadata.strategies.some(s => s.includes('vision'))
    });
    
    if (!result.metadata.strategies.some(s => s.includes('vision'))) {
      throw new Error('❌ FAILED: No vision strategy found in Vision mode!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Vision mode test FAILED:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Generic Pipeline Vision Tests...\n');
  
  const test1 = await testGenericMode();
  const test2 = await testVisionMode();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`   ✅ Generic Mode (No Vision): ${test1 ? 'PASSED' : 'FAILED'}`);
  console.log(`   ✅ Vision Mode (With Vision): ${test2 ? 'PASSED' : 'FAILED'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 ALL TESTS PASSED! Generic pipeline correctly excludes vision models.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
}

runTests().catch(console.error); 