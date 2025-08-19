import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export interface MetaTagEditInstructions {
  target?: string;
  newContent?: string;
  component?: string;
  filePath?: string;
  operation?: string;
  properties?: Record<string, any>;
}

export interface MetaTagEditResult {
  success: boolean;
  tagsModified: string[];
  transformationsApplied: number;
  filePath: string;
  error?: string;
}

export async function executeMetaTagEdit(instructions: MetaTagEditInstructions): Promise<MetaTagEditResult> {
  console.log('\n=== Meta Tag Edit Handler ===');
  console.log('Instructions:', instructions);

  try {
    const { target, newContent, component, operation, properties } = instructions;
    
    if (!component) {
      throw new Error('Component is required for meta tag edit');
    }

    // Determine file type and path
    const { filePath, fileType } = determineFilePath(component);
    console.log('Target file:', filePath);

    // Read current content
    const originalContent = await readFile(filePath, 'utf-8');
    
    // Apply meta tag transformation
    const result = await transformMetaTags(
      originalContent,
      filePath,
      target || 'meta',
      newContent || '',
      operation || 'update',
      properties || {}
    );

    if (!result.success) {
      throw new Error(result.error || 'Meta tag transformation failed');
    }

    // Write updated content if changes were made
    if (result.modifiedContent && result.modifiedContent !== originalContent) {
      await writeFile(filePath, result.modifiedContent, 'utf-8');
      
      console.log('Meta tag edit successful');
      console.log('Transformations applied:', result.transformationsApplied);
      console.log('Tags modified:', result.tagsModified);
      console.log('=== End Meta Tag Edit ===\n');

      return {
        success: true,
        tagsModified: result.tagsModified,
        transformationsApplied: result.transformationsApplied,
        filePath
      };
    } else {
      throw new Error(`No meta tags found to modify in ${component}`);
    }

  } catch (error) {
    console.error('Meta tag edit error:', error);
    
    return {
      success: false,
      tagsModified: [],
      transformationsApplied: 0,
      filePath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

interface MetaTransformResult {
  success: boolean;
  modifiedContent?: string;
  tagsModified: string[];
  transformationsApplied: number;
  error?: string;
}

function determineFilePath(component: string): { filePath: string; fileType: string } {
  const componentName = component.charAt(0).toUpperCase() + component.slice(1);
  
  // Check common locations for meta tag files
  const possiblePaths = [
    {
      filePath: join(PROJECT_ROOT, 'rendering', 'src', 'layouts', `${componentName}.astro`),
      fileType: 'layout'
    },
    {
      filePath: join(PROJECT_ROOT, 'rendering', 'src', 'pages', `${component.toLowerCase()}.astro`),
      fileType: 'page'
    },
    {
      filePath: join(PROJECT_ROOT, 'rendering', 'src', 'components', `${componentName}.astro`),
      fileType: 'component'
    }
  ];

  // Default to layout for meta tag operations
  return possiblePaths[0];
}

async function transformMetaTags(
  content: string,
  filePath: string,
  target: string,
  newContent: string,
  operation: string,
  properties: Record<string, any>
): Promise<MetaTransformResult> {
  
  let modifiedContent = content;
  let transformationsApplied = 0;
  const tagsModified: string[] = [];

  console.log(`Applying meta tag transformation: ${operation} on ${target}`);

  // Extract meta information from newContent
  const metaInfo = extractMetaInfo(newContent, properties);
  
  // Get transformation patterns based on target
  const metaPatterns = getMetaPatterns(target, operation, metaInfo);
  
  for (const pattern of metaPatterns) {
    const match = content.match(pattern.regex);
    if (match) {
      console.log(`Found ${target} meta pattern:`, match[0]);
      
      // Apply the meta transformation
      const transformed = content.replace(pattern.regex, pattern.replacer(metaInfo, ...match.slice(1)));
      
      if (transformed !== content) {
        modifiedContent = transformed;
        transformationsApplied++;
        tagsModified.push(pattern.tagType);
        
        console.log('Meta tag transformation successful');
        content = transformed; // Update for next iteration
      }
    }
  }

  // If no existing meta tags found and we're adding, inject into head
  if (transformationsApplied === 0 && (operation === 'add' || operation === 'insert')) {
    const headInsertResult = insertMetaIntoHead(content, metaInfo);
    if (headInsertResult.success) {
      modifiedContent = headInsertResult.modifiedContent!;
      transformationsApplied++;
      tagsModified.push('head-insertion');
    }
  }

  return {
    success: transformationsApplied > 0,
    modifiedContent: transformationsApplied > 0 ? modifiedContent : content,
    tagsModified,
    transformationsApplied,
    error: transformationsApplied === 0 ? `No ${target} meta tags found for ${operation}` : undefined
  };
}

interface MetaInfo {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  viewport?: string;
  charset?: string;
  robots?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

function extractMetaInfo(content: string, properties: Record<string, any>): MetaInfo {
  const metaInfo: MetaInfo = { ...properties };
  const lowerContent = content.toLowerCase();

  // Extract title
  const titleMatch = content.match(/title[:\s]+"([^"]+)"/i) || 
                     content.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    metaInfo.title = titleMatch[1];
  }

  // Extract description
  const descMatch = content.match(/description[:\s]+"([^"]+)"/i);
  if (descMatch) {
    metaInfo.description = descMatch[1];
  }

  // Extract keywords
  const keywordsMatch = content.match(/keywords[:\s]+"([^"]+)"/i);
  if (keywordsMatch) {
    metaInfo.keywords = keywordsMatch[1];
  }

  // Extract Open Graph data
  if (lowerContent.includes('og:') || lowerContent.includes('open graph')) {
    metaInfo.ogTitle = metaInfo.title;
    metaInfo.ogDescription = metaInfo.description;
  }

  // Extract Twitter Card data
  if (lowerContent.includes('twitter') || lowerContent.includes('tweet')) {
    metaInfo.twitterCard = 'summary_large_image';
    metaInfo.twitterTitle = metaInfo.title;
    metaInfo.twitterDescription = metaInfo.description;
  }

  return metaInfo;
}

