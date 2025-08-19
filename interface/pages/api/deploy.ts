import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;

  if (!buildHookUrl) {
    console.error('Netlify build hook URL is not set.');
    return res.status(500).json({ success: false, message: 'Server configuration error: Build hook URL is not set.' });
  }

  try {
    // Run the production build first
    console.log('🔨 Running production build...');
    const renderingDir = path.join(process.cwd(), '..', 'rendering');
    
    execSync('npm run build:production', {
      stdio: 'inherit',
      cwd: renderingDir
    });
    
    console.log('✅ Production build completed');

    // Trigger Netlify build
    console.log('🚀 Triggering Netlify build...');
    const response = await fetch(buildHookUrl, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger Netlify build: ${response.statusText}`);
    }
    
    res.status(200).json({ success: true, message: 'Build completed and Netlify deployment triggered successfully!' });

  } catch (error: any) {
    console.error('An error occurred during build/deploy:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during build/deploy.',
      error: error.message || 'Unknown error',
    });
  }
} 