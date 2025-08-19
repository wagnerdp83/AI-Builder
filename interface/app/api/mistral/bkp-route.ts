import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, access } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const ASTRO_SERVER = process.env.NEXT_PUBLIC_ASTRO_SERVER || 'http://localhost:4321'
const PROJECT_ROOT = process.cwd().replace('/interface', '')
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai'

interface ComponentContent {
  path: string;
  content: string;
}

// Helper to find all Astro components in the rendering project
async function findAllAstroComponents(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`cd "${PROJECT_ROOT}/rendering" && find src -type f -name "*.astro"`)
    return stdout.split('\n').filter(Boolean)
  } catch (error) {
    console.error('Error finding components:', error)
    return []
  }
}

// Helper to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fullPath = filePath.startsWith('rendering/') ? filePath : `rendering/${filePath}`
    await access(join(PROJECT_ROOT, fullPath))
    return true
  } catch {
    return false
  }
}

// Helper to get file content
async function getFileContent(filePath: string): Promise<string> {
  const fullPath = filePath.startsWith('rendering/') ? filePath : `rendering/${filePath}`
  if (!await fileExists(fullPath)) {
    throw new Error(`File not found: ${fullPath}`)
  }
  return readFile(join(PROJECT_ROOT, fullPath), 'utf-8')
}

// Helper to apply changes to file
async function applyChanges(filePath: string, originalContent: string, newContent: string): Promise<void> {
  try {
    // Ensure the file path starts with rendering/src
    const normalizedPath = filePath.startsWith('src/') ? `rendering/${filePath}` : 
                          filePath.startsWith('rendering/src/') ? filePath : 
                          `rendering/src/${filePath.replace(/^src\//, '')}`;
    
    // Get the full path
    const fullPath = join(PROJECT_ROOT, normalizedPath);
    
    // Get current content
    const currentContent = await readFile(fullPath, 'utf-8');
    
    // Replace the exact content that Mistral identified
    const updatedContent = currentContent.replace(
      originalContent,
      newContent
    );
    
    // Write the file
    await writeFile(fullPath, updatedContent, 'utf-8');
    console.log('File updated successfully:', fullPath);
  } catch (error) {
    console.error('Error applying changes:', error);
    throw error;
  }
}