interface MetaPatternDefinition {
  regex: RegExp;
  tagType: string;
  replacer: (metaInfo: MetaInfo, ...groups: string[]) => string;
}

function getMetaPatterns(target: string, operation: string, metaInfo: MetaInfo): MetaPatternDefinition[] {
  const patterns: MetaPatternDefinition[] = [];

  switch (target.toLowerCase()) {
    case 'title':
      patterns.push({
        regex: /<title>([^<]*)<\/title>/gi,
        tagType: 'title',
        replacer: (meta) => `<title>${meta.title || 'Default Title'}</title>`
      });
      break;

    case 'description':
      patterns.push({
        regex: /<meta\s+name="description"\s+content="([^"]*)"[^>]*>/gi,
        tagType: 'description',
        replacer: (meta) => `<meta name="description" content="${meta.description || 'Default description'}" />`
      });
      break;

    case 'keywords':
      patterns.push({
        regex: /<meta\s+name="keywords"\s+content="([^"]*)"[^>]*>/gi,
        tagType: 'keywords',
        replacer: (meta) => `<meta name="keywords" content="${meta.keywords || ''}" />`
      });
      break;

    case 'viewport':
      patterns.push({
        regex: /<meta\s+name="viewport"\s+content="([^"]*)"[^>]*>/gi,
        tagType: 'viewport',
        replacer: (meta) => `<meta name="viewport" content="${meta.viewport || 'width=device-width, initial-scale=1.0'}" />`
      });
      break;

    case 'og':
    case 'opengraph':
      patterns.push(
        {
          regex: /<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/gi,
          tagType: 'og:title',
          replacer: (meta) => `<meta property="og:title" content="${meta.ogTitle || meta.title || 'Default Title'}" />`
        },
        {
          regex: /<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/gi,
          tagType: 'og:description',
          replacer: (meta) => `<meta property="og:description" content="${meta.ogDescription || meta.description || 'Default description'}" />`
        }
      );
      break;

    case 'twitter':
      patterns.push(
        {
          regex: /<meta\s+name="twitter:card"\s+content="([^"]*)"[^>]*>/gi,
          tagType: 'twitter:card',
          replacer: (meta) => `<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}" />`
        },
        {
          regex: /<meta\s+name="twitter:title"\s+content="([^"]*)"[^>]*>/gi,
          tagType: 'twitter:title',
          replacer: (meta) => `<meta name="twitter:title" content="${meta.twitterTitle || meta.title || 'Default Title'}" />`
        }
      );
      break;

    default:
      // Generic meta tag pattern
      patterns.push({
        regex: /<meta\s+([^>]*)>/gi,
        tagType: 'meta',
        replacer: (meta, attributes) => {
          // Return existing meta tag if no specific replacement
          return `<meta ${attributes}>`;
        }
      });
  }

  return patterns;
}

