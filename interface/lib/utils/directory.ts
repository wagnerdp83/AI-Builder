import path from 'path';

const PROJECT_ROOT = process.cwd(); // Reverted back to original - this affects all pipelines
// const PROJECT_ROOT = path.resolve(process.cwd(), '..'); // Commented out - this was affecting all pipelines

/**
 * Returns the absolute path to the rendering directory.
 * @param subpath - An optional subpath to append.
 */
export const getRenderingDir = (subpath: string = ''): string => {
    return path.join(PROJECT_ROOT, 'rendering', subpath);
};

/**
 * Returns the absolute path to the templates directory.
 * @param subpath - An optional subpath to append.
 */
export const getTemplatesDir = (subpath: string = ''): string => {
    return path.join(PROJECT_ROOT, 'templates', subpath);
};

/**
 * Returns the absolute path to the components directory within the rendering engine.
 * @param subpath - An optional subpath to append (e.g., 'Hero.astro').
 */
export const getComponentsDir = (subpath: string = ''): string => {
    return getRenderingDir(path.join('src', 'components', subpath));
};

/**
 * Returns the absolute path to the pages directory within the rendering engine.
 * @param subpath - An optional subpath to append (e.g., 'index.astro').
 */
export const getPagesDir = (subpath: string = ''): string => {
    return getRenderingDir(path.join('src', 'pages', subpath));
};

/**
 * Returns the relative path of a component from the 'rendering' directory root.
 * @param absolutePath - The absolute path to the component file.
 * @returns The relative path (e.g., 'src/components/MyComponent.astro').
 */
export const getRelativeComponentPath = (absolutePath: string): string => {
    const renderingDir = getRenderingDir();
    return path.relative(renderingDir, absolutePath);
}; 