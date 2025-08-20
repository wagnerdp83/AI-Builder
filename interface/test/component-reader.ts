import { promises as fs } from 'fs';
import { join } from 'path';
import { ComponentName } from './types';
import { TEST_CONFIG } from './config';
import { logTestActivity } from './logger';

// Component content cache
const componentCache = new Map<ComponentName, string>();
const cacheTimestamps = new Map<ComponentName, number>();
const CACHE_DURATION = 30000; // 30 seconds

// Read component content
export async function readComponentContent(
  component: ComponentName, 
  testId: string,
  useCache: boolean = true
): Promise<string> {
  try {
    logTestActivity(testId, 'info', `Reading component: ${component}`);

    // Check cache first
    if (useCache && isCacheValid(component)) {
      const cachedContent = componentCache.get(component);
      if (cachedContent) {
        logTestActivity(testId, 'debug', `Using cached content for ${component}`);
        return cachedContent;
      }
    }

    // Get file path
    const filePath = getComponentFilePath(component);
    logTestActivity(testId, 'debug', `Reading from file: ${filePath}`);

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Update cache
    componentCache.set(component, content);
    cacheTimestamps.set(component, Date.now());

    logTestActivity(testId, 'info', `Successfully read ${component} (${content.length} chars)`);
    return content;
  } catch (error) {
    logTestActivity(testId, 'error', `Failed to read component ${component}`, error);
    throw new Error(`Cannot read component ${component}: ${error}`);
  }
}

// Write component content (for testing modifications)
export async function writeComponentContent(
  component: ComponentName,
  content: string,
  testId: string,
  createBackup: boolean = true
): Promise<void> {
  try {
    const filePath = getComponentFilePath(component);
    logTestActivity(testId, 'info', `Writing component: ${component}`);

    // Create backup if requested
    if (createBackup) {
      await createComponentBackup(component, testId);
    }

    // Write new content
    await fs.writeFile(filePath, content, 'utf-8');
    
    // Clear cache for this component
    componentCache.delete(component);
    cacheTimestamps.delete(component);

    logTestActivity(testId, 'info', `Successfully wrote ${component} (${content.length} chars)`);
  } catch (error) {
    logTestActivity(testId, 'error', `Failed to write component ${component}`, error);
    throw new Error(`Cannot write component ${component}: ${error}`);
  }
}

// Create backup of component
export async function createComponentBackup(
  component: ComponentName,
  testId: string
): Promise<string> {
  try {
    const originalPath = getComponentFilePath(component);
    const backupPath = `${originalPath}.backup-${testId}-${Date.now()}`;
    
    await fs.copyFile(originalPath, backupPath);
    logTestActivity(testId, 'info', `Backup created: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    logTestActivity(testId, 'error', `Failed to create backup for ${component}`, error);
    throw error;
  }
}

// Restore component from backup
export async function restoreComponentFromBackup(
  component: ComponentName,
  backupPath: string,
  testId: string
): Promise<void> {
  try {
    const originalPath = getComponentFilePath(component);
    await fs.copyFile(backupPath, originalPath);
    
    // Clear cache
    componentCache.delete(component);
    cacheTimestamps.delete(component);
    
    logTestActivity(testId, 'info', `Restored ${component} from backup: ${backupPath}`);
  } catch (error) {
    logTestActivity(testId, 'error', `Failed to restore ${component} from backup`, error);
    throw error;
  }
}

// Read index.astro content
export async function readIndexContent(testId: string): Promise<string> {
  try {
    const indexPath = join(process.cwd(), TEST_CONFIG.indexPath);
    const content = await fs.readFile(indexPath, 'utf-8');
    
    logTestActivity(testId, 'info', `Read index.astro (${content.length} chars)`);
    return content;
  } catch (error) {
    logTestActivity(testId, 'error', 'Failed to read index.astro', error);
    throw error;
  }
}

// Get available components from index.astro
export async function getAvailableComponents(testId: string): Promise<ComponentName[]> {
  try {
    const indexContent = await readIndexContent(testId);
    const components: ComponentName[] = [];
    
    // Parse import statements to find components
    const importRegex = /import\s+(\w+)\s+from\s+['"`]\.\.\/components\/(\w+)\.astro['"`]/g;
    let match;
    
    while ((match = importRegex.exec(indexContent)) !== null) {
      const componentName = match[1] as ComponentName;
      if (TEST_CONFIG.components.includes(componentName)) {
        components.push(componentName);
      }
    }
    
    // Also check for components used in the template
    const componentRegex = /<(\w+)(?:\s|>)/g;
    while ((match = componentRegex.exec(indexContent)) !== null) {
      const componentName = match[1] as ComponentName;
      if (TEST_CONFIG.components.includes(componentName) && !components.includes(componentName)) {
        components.push(componentName);
      }
    }
    
    logTestActivity(testId, 'info', `Found ${components.length} available components`, components);
    return components;
  } catch (error) {
    logTestActivity(testId, 'error', 'Failed to get available components', error);
    return TEST_CONFIG.components as ComponentName[];
  }
}

// Validate component exists
export async function validateComponentExists(
  component: ComponentName,
  testId: string
): Promise<boolean> {
  try {
    const filePath = getComponentFilePath(component);
    await fs.access(filePath);
    logTestActivity(testId, 'info', `Component ${component} exists`);
    return true;
  } catch (error) {
    logTestActivity(testId, 'warn', `Component ${component} does not exist`);
    return false;
  }
}

// Get component file path
function getComponentFilePath(component: ComponentName): string {
  const relativePath = TEST_CONFIG.componentPaths[component];
  return join(process.cwd(), relativePath);
}

// Check if cache is valid
function isCacheValid(component: ComponentName): boolean {
  const timestamp = cacheTimestamps.get(component);
  if (!timestamp) return false;
  
  return Date.now() - timestamp < CACHE_DURATION;
}

// Clear component cache
export function clearComponentCache(): void {
  componentCache.clear();
  cacheTimestamps.clear();
}

// Get cache statistics
export function getCacheStats(): object {
  return {
    cachedComponents: Array.from(componentCache.keys()),
    cacheSize: componentCache.size,
    totalCacheAge: Date.now() - Math.min(...Array.from(cacheTimestamps.values()))
  };
}

// Analyze component structure
export async function analyzeComponentStructure(
  component: ComponentName,
  testId: string
): Promise<object> {
  try {
    const content = await readComponentContent(component, testId);
    
    // Basic analysis
    const lines = content.split('\n').length;
    const hasStyles = content.includes('<style>') || content.includes('class=');
    const hasScript = content.includes('<script>');
    const imports = (content.match(/import\s+.*from/g) || []).length;
    const components = (content.match(/<[A-Z]\w+/g) || []).length;
    
    const analysis = {
      lines,
      hasStyles,
      hasScript,
      imports,
      components,
      size: content.length
    };
    
    logTestActivity(testId, 'info', `Analyzed ${component} structure`, analysis);
    return analysis;
  } catch (error) {
    logTestActivity(testId, 'error', `Failed to analyze ${component} structure`, error);
    return {};
  }
} 