import { describe, it, expect, beforeAll } from 'vitest';
import { DynamicPromptGenerator } from '../lib/services/dynamic-prompt-generator';

describe('Enhanced Dynamic Prompt Generator - 100% Dynamic', () => {
  let promptGenerator: DynamicPromptGenerator;

  beforeAll(async () => {
    promptGenerator = new DynamicPromptGenerator();
  });

  describe('Dynamic Checklist Generation', () => {
    it('should extract split layout requirements dynamically from user request', async () => {
      const userPrompt = `Create a Showcase & Testimonials Section with:
      Split layout:
      Left: Image & video gallery of beekeeping process, seasonal harvests, honey fairs in Germany
      Right: Testimonial slider with 4–5 reviews from happy customers (include star ratings, photos, and short quotes)
      Final CTA strip encouraging bulk orders, gift sets, or subscription honey boxes`;

      const checklist = await (promptGenerator as any).generateComponentChecklist('ShowcaseTestimonials', userPrompt);
      
      // Should contain dynamic requirements extracted from user request
      expect(checklist).toBeDefined();
      expect(checklist.length).toBeGreaterThan(0);
      
      // Should NOT contain any static honey/bee content
      const checklistText = checklist.join(' ').toLowerCase();
      expect(checklistText).not.toContain('hive inspection');
      expect(checklistText).not.toContain('spring honey');
      expect(checklistText).not.toContain('German honey festivals');
      
      // Should contain dynamic content from user request
      expect(checklistText).toContain('split layout');
      expect(checklistText).toContain('beekeeping process');
      expect(checklistText).toContain('seasonal harvests');
      expect(checklistText).toContain('honey fairs');
      expect(checklistText).toContain('4-5 reviews');
      expect(checklistText).toContain('bulk orders');
    });

    it('should extract product gallery requirements dynamically from user request', async () => {
      const userPrompt = `Create a Product Gallery with:
      Grid display of 8–10 honey products
      Between every 3 products, insert short looping video clips of:
      Bees collecting nectar
      Honey extraction in the workshop
      Serving ideas (tea, bread, desserts)`;

      const checklist = await (promptGenerator as any).generateComponentChecklist('ProductGallery', userPrompt);
      
      expect(checklist).toBeDefined();
      expect(checklist.length).toBeGreaterThan(0);
      
      // Should NOT contain any static content
      const checklistText = checklist.join(' ').toLowerCase();
      expect(checklistText).not.toContain('doctors in use');
      expect(checklistText).not.toContain('packaging/delivery');
      
      // Should contain dynamic content from user request
      expect(checklistText).toContain('8-10 honey products');
      expect(checklistText).toContain('between every 3 products');
      expect(checklistText).toContain('bees collecting nectar');
      expect(checklistText).toContain('honey extraction');
      expect(checklistText).toContain('serving ideas');
    });

    it('should extract layout requirements dynamically', async () => {
      const userPrompt = `Create a Hero Section with:
      Background Video: Close-up of bees in a hive, honey being poured into jars, or a German countryside apiary
      Overlaid with headline and CTA button
      Below the headline: small horizontal product carousel showing 3–4 best-sellers`;

      const layoutRequirements = await (promptGenerator as any).analyzeLayoutRequirements(userPrompt);
      
      expect(layoutRequirements).toBeDefined();
      expect(layoutRequirements).not.toBe('standard layout');
      
      // Should contain dynamic layout info from user request
      expect(layoutRequirements.toLowerCase()).toContain('hero section');
      expect(layoutRequirements.toLowerCase()).toContain('background video');
      expect(layoutRequirements.toLowerCase()).toContain('product carousel');
    });

    it('should extract content elements dynamically', async () => {
      const userPrompt = `Create a component with:
      Customer testimonials
      Product showcase
      Contact form
      Newsletter signup`;

      const contentElements = await (promptGenerator as any).extractContentElements(userPrompt);
      
      expect(contentElements).toBeDefined();
      expect(contentElements.length).toBeGreaterThan(0);
      
      // Should contain exactly what user requested
      expect(contentElements).toContain('Customer testimonials');
      expect(contentElements).toContain('Product showcase');
      expect(contentElements).toContain('Contact form');
      expect(contentElements).toContain('Newsletter signup');
      
      // Should NOT contain any static examples
      expect(contentElements).not.toContain('hive inspection');
      expect(contentElements).not.toContain('spring honey');
    });

    it('should extract features dynamically', async () => {
      const userPrompt = `Create a component with:
      Interactive carousel
      Hover effects
      Form validation
      Smooth animations`;

      const features = await (promptGenerator as any).extractFeatures(userPrompt);
      
      expect(features).toBeDefined();
      expect(features.length).toBeGreaterThan(0);
      
      // Should contain exactly what user requested
      expect(features).toContain('Interactive carousel');
      expect(features).toContain('Hover effects');
      expect(features).toContain('Form validation');
      expect(features).toContain('Smooth animations');
    });

    it('should extract validation rules dynamically', async () => {
      const userPrompt = `Create a component that:
      Must have exactly 5 testimonials
      Must include star ratings
      Must be mobile responsive
      Must have accessibility features`;

      const validationRules = await (promptGenerator as any).extractValidationRules(userPrompt);
      
      expect(validationRules).toBeDefined();
      expect(validationRules.length).toBeGreaterThan(0);
      
      // Should contain exactly what user requested
      expect(validationRules).toContain('Must have exactly 5 testimonials');
      expect(validationRules).toContain('Must include star ratings');
      expect(validationRules).toContain('Must be mobile responsive');
      expect(validationRules).toContain('Must have accessibility features');
    });
  });

  describe('Dynamic Video Hint Extraction', () => {
    it('should extract video requirements dynamically from user request', async () => {
      const userPrompt = `Create a Product Gallery with:
      Between product rows, insert short loop videos showing close-ups or usage demonstrations`;

      const videoHint = await (promptGenerator as any).extractInterRowVideoHint('ProductGallery', userPrompt);
      
      expect(videoHint).toBeDefined();
      expect(videoHint).toContain('short loop videos');
      expect(videoHint).toContain('close-ups or usage demonstrations');
      
      // Should NOT contain any static video examples
      expect(videoHint).not.toContain('bees collecting nectar');
      expect(videoHint).not.toContain('honey extraction');
    });

    it('should return null when no video requirements specified', async () => {
      const userPrompt = `Create a simple contact form with name, email, and message fields`;

      const videoHint = await (promptGenerator as any).extractInterRowVideoHint('ContactForm', userPrompt);
      
      expect(videoHint).toBeNull();
    });
  });

  describe('Integration with User Prompt Generation', () => {
    it('should generate complete user prompt with dynamic checklist', async () => {
      const userPrompt = `Create a Showcase & Testimonials Section with:
      Split layout:
      Left: Image & video gallery of beekeeping process, seasonal harvests, honey fairs in Germany
      Right: Testimonial slider with 4–5 reviews from happy customers (include star ratings, photos, and short quotes)
      Final CTA strip encouraging bulk orders, gift sets, or subscription honey boxes`;

      const generatedPrompt = await promptGenerator.generateUserPrompt(
        'ShowcaseTestimonials',
        userPrompt,
        {
          businessType: 'honey store',
          industry: 'food',
          targetAudience: 'honey enthusiasts',
          brandVoice: 'warm and natural',
          colorScheme: { primary: '#E6A800', secondary: '#4B2E1E', accent: '#FFF8E1', background: '#FFFFFF' },
          typography: { fontFamily: 'Lora', fontWeights: ['400', '600'], style: 'elegant' },
          navigation: [],
          content: { hero: '', cta: '', services: [], tone: '' },
          functionality: [],
          designNotes: []
        }
      );

      expect(generatedPrompt).toBeDefined();
      expect(generatedPrompt.length).toBeGreaterThan(0);
      
      // Should contain dynamic checklist from user request
      expect(generatedPrompt).toContain('STRICT CHECKLIST (MUST COMPLETE - EXTRACTED FROM USER REQUEST)');
      expect(generatedPrompt).toContain('split layout');
      expect(generatedPrompt).toContain('beekeeping process');
      expect(generatedPrompt).toContain('seasonal harvests');
      expect(generatedPrompt).toContain('honey fairs');
      expect(generatedPrompt).toContain('4-5 reviews');
      expect(generatedPrompt).toContain('bulk orders');
      
      // Should NOT contain any static examples
      expect(generatedPrompt).not.toContain('hive inspection');
      expect(generatedPrompt).not.toContain('spring honey');
      expect(generatedPrompt).not.toContain('German honey festivals');
    });
  });
}); 