function insertMetaIntoHead(content: string, metaInfo: MetaInfo): { success: boolean; modifiedContent?: string } {
  const headMatch = content.match(/(<head[^>]*>)([\s\S]*?)(<\/head>)/i);
  
  if (!headMatch) {
    return { success: false };
  }

  const [fullMatch, openHead, headContent, closeHead] = headMatch;
  
  // Generate meta tags to insert
  const metaTags = generateMetaTags(metaInfo);
  
  // Insert after existing meta charset if present, otherwise after opening head tag
  const charsetMatch = headContent.match(/(<meta\s+charset[^>]*>)/i);
  
  let newHeadContent: string;
  if (charsetMatch) {
    newHeadContent = headContent.replace(charsetMatch[1], `${charsetMatch[1]}\n${metaTags}`);
  } else {
    newHeadContent = `\n${metaTags}${headContent}`;
  }

  const newHead = `${openHead}${newHeadContent}${closeHead}`;
  const modifiedContent = content.replace(fullMatch, newHead);

  return {
    success: true,
    modifiedContent
  };
}

function generateMetaTags(metaInfo: MetaInfo): string {
  const tags: string[] = [];

  if (metaInfo.title) {
    tags.push(`    <title>${metaInfo.title}</title>`);
  }

  if (metaInfo.description) {
    tags.push(`    <meta name="description" content="${metaInfo.description}" />`);
  }

  if (metaInfo.keywords) {
    tags.push(`    <meta name="keywords" content="${metaInfo.keywords}" />`);
  }

  if (metaInfo.author) {
    tags.push(`    <meta name="author" content="${metaInfo.author}" />`);
  }

  if (metaInfo.robots) {
    tags.push(`    <meta name="robots" content="${metaInfo.robots}" />`);
  }

  if (metaInfo.canonical) {
    tags.push(`    <link rel="canonical" href="${metaInfo.canonical}" />`);
  }

  // Open Graph tags
  if (metaInfo.ogTitle) {
    tags.push(`    <meta property="og:title" content="${metaInfo.ogTitle}" />`);
  }
  if (metaInfo.ogDescription) {
    tags.push(`    <meta property="og:description" content="${metaInfo.ogDescription}" />`);
  }
  if (metaInfo.ogImage) {
    tags.push(`    <meta property="og:image" content="${metaInfo.ogImage}" />`);
  }
  if (metaInfo.ogUrl) {
    tags.push(`    <meta property="og:url" content="${metaInfo.ogUrl}" />`);
  }

  // Twitter Card tags
  if (metaInfo.twitterCard) {
    tags.push(`    <meta name="twitter:card" content="${metaInfo.twitterCard}" />`);
  }
  if (metaInfo.twitterTitle) {
    tags.push(`    <meta name="twitter:title" content="${metaInfo.twitterTitle}" />`);
  }
  if (metaInfo.twitterDescription) {
    tags.push(`    <meta name="twitter:description" content="${metaInfo.twitterDescription}" />`);
  }
  if (metaInfo.twitterImage) {
    tags.push(`    <meta name="twitter:image" content="${metaInfo.twitterImage}" />`);
  }

  return tags.join('\n');
} 