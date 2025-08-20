import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Enhanced Generic Pipeline Test', () => {
  beforeAll(() => {
    // Ensure we're in the right directory
    process.chdir(path.resolve(__dirname, '..'));
  });

  it('should generate components with improved accuracy and consistency', async () => {
    // Test the Enhanced Generic Pipeline
    const { executeGenerateFile } = await import('../lib/tools/generateFileHandler');
    
    const testInstructions = {
      componentName: 'ClientGallery',
      generationPrompt: 'Create a client gallery with before/after transformation images in horizontal scroll',
      originalPrompt: 'Create a client gallery with before/after transformation images in horizontal scroll',
      componentNames: ['ClientGallery'],
      mode: 'generic'
    };

    try {
      const result = await executeGenerateFile(testInstructions);
      
      expect(result.success).toBe(true);
      expect(result.componentPaths).toBeDefined();
      expect(Array.isArray(result.componentPaths)).toBe(true);
      expect(result.componentPaths!.length).toBeGreaterThan(0);
      
      // Check if the component file was created
      const componentPath = result.componentPaths![0];
      const fileExists = await fs.access(componentPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Read the generated component to verify improvements
      const componentContent = await fs.readFile(componentPath, 'utf-8');
      
      // Check for enhanced accuracy requirements
      expect(componentContent).toContain('---'); // Frontmatter
      expect(componentContent).not.toContain('<!DOCTYPE'); // No full HTML
      expect(componentContent).toMatch(/<section|<header|<nav|<main|<footer|<aside/); // HTML5 semantic tags
      expect(componentContent).toContain('@lucide/astro'); // Correct icon import
      expect(componentContent).not.toContain('lucide-react'); // No React imports
      
      // Check for before/after functionality (for gallery components)
      if (componentPath.includes('Gallery') || componentPath.includes('Client')) {
        expect(componentContent).toMatch(/before.*after|after.*before/i); // Before/after functionality
        expect(componentContent).toMatch(/hover|transition|transform/i); // Hover effects
        expect(componentContent).toMatch(/overflow-x-auto|scroll/i); // Horizontal scroll
      }
      
      // Check for consistent styling
      expect(componentContent).toMatch(/font-serif/); // Consistent serif font
      expect(componentContent).toMatch(/from-pink-50.*to-purple-50|from-pink-500.*to-purple-600/); // Theme colors
      expect(componentContent).toMatch(/text-gray-800|text-gray-600/); // Consistent text colors
      
      // Check for proper icon usage
      expect(componentContent).toMatch(/import.*from.*@lucide\/astro/); // Proper icon imports
      
      console.log('✅ Enhanced Generic Pipeline test passed');
      console.log('✅ Component generated with improvements:', componentPath);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout
}); 