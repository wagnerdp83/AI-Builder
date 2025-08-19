import { execSync } from 'child_process';
import { createProductionIndex, restoreOriginalIndex } from './prepare-production.js';

async function buildProduction() {
  console.log('🚀 Starting production build process...');

  try {
    // Step 1: Prepare production index.astro
    const prepared = await createProductionIndex();
    if (!prepared) {
      throw new Error('Failed to prepare production index.astro');
    }

    try {
      // Step 2: Run the build
      console.log('📦 Building site...');
      execSync('npm run build', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      console.log('✨ Production build completed successfully!');
    } finally {
      // Step 3: Always restore the original index.astro
      await restoreOriginalIndex();
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProduction().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}); 