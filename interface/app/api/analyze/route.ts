import { NextRequest, NextResponse } from 'next/server';
import { analyzeComponent, getComponentSuggestions } from '@/lib/agents/smart-analyzer';
import { join } from 'path';

export async function POST(request: NextRequest) {
  console.log('\n=== SMART COMPONENT ANALYZER ===');
  
  try {
    const { component } = await request.json();
    
    if (!component) {
      return NextResponse.json(
        { error: 'Component name is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Analyzing component:', component);

    // Build component path
    const PROJECT_ROOT = process.cwd().replace('/interface', '');
    const componentName = component.charAt(0).toUpperCase() + component.slice(1);
    const componentPath = join(PROJECT_ROOT, 'rendering', 'src', 'components', `${componentName}.astro`);

    // Analyze the component
    const analysis = await analyzeComponent(componentPath);
    
    console.log('📊 Analysis complete:', {
      component: analysis.component,
      totalElements: analysis.structure.totalElements,
      complexity: analysis.structure.complexity,
      editableItems: analysis.editableContent.length
    });

    return NextResponse.json({
      success: true,
      component: analysis.component,
      structure: analysis.structure,
      editableContent: analysis.editableContent,
      suggestions: analysis.suggestions,
      capabilities: {
        canEdit: analysis.editableContent.length > 0,
        supportsMultipleOperations: analysis.structure.totalElements > 3,
        complexityLevel: analysis.structure.complexity
      }
    });

  } catch (error) {
    console.error('❌ Component analysis failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Component analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('\n=== COMPONENT DISCOVERY ===');
  
  try {
    const { readdir } = await import('fs/promises');
    const { join } = require('path');
    
    const PROJECT_ROOT = process.cwd().replace('/interface', '');
    const componentsDir = join(PROJECT_ROOT, 'rendering', 'src', 'components');
    
    // Discover all components
    const files = await readdir(componentsDir);
    const astroFiles = files.filter(file => file.endsWith('.astro'));
    const components = astroFiles.map(file => file.replace('.astro', '').toLowerCase());
    
    console.log('📁 Discovered components:', components);
    
    // Analyze each component quickly
    const componentAnalyses = await Promise.all(
      astroFiles.map(async (file) => {
        const componentPath = join(componentsDir, file);
        const analysis = await analyzeComponent(componentPath);
        
        return {
          name: analysis.component,
          structure: analysis.structure,
          capabilities: {
            canEdit: analysis.editableContent.length > 0,
            editableItems: analysis.editableContent.length
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      totalComponents: components.length,
      components: componentAnalyses,
      systemCapabilities: {
        dynamicAnalysis: true,
        multiOperationSupport: true,
        intelligentTargeting: true,
        templateAgnostic: true
      }
    });

  } catch (error) {
    console.error('❌ Component discovery failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Component discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 