// Helper to refresh Astro preview
async function refreshAstroPreview(): Promise<boolean> {
  const endpoints = [
    `${ASTRO_SERVER}/_refresh`,
    `${ASTRO_SERVER}/__refresh`,
    `${ASTRO_SERVER}/_hmr`,
    `${ASTRO_SERVER}/__hmr`,
    `${ASTRO_SERVER}/__vite_ws`,
    `${ASTRO_SERVER}/__vite_hmr`,
  ];

  let success = false;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

      if (response.ok || response.status === 426) {
        success = true;
        break;
      }
    } catch (error) {
      console.error(`Failed to refresh using ${endpoint}:`, error);
    }
  }

  if (!success) {
    try {
      // If all endpoints fail, try to trigger a full page reload
      const response = await fetch(`${ASTRO_SERVER}/`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
      if (response.ok) {
        success = true;
      }
    } catch (error) {
      console.error('Failed to refresh Astro preview:', error);
    }
  }

  return success;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        ...Object.fromEntries(request.headers),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    })

    const contentType = response.headers.get('Content-Type') || ''
    const isHTML = contentType.includes('text/html')

    if (isHTML) {
      let html = await response.text()
      
      // Add base tag to make all relative URLs resolve to Astro server
      html = html.replace(
        /<head>/i,
        `<head><base href="${ASTRO_SERVER}/" />`
      )

      return new NextResponse(html, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, must-revalidate',
        }
      })
    }

    // For non-HTML content, proxy as-is
    const blob = await response.blob()
    return new NextResponse(blob, {
      status: response.status,
      headers: response.headers
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json()
    
    console.log('Received request:', { prompt, context })
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!MISTRAL_API_KEY) {
      return NextResponse.json(
        { error: 'Mistral API key is not configured' },
        { status: 500 }
      )
    }

    // Get all Astro components
    const allComponents = await findAllAstroComponents()
    console.log('Found components:', allComponents)

    // Get content of all components
    const componentsContent = await Promise.all(
      allComponents.map(async (component) => {
        try {
          const content = await getFileContent(component)
          return { path: component, content } as ComponentContent
        } catch (error) {
          console.error(`Error reading ${component}:`, error)
          return null
        }
      })
    )

    // Filter out any failed reads
    const validComponents = componentsContent.filter((c): c is ComponentContent => c !== null)
    console.log('Valid components:', validComponents.map(c => c.path))

    // Prepare Mistral API request
    const mistralRequest = {
      model: 'codestral-2405',
      messages: [
        {
          role: 'system',
          content: `You are an expert Astro and Tailwind CSS developer. Your task is to modify Astro components based on user requests.

Core Principles:
- Only modify what is explicitly requested
- Preserve existing code structure and imports
- Maintain all comments and documentation
- Follow Astro and Tailwind best practices
- Only reference files that exist in the project

Available Components:
${validComponents.map(c => `\n${c.path}:\n${c.content}`).join('\n')}

Response Format:
{
  "filePath": "src/components/ComponentName.astro",
  "originalContent": "code to replace",
  "newContent": "replacement code"
}

Rules:
1. Validate changes before returning
2. Include necessary context in comments
3. Ensure proper indentation
4. Maintain existing patterns
5. No unnecessary modifications
6. Only reference files that exist in the project
7. Use exact content from the current file for originalContent
8. Always use full path starting with src/components/ for filePath`
        },
        {
          role: 'user',
          content: `Given this prompt: "${prompt}", analyze the Astro components in the rendering project and provide the necessary code changes. Return ONLY a JSON object with filePath, originalContent, and newContent fields. Only reference files that exist in the project.`
        }
      ],
      temperature: 0,
      top_p: 1,
      response_format: { type: "json_object" }
    }

    console.log('Sending request to Mistral API')

    const mistralResponse = await fetch(`${MISTRAL_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify(mistralRequest)
    })

    console.log('Mistral API response status:', mistralResponse.status)

    if (!mistralResponse.ok) {
      const errorData = await mistralResponse.json()
      console.error('Mistral API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to get response from Mistral API', details: errorData },
        { status: mistralResponse.status }
      )
    }

    const mistralData = await mistralResponse.json()
    console.log('Mistral API response:', JSON.stringify(mistralData, null, 2))

    let changes
    try {
      changes = JSON.parse(mistralData.choices[0].message.content)
      console.log('Parsed changes:', JSON.stringify(changes, null, 2))

      // Validate the required fields
      if (!changes.filePath || !changes.originalContent || !changes.newContent) {
        throw new Error('Missing required fields in response')
      }

      // Ensure filePath starts with src/components/
      if (!changes.filePath.startsWith('src/components/')) {
        changes.filePath = `src/components/${changes.filePath}`
      }

      // Validate that the file exists
      if (!await fileExists(changes.filePath)) {
        console.error(`File not found: ${changes.filePath}`)
        return NextResponse.json(
          { error: `File not found: ${changes.filePath}` },
          { status: 404 }
        )
      }

      // Get current content and apply changes
      const currentContent = await getFileContent(changes.filePath)
      console.log('Current content length:', currentContent.length)
      console.log('Original content to replace:', changes.originalContent)
      console.log('New content:', changes.newContent)
      
      // Ensure the original content exists in the file
      if (!currentContent.includes(changes.originalContent)) {
        console.error('Original content not found in file')
        return NextResponse.json(
          { error: 'Original content not found in file', 
            currentContent,
            originalContent: changes.originalContent 
          },
          { status: 400 }
        )
      }

      // Apply the changes
      const fullPath = join(PROJECT_ROOT, 'rendering', changes.filePath)
      console.log('Writing to file:', fullPath)
      
      const updatedContent = currentContent.replace(
        changes.originalContent,
        changes.newContent
      )
      
      if (currentContent === updatedContent) {
        console.error('Content unchanged after replacement')
        return NextResponse.json(
          { error: 'Content unchanged after replacement' },
          { status: 400 }
        )
      }
      
      try {
        await writeFile(fullPath, updatedContent, 'utf-8')
        console.log('File written successfully')
      } catch (error) {
        console.error('Error writing file:', error)
        return NextResponse.json(
          { error: 'Failed to write file', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }

      // Refresh Astro preview
      await refreshAstroPreview()
      console.log('Astro preview refreshed')

      return NextResponse.json({
        success: true,
        message: 'Changes applied successfully',
        changes
      })

    } catch (error) {
      console.error('Error processing Mistral response:', error)
      return NextResponse.json(
        { error: 'Failed to process Mistral response', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}