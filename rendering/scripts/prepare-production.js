import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const indexPath = path.join(srcDir, 'pages', 'index.astro');
const prodIndexPath = path.join(srcDir, 'pages', 'index.prod.astro');

async function createProductionIndex() {
  console.log('🔨 Preparing production index.astro...');

  try {
    // Read the original index.astro
    const content = await fs.readFile(indexPath, 'utf8');

    // Remove SectionWrapper imports
    let prodContent = content.replace(/import\s+SectionWrapper\s+from\s+['"].*?['"];?\s*/g, '');

    // Remove SectionWrapper components while keeping their children
    prodContent = prodContent.replace(/<SectionWrapper(?:\s+[^>]*)?>\s*([\s\S]*?)\s*<\/SectionWrapper>/g, (match, innerContent) => {
      // Remove the first level of indentation from innerContent
      return innerContent.replace(/^\s{2,}/gm, '');
    });

    // Clean up any resulting double newlines and extra whitespace
    prodContent = prodContent.replace(/\n{3,}/g, '\n\n').trim() + '\n';

    // Write the production version
    await fs.writeFile(prodIndexPath, prodContent);
    console.log('✅ Created production index.astro');

    // Backup original index.astro
    await fs.rename(indexPath, `${indexPath}.bak`);
    console.log('✅ Backed up original index.astro');

    // Move production version to index.astro
    await fs.rename(prodIndexPath, indexPath);
    console.log('✅ Moved production version to index.astro');

    return true;
  } catch (error) {
    console.error('❌ Error preparing production index:', error);
    return false;
  }
}

async function restoreOriginalIndex() {
  console.log('🔄 Restoring original index.astro...');

  try {
    // Check if backup exists
    const backupExists = await fs.access(`${indexPath}.bak`)
      .then(() => true)
      .catch(() => false);

    if (backupExists) {
      // Restore original
      await fs.rename(`${indexPath}.bak`, indexPath);
      console.log('✅ Restored original index.astro');
    } else {
      console.log('⚠️ No backup found, keeping current version');
    }
  } catch (error) {
    console.error('❌ Error restoring original index:', error);
  }
}

export { createProductionIndex, restoreOriginalIndex }; 