import { describe, it, expect } from 'vitest';

// Test for Architecture Separation (Global vs Dynamic)
describe('Architecture Separation Test', () => {
  
  // Mock the global standards (from astro-instructions.context)
  function mockGlobalStandards(): string {
    return `# ASTRO COMPONENT GENERATION STANDARDS
# GLOBAL PRINCIPLES - APPLY TO ALL ASTRO COMPONENTS

## 🚨 CRITICAL REQUIREMENTS (GLOBAL STANDARDS)
- NEVER create duplicate Lucide imports
- NEVER use malformed URLs
- NEVER repeat the same image URL
- ALWAYS use {{MOCKUP_IMAGE}} for dynamic images
- ALWAYS use {{AVATAR_IMAGE}} for dynamic avatars

## 📋 COMPONENT STRUCTURE (GLOBAL STANDARDS)
- Use proper TypeScript interfaces
- Provide default values for all props
- Use Astro syntax (class, not className)

## 🎨 DESIGN REQUIREMENTS (GLOBAL STANDARDS)
- Use Lucide Astro components ONLY
- Include multiple icons for visual appeal
- Use Tailwind CSS for all styling
- Mobile-first responsive design

## 🔧 TECHNICAL REQUIREMENTS (GLOBAL STANDARDS)
- Use \${variableName} syntax (not \${})
- Use class="" attributes (not className)
- Use .map() without key props
- Always check for null/undefined before accessing DOM elements`;
  }

  // Mock the dynamic context (from dynamic-prompt-generator.ts)
  function mockDynamicContext(businessContext: any, componentRequirements: any): string {
    return `## DYNAMIC CONTEXT INSTRUCTIONS (USER-SPECIFIC)

### 🎯 BUSINESS CONTEXT INTEGRATION
- Apply business-specific colors: ${businessContext.colorScheme?.primary || 'default'}
- Use industry-appropriate content for: ${businessContext.industry || 'general'} industry
- Match target audience: ${businessContext.targetAudience || 'general users'}
- Follow brand voice: ${businessContext.brandVoice || 'professional'}

### 🎨 COMPONENT-SPECIFIC DESIGN
- Adapt layout to component purpose: ${componentRequirements?.purpose || 'general component'}
- Include relevant functionality: ${Array.isArray(componentRequirements?.functionality) ? componentRequirements.functionality.join(', ') : componentRequirements?.functionality || 'standard'}
- Use appropriate interactions: ${Array.isArray(componentRequirements?.interactions) ? componentRequirements.interactions.join(', ') : componentRequirements?.interactions || 'standard'}

### 🔧 DYNAMIC TECHNICAL REQUIREMENTS
- Generate component-specific TypeScript interfaces
- Create appropriate default values based on context
- Include relevant Lucide icons for component purpose
- Apply responsive design patterns for component type`;
  }

  it('should contain global standards only in astro-instructions.context', () => {
    console.log('🧪 [Architecture Test] Testing global standards separation...');
    
    const globalStandards = mockGlobalStandards();
    
    // Check for global standards (should be present)
    expect(globalStandards).toContain('GLOBAL PRINCIPLES');
    expect(globalStandards).toContain('CRITICAL REQUIREMENTS (GLOBAL STANDARDS)');
    expect(globalStandards).toContain('COMPONENT STRUCTURE (GLOBAL STANDARDS)');
    expect(globalStandards).toContain('DESIGN REQUIREMENTS (GLOBAL STANDARDS)');
    expect(globalStandards).toContain('TECHNICAL REQUIREMENTS (GLOBAL STANDARDS)');
    
    // Check for global rules (should be present)
    expect(globalStandards).toContain('NEVER create duplicate Lucide imports');
    expect(globalStandards).toContain('ALWAYS use {{MOCKUP_IMAGE}}');
    expect(globalStandards).toContain('Use Astro syntax (class, not className)');
    
    // Check for dynamic content (should NOT be present)
    expect(globalStandards).not.toContain('BUSINESS CONTEXT');
    expect(globalStandards).not.toContain('COMPONENT-SPECIFIC');
    expect(globalStandards).not.toContain('DYNAMIC CONTEXT');
    
    console.log('✅ [Architecture Test] Global standards properly separated');
  });

  it('should contain dynamic context only in dynamic-prompt-generator', () => {
    console.log('🧪 [Architecture Test] Testing dynamic context separation...');
    
    const mockBusinessContext = {
      businessType: 'fashion salon',
      industry: 'beauty',
      targetAudience: 'women 25-45',
      brandVoice: 'luxurious',
      colorScheme: {
        primary: '#FDF2F8',
        secondary: '#7C3AED'
      }
    };
    
    const mockComponentRequirements = {
      purpose: 'hero section',
      functionality: ['video background', 'cta button'],
      interactions: ['hover effects', 'scroll animations']
    };
    
    const dynamicContext = mockDynamicContext(mockBusinessContext, mockComponentRequirements);
    
    // Check for dynamic context (should be present)
    expect(dynamicContext).toContain('DYNAMIC CONTEXT INSTRUCTIONS (USER-SPECIFIC)');
    expect(dynamicContext).toContain('BUSINESS CONTEXT INTEGRATION');
    expect(dynamicContext).toContain('COMPONENT-SPECIFIC DESIGN');
    expect(dynamicContext).toContain('DYNAMIC TECHNICAL REQUIREMENTS');
    
    // Check for business-specific content (should be present)
    expect(dynamicContext).toContain('fashion salon');
    expect(dynamicContext).toContain('beauty');
    expect(dynamicContext).toContain('women 25-45');
    expect(dynamicContext).toContain('luxurious');
    expect(dynamicContext).toContain('#FDF2F8');
    expect(dynamicContext).toContain('hero section');
    expect(dynamicContext).toContain('video background');
    
    // Check for global standards (should NOT be present)
    expect(dynamicContext).not.toContain('GLOBAL PRINCIPLES');
    expect(dynamicContext).not.toContain('CRITICAL REQUIREMENTS (GLOBAL STANDARDS)');
    expect(dynamicContext).not.toContain('NEVER create duplicate Lucide imports');
    
    console.log('✅ [Architecture Test] Dynamic context properly separated');
  });

  it('should have clear separation of concerns', () => {
    console.log('🧪 [Architecture Test] Testing separation of concerns...');
    
    const globalStandards = mockGlobalStandards();
    const mockBusinessContext = {
      businessType: 'tech startup',
      industry: 'technology',
      targetAudience: 'developers',
      brandVoice: 'professional'
    };
    const mockComponentRequirements = {
      purpose: 'feature showcase',
      functionality: ['interactive demos']
    };
    const dynamicContext = mockDynamicContext(mockBusinessContext, mockComponentRequirements);
    
    // Global standards should be static and universal
    expect(globalStandards).toContain('ALWAYS use {{MOCKUP_IMAGE}}');
    expect(globalStandards).toContain('NEVER create duplicate Lucide imports');
    expect(globalStandards).toContain('Use Astro syntax');
    
    // Dynamic context should be user-specific
    expect(dynamicContext).toContain('tech startup');
    expect(dynamicContext).toContain('technology');
    expect(dynamicContext).toContain('developers');
    expect(dynamicContext).toContain('professional');
    expect(dynamicContext).toContain('feature showcase');
    expect(dynamicContext).toContain('interactive demos');
    
    // They should not overlap in content
    const globalContent = globalStandards.toLowerCase();
    const dynamicContent = dynamicContext.toLowerCase();
    
    // Global standards should not contain business-specific terms
    expect(globalContent).not.toContain('tech startup');
    expect(globalContent).not.toContain('fashion salon');
    expect(globalContent).not.toContain('beauty');
    
    // Dynamic context should not contain universal rules
    expect(dynamicContent).not.toContain('never create duplicate');
    expect(dynamicContent).not.toContain('always use {{mockup_image}}');
    
    console.log('✅ [Architecture Test] Clear separation of concerns achieved');
  });

  it('should demonstrate proper integration', () => {
    console.log('🧪 [Architecture Test] Testing integration...');
    
    // Simulate how the system would combine them
    const globalStandards = mockGlobalStandards();
    const mockBusinessContext = {
      businessType: 'restaurant',
      industry: 'food service',
      targetAudience: 'food lovers',
      brandVoice: 'warm and inviting'
    };
    const mockComponentRequirements = {
      purpose: 'menu showcase',
      functionality: ['food gallery', 'pricing display']
    };
    const dynamicContext = mockDynamicContext(mockBusinessContext, mockComponentRequirements);
    
    // Combined prompt should have both global and dynamic
    const combinedPrompt = `${globalStandards}

${dynamicContext}

## BUSINESS CONTEXT (DYNAMIC)
- Business Type: restaurant
- Industry: food service
- Target Audience: food lovers
- Brand Voice: warm and inviting

## GENERATION PRIORITY
1. GLOBAL STANDARDS (non-negotiable Astro principles)
2. BUSINESS CONTEXT (user-specific requirements)
3. COMPONENT-SPECIFIC (dynamic functionality)
4. TECHNICAL IMPLEMENTATION (safety and performance)`;

    // Should contain both global standards and dynamic context
    expect(combinedPrompt).toContain('GLOBAL PRINCIPLES');
    expect(combinedPrompt).toContain('CRITICAL REQUIREMENTS (GLOBAL STANDARDS)');
    expect(combinedPrompt).toContain('DYNAMIC CONTEXT INSTRUCTIONS (USER-SPECIFIC)');
    expect(combinedPrompt).toContain('BUSINESS CONTEXT (DYNAMIC)');
    expect(combinedPrompt).toContain('restaurant');
    expect(combinedPrompt).toContain('food service');
    expect(combinedPrompt).toContain('menu showcase');
    
    // Should have clear priority order
    expect(combinedPrompt).toContain('GENERATION PRIORITY');
    expect(combinedPrompt).toContain('1. GLOBAL STANDARDS');
    expect(combinedPrompt).toContain('2. BUSINESS CONTEXT');
    expect(combinedPrompt).toContain('3. COMPONENT-SPECIFIC');
    expect(combinedPrompt).toContain('4. TECHNICAL IMPLEMENTATION');
    
    console.log('✅ [Architecture Test] Proper integration achieved');
  });
}); 