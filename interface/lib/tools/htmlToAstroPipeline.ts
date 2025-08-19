import { promises as fs } from 'fs';
import path from 'path';
import { getComponentsDir, getRenderingDir } from '../utils/directory';
import { Mistral } from '@mistralai/mistralai';
import { HtmlToAstroConverter, HtmlToAstroResult } from '../services/html-to-astro-converter';
import { updateIndexAstroWithSections } from './generateFileHandler';

const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  throw new Error('MISTRAL_API_KEY is not configured in the environment.');
}
const mistralClient = new Mistral({ apiKey: mistralApiKey });

export interface HtmlToAstroPipelineOptions {
  htmlContent?: string;
  htmlFilePath?: string;
  baseComponentName: string;
  prompt: string;
  saveStylesAndScripts?: boolean;
}

export interface HtmlToAstroPipelineResult {
  success: boolean;
  componentPaths: string[];
  components: string[];
  styles?: string;
  scripts?: string;
  stylesPath?: string;
  scriptsPath?: string;
  guidePath?: string;
}

/**
 * HTML-to-Astro Pipeline: Converts HTML content to Astro components
 * This pipeline is designed to work with the Abstract Pipeline for better accuracy
 */
export async function runHtmlToAstroPipeline(options: HtmlToAstroPipelineOptions): Promise<HtmlToAstroPipelineResult> {
  console.log('=== [TRACE] Entered HTML-to-Astro Pipeline ===');
  
  try {
    let htmlContent: string;
    
    // Get HTML content from either string or file
    if (options.htmlContent) {
      htmlContent = options.htmlContent;
      console.log('[TRACE][HtmlToAstro] Using provided HTML content');
    } else if (options.htmlFilePath) {
      htmlContent = await fs.readFile(options.htmlFilePath, 'utf-8');
      console.log(`[TRACE][HtmlToAstro] Loaded HTML from file: ${options.htmlFilePath}`);
    } else {
      throw new Error('Either htmlContent or htmlFilePath must be provided');
    }

    // Convert HTML to Astro components
    const conversionResult = await HtmlToAstroConverter.convertHtmlToAstroComponents(
      htmlContent,
      options.baseComponentName
    );

    console.log(`[TRACE][HtmlToAstro] Generated ${conversionResult.components.length} components`);

    // Save styles and scripts if requested
    let stylesPath: string | undefined;
    let scriptsPath: string | undefined;
    let guidePath: string | undefined;

    if (options.saveStylesAndScripts) {
      const outputDir = path.join(getRenderingDir(), 'src', 'styles', 'extracted');
      const savedFiles = await HtmlToAstroConverter.saveStylesAndScripts(
        conversionResult.styles,
        conversionResult.scripts,
        outputDir
      );
      stylesPath = savedFiles.stylesPath;
      scriptsPath = savedFiles.scriptsPath;

      // Create integration guide
      guidePath = await HtmlToAstroConverter.createIntegrationGuide(conversionResult, outputDir);
      
      console.log(`[TRACE][HtmlToAstro] Saved styles to: ${stylesPath}`);
      console.log(`[TRACE][HtmlToAstro] Saved scripts to: ${scriptsPath}`);
      console.log(`[TRACE][HtmlToAstro] Created integration guide: ${guidePath}`);
    }

    // Update index.astro with the new components
    await updateIndexAstroWithSections(conversionResult.components);

    console.log('=== [TRACE] Exiting HTML-to-Astro Pipeline ===');

    return {
      success: true,
      componentPaths: conversionResult.componentPaths,
      components: conversionResult.components,
      styles: conversionResult.styles,
      scripts: conversionResult.scripts,
      stylesPath,
      scriptsPath,
      guidePath
    };

  } catch (error) {
    console.error('[ERROR][HtmlToAstro] Pipeline failed:', error);
    return {
      success: false,
      componentPaths: [],
      components: [],
    };
  }
}

/**
 * Enhanced Abstract Pipeline with HTML-to-Astro conversion
 * This combines the traditional Abstract Pipeline with HTML preprocessing for better accuracy
 */
export async function runEnhancedAbstractPipeline(
  componentNames: string[],
  prompt: string,
  htmlExample?: string
): Promise<{ success: boolean; componentPaths: string[] }> {
  console.log('=== [TRACE] Entered Enhanced Abstract Pipeline ===');

  if (htmlExample) {
    // Use HTML-to-Astro conversion for better accuracy
    console.log('[TRACE][EnhancedAbstract] Using HTML example for conversion');
    
    const result = await runHtmlToAstroPipeline({
      htmlContent: htmlExample,
      baseComponentName: 'landing-page',
      prompt,
      saveStylesAndScripts: true
    });

    if (result.success) {
      console.log('[TRACE][EnhancedAbstract] HTML-to-Astro conversion successful');
      return { success: true, componentPaths: result.componentPaths };
    } else {
      console.log('[TRACE][EnhancedAbstract] HTML-to-Astro failed, falling back to traditional pipeline');
    }
  }

  // Fallback to traditional Abstract Pipeline
  console.log('[TRACE][EnhancedAbstract] Using traditional Abstract Pipeline');
  
  // Import the traditional pipeline function
  const { runAbstractCreatePipeline } = await import('./generateFileHandler');
  
  return await runAbstractCreatePipeline({
    componentNames,
    prompt
  });
} 