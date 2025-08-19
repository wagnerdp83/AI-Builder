import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = process.cwd().replace('/interface', '');
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'rendering', 'src', 'components');

/**
 * Constructs the full, absolute path to a component file.
 * @param component The name of the component (e.g., 'hero', 'pricing').
 * @param mode Optional mode - 'create' will skip existence check for new components.
 * @returns The absolute file path to the component's .astro file.
 */
export function getComponentFilePath(component: string, mode?: 'create'): string {
  const componentName = component.endsWith('.astro') ? component : `${component}.astro`;
  const componentFileName = `${componentName.charAt(0).toUpperCase() + componentName.slice(1)}`;
  const filePath = path.join(COMPONENTS_DIR, componentFileName);
  
  // Skip existence check if we're creating a new component
  if (mode === 'create') {
    return filePath;
  }

  // For existing components, verify the file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Component file not found: ${filePath}`);
  }

  return filePath;
}

/**
 * Gets the absolute path to the components directory
 */
export function getComponentsDir(): string {
  return COMPONENTS_DIR;
}

/**
 * Gets the absolute path to a file in the pages directory
 * @param fileName Optional file name to append to the pages directory path
 */
export function getPagesDir(fileName?: string): string {
  const pagesDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'pages');
  return fileName ? path.join(pagesDir, fileName) : pagesDir;
}

/**
 * Gets the absolute path to a file in the public directory
 * @param fileName Optional file name to append to the public directory path
 */
export function getPublicDir(fileName?: string): string {
  const publicDir = path.join(PROJECT_ROOT, 'rendering', 'public');
  return fileName ? path.join(publicDir, fileName) : publicDir;
}

/**
 * Gets the absolute path to a file in the layouts directory
 * @param fileName Optional file name to append to the layouts directory path
 */
export function getLayoutsDir(fileName?: string): string {
  const layoutsDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'layouts');
  return fileName ? path.join(layoutsDir, fileName) : layoutsDir;
}

/**
 * Gets the absolute path to a file in the styles directory
 * @param fileName Optional file name to append to the styles directory path
 */
export function getStylesDir(fileName?: string): string {
  const stylesDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'styles');
  return fileName ? path.join(stylesDir, fileName) : stylesDir;
}

/**
 * Gets the absolute path to a file in the scripts directory
 * @param fileName Optional file name to append to the scripts directory path
 */
export function getScriptsDir(fileName?: string): string {
  const scriptsDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'scripts');
  return fileName ? path.join(scriptsDir, fileName) : scriptsDir;
}

/**
 * Gets the absolute path to a file in the templates directory
 * @param fileName Optional file name to append to the templates directory path
 */
export function getTemplatesDir(fileName?: string): string {
  const templatesDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'templates');
  return fileName ? path.join(templatesDir, fileName) : templatesDir;
}

/**
 * Gets the absolute path to a file in the data directory
 * @param fileName Optional file name to append to the data directory path
 */
export function getDataDir(fileName?: string): string {
  const dataDir = path.join(PROJECT_ROOT, 'rendering', 'src', 'data');
  return fileName ? path.join(dataDir, fileName) : dataDir;
}

/**
 * Gets the absolute path to a file in the images directory
 * @param fileName Optional file name to append to the images directory path
 */
export function getImagesDir(fileName?: string): string {
  const imagesDir = path.join(PROJECT_ROOT, 'rendering', 'public', 'images');
  return fileName ? path.join(imagesDir, fileName) : imagesDir;
}

/**
 * Gets the absolute path to a file in the icons directory
 * @param fileName Optional file name to append to the icons directory path
 */
export function getIconsDir(fileName?: string): string {
  const iconsDir = path.join(PROJECT_ROOT, 'rendering', 'public', 'icons');
  return fileName ? path.join(iconsDir, fileName) : iconsDir;
}

/**
 * Gets the absolute path to a file in the fonts directory
 * @param fileName Optional file name to append to the fonts directory path
 */
export function getFontsDir(fileName?: string): string {
  const fontsDir = path.join(PROJECT_ROOT, 'rendering', 'public', 'fonts');
  return fileName ? path.join(fontsDir, fileName) : fontsDir;
}

/**
 * Gets the absolute path to a file in the assets directory
 * @param fileName Optional file name to append to the assets directory path
 */
export function getAssetsDir(fileName?: string): string {
  const assetsDir = path.join(PROJECT_ROOT, 'rendering', 'public', 'assets');
  return fileName ? path.join(assetsDir, fileName) : assetsDir;
}

/**
 * Gets the absolute path to a file in the config directory
 * @param fileName Optional file name to append to the config directory path
 */
export function getConfigDir(fileName?: string): string {
  const configDir = path.join(PROJECT_ROOT, 'rendering', 'config');
  return fileName ? path.join(configDir, fileName) : configDir;
}