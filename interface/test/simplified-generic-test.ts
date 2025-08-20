import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Simplified Generic Pipeline Test', () => {
  beforeAll(() => {
    // Ensure we're in the right directory
    process.chdir(path.resolve(__dirname, '..'));
  });

  it('should generate components using simplified instructions', async () => {
    // Test the Generic Pipeline with simplified instructions
    const { executeGenerateFile } = await import('../lib/tools/generateFileHandler');
    
    const testInstructions = {
      componentName: 'Hero',
      generationPrompt: 'Create a hero section with background video and booking button',
      originalPrompt: 'Create a hero section with background video and booking button',
      componentNames: ['Hero'],
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
      
      // Read the generated component to verify it follows simplified rules
      const componentContent = await fs.readFile(componentPath, 'utf-8');
      
      // Check for simplified instruction compliance
      expect(componentContent).toContain('---'); // Frontmatter
      expect(componentContent).not.toContain('<!DOCTYPE'); // No full HTML
      expect(componentContent).not.toContain('<html>'); // No full HTML
      expect(componentContent).not.toContain('<head>'); // No full HTML
      expect(componentContent).not.toContain('<body>'); // No full HTML
      expect(componentContent).toMatch(/<section|<header|<nav|<main|<footer|<aside/); // HTML5 semantic tags
      expect(componentContent).toContain('@lucide/astro'); // Correct icon import
      expect(componentContent).not.toContain('lucide-react'); // No React imports
      
      console.log('✅ Simplified Generic Pipeline test passed');
      console.log('✅ Component generated:', componentPath);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout
}); 