import { useCallback, useRef, useState } from 'react';

type StartParams = {
  prompt: string;
  disambiguation?: string;
  endpoint?: string; // default: /api/agent
  onStart?: () => void;
  onToken?: (text: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
};

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const start = useCallback(async ({ prompt, disambiguation, endpoint = '/api/agent', onStart, onToken, onDone, onError }: StartParams) => {
    try {
      // Prepare new abort controller per request
      abortRef.current = new AbortController();
      setIsStreaming(true);
      onStart && onStart();

      const resp = await fetch(`${endpoint}?stream=1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, disambiguation }),
        signal: abortRef.current.signal,
      });

      const contentType = resp.headers.get('content-type') || '';
      // SSE path
      if (resp.ok && contentType.includes('text/event-stream') && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            // Server emits plain token text after 'data: '
            // Do NOT trim, or we will lose leading spaces that belong to the token
            const payload = line.length >= 6 ? line.slice(6) : '';
            if (!payload || payload === '[DONE]') continue;
            full += payload;
            onToken && onToken(payload);
          }
        }
        onDone && onDone(full);
        setIsStreaming(false);
        return;
      }

      // Fallback: JSON response
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        throw new Error(data?.error || 'Failed to get response');
      }
      const text = data.response || data.reasoning || JSON.stringify(data);
      onDone && onDone(String(text));
      setIsStreaming(false);
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        onError && onError('Request cancelled');
      } else {
        onError && onError(e?.message || 'Streaming error');
      }
      setIsStreaming(false);
    }
  }, []);

  return { start, cancel, isStreaming };
}

