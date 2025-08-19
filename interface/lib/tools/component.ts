import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseHTML, HTMLElement } from 'node-html-parser';

const RENDERING_DIR = process.env.RENDERING_DIR || '../rendering';

export async function findComponent({ description }: { description: string }) {
  // Search in /rendering/src/components
  const componentsDir = join(RENDERING_DIR, 'src/components');
  
  // This would be replaced with proper component search logic
  // For now, just handle the hero case as an example
  if (description.toLowerCase().includes('hero')) {
    return {
      filePath: join(componentsDir, 'Hero.astro'),
      type: 'hero',
      location: 'main'
    };
  }

  throw new Error('Component not found');
}

export async function analyzeComponent({ filePath }: { filePath: string }) {
  const content = await readFile(filePath, 'utf-8');
  const root = parseHTML(content);

  // For now, just return basic info about the component
  return {
    elements: {
      headings: root.querySelectorAll('h1, h2, h3, h4, h5, h6').map((h: HTMLElement) => ({
        tag: h.tagName.toLowerCase(),
        text: h.text,
        classes: h.classNames
      })),
      buttons: root.querySelectorAll('button, a.button').map((b: HTMLElement) => ({
        tag: b.tagName.toLowerCase(),
        text: b.text,
        classes: b.classNames
      }))
    }
  };
}

export async function modifyComponent({ 
  filePath, 
  operation 
}: { 
  filePath: string;
  operation: {
    type: 'updateText' | 'updateAttribute' | 'addElement' | 'removeElement';
    selector: string;
    value?: string;
  }
}) {
  const content = await readFile(filePath, 'utf-8');
  const root = parseHTML(content);

  const element = root.querySelector(operation.selector);
  if (!element) {
    throw new Error(`Element not found: ${operation.selector}`);
  }

  switch (operation.type) {
    case 'updateText':
      if (!operation.value) throw new Error('Value required for updateText');
      element.set_content(operation.value);
      break;

    case 'updateAttribute':
      if (!operation.value) throw new Error('Value required for updateAttribute');
      const [attr, value] = operation.value.split('=');
      element.setAttribute(attr, value);
      break;

    case 'addElement':
      if (!operation.value) throw new Error('Value required for addElement');
      element.insertAdjacentHTML('beforeend', operation.value);
      break;

    case 'removeElement':
      element.remove();
      break;
  }

  await writeFile(filePath, root.toString());
  return { success: true };
}

export async function previewChanges({ 
  filePath, 
  changes 
}: { 
  filePath: string;
  changes: Array<{
    type: string;
    location: { selector: string };
    oldValue: string;
    newValue: string;
  }>;
}) {
  const content = await readFile(filePath, 'utf-8');
  const root = parseHTML(content);

  const preview = changes.map(change => {
    const element = root.querySelector(change.location.selector);
    if (!element) {
      return {
        error: `Element not found: ${change.location.selector}`,
        change
      };
    }

    return {
      element: change.location.selector,
      before: element.toString(),
      after: element.toString().replace(change.oldValue, change.newValue)
    };
  });

  return { preview };
} 