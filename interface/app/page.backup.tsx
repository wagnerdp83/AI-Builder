import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import ImageUpload from './components/ImageUpload';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<{ file: File; highlight?: { x: number; y: number; width: number; height: number } } | null>(null);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLastResult(null);

    try {
      let finalPrompt = prompt;

      // 1. Handle image upload first
      if (screenshot?.file) {
        const imageFormData = new FormData();
        imageFormData.append('image', screenshot.file);

        const imageResponse = await fetch('/api/image', {
          method: 'POST',
          body: imageFormData,
        });

        const imageResult = await imageResponse.json();

        if (imageResult.success && imageResult.url) {
          console.log('✅ Image uploaded successfully:', imageResult.url);
          // 2. Augment the prompt with the new image URL
          finalPrompt = `${prompt}. The user has uploaded a new image, which is now available at: ${imageResult.url}`;
        } else {
          throw new Error(imageResult.error || 'Image upload failed');
        }
      }
      
      // 3. Send the (potentially augmented) prompt to the edit endpoint
      const requestData = { prompt: finalPrompt };
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      console.log('Edit result:', result);
      setLastResult(result);

      if (result.success) {
        setPrompt('');
        setScreenshot(null);
        window.parent.postMessage({ type: 'refresh' }, '*');
        console.log(`✅ Update successful:`, result.result);
      } else {
        console.error('❌ Edit failed:', result.error);
      }
    } catch (error) {
      console.error('Request error:', error);
      setLastResult({
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewportStyles = {
    mobile: 'w-[375px] max-w-[375px]',
    tablet: 'w-[768px] max-w-[768px]',
    desktop: 'w-full max-w-full'
  };

  return (
    <main className="flex h-screen bg-slate-50">
      {/* Left Panel - Prompt */}
      <div className="w-1/3 p-4 border-r border-slate-200 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>AI Page Editor</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="prompt-textarea">Edit Request</Label>
                <Textarea
                  id="prompt-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your edit request here...&#10;&#10;Examples:&#10;• hero: update headline...&#10;• pricing: change color..."
                  className="w-full h-32 resize-none"
                  disabled={isLoading}
                />
                <ImageUpload
                  onImageSelect={(file, highlight) => setScreenshot({ file, highlight })}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || (!prompt && !screenshot)}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Processing...' : 'Apply Changes'}
              </Button>
            </form>

            {/* Result Display */}
            {lastResult && (
              <div className="mt-4 p-3 rounded-lg border border-slate-200">
                {lastResult.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">✅ Success</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {lastResult.tool}
                      </span>
                    </div>
                    {lastResult.reasoning && (
                       <div className="text-xs text-slate-600">
                         {lastResult.reasoning}
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-red-600 font-medium">❌ Failed</div>
                    <div className="text-sm text-red-700">{lastResult.error}</div>
                    {lastResult.suggestions && (
                      <div className="text-xs text-slate-600 mt-2">
                        <div className="font-medium">Suggestions:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {lastResult.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 p-4">
        <div className="mb-4 flex justify-end space-x-2">
          <Button
            variant={viewport === 'mobile' ? 'default' : 'outline'}
            onClick={() => setViewport('mobile')}
            disabled={isLoading}
          >
            Mobile
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'default' : 'outline'}
            onClick={() => setViewport('tablet')}
            disabled={isLoading}
          >
            Tablet
          </Button>
          <Button
            variant={viewport === 'desktop' ? 'default' : 'outline'}
            onClick={() => setViewport('desktop')}
            disabled={isLoading}
          >
            Desktop
          </Button>
        </div>
        <div className="h-[calc(100vh-8rem)] flex justify-center bg-white rounded-lg shadow-lg relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
                <div className="text-sm text-slate-600">Processing edit...</div>
              </div>
            </div>
          )}
          <div className="w-full h-full flex justify-center">
            <iframe
              src={process.env.NEXT_PUBLIC_ASTRO_URL || 'http://localhost:4321'}
              className={`h-full transition-all duration-300 ${viewportStyles[viewport]}`}
              style={{ minWidth: viewportStyles[viewport].startsWith('w-[') ? viewportStyles[viewport].slice(3, -1) : '100%' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
} 