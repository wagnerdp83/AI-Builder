import { NextRequest, NextResponse } from 'next/server';
import { orchestratorAgent } from '@/lib/agents/orchestrator';

// Streaming helper for CHAT intent using Mistral SSE
async function streamChatResponse(prompt: string): Promise<NextResponse> {
  const apiKey = process.env.MISTRAL_API_KEY as string;
  if (!apiKey) {
    return new NextResponse('data: [Error] MISTRAL_API_KEY not configured\n\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }

  const { buildChatSystemPrompt } = await import('@/lib/prompts/chat-system');
  const systemPrompt = buildChatSystemPrompt();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
        });

        if (!resp.ok || !resp.body) {
          controller.enqueue(encoder.encode('data: [Error] Failed to start stream\n\n'));
          controller.close();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        // Parse Mistral SSE and forward only token deltas to client as SSE lines
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const obj = JSON.parse(payload);
              const choice = obj.choices?.[0];
              const token = choice?.delta?.content || choice?.message?.content || choice?.content || '';
              if (token) {
                controller.enqueue(encoder.encode(`data: ${token}\n\n`));
                fullText += token;
              }
            } catch {
              // Fallback: pass through raw payload as text
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              fullText += payload;
            }
          }
        }

        try {
          console.log('[CHAT][Mistral][RAW_STREAM_COMPLETE] bufferTail=\n', buffer.slice(-1000));
        } catch {}

        // Attempt a single auto-continue if Footer looks incomplete or closing tag missing
        const looksIncomplete = (s: string): boolean => {
          const t = (s || '').trim();
          if (!t) return false;
          // Require closing wrapper and Footer content block to be present
          const hasFooter = /<h4[^>]*>\s*Footer\s*<\/h4>/i.test(t) || /<h3[^>]*>\s*Footer\s*<\/h3>/i.test(t);
          const hasFooterContent = /Footer[\s\S]*?(Content|Purpose|Links)/i.test(t);
          const hasClosingDiv = /<\/div>\s*$/.test(t);
          if (!hasFooter || !hasFooterContent || !hasClosingDiv) return true;
          return false;
        };

        if (looksIncomplete(fullText)) {
          try {
            const contResp = await fetch('https://api.mistral.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'mistral-large-latest',
                messages: [
                  { role: 'system', content: systemPrompt + '\nCONTINUE RULES: Continue EXACTLY from where the previous HTML ended. Do NOT repeat any prior content. Return ONLY the remaining HTML needed to complete the structure (especially Footer details) and close any open tags with </div> at the end.' },
                  { role: 'assistant', content: fullText.slice(-4000) },
                  { role: 'user', content: 'Continue the previous HTML.' },
                ],
                temperature: 0.1,
                max_tokens: 1024,
                stream: false,
              }),
            });
            const data = await contResp.json().catch(() => null);
            const cont = data?.choices?.[0]?.message?.content || '';
            if (cont) {
              fullText += cont;
              controller.enqueue(encoder.encode(`data: ${cont}\n\n`));
            }
          } catch {}
        }

        controller.close();
      } catch (err) {
        // Fallback: try a non-streaming completion and deliver as a single SSE chunk
        try {
          const fallback = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'mistral-large-latest',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              temperature: 0.2,
              max_tokens: 4096,
              stream: false,
            }),
          });
          const data = await fallback.json().catch(() => null);
          const content = data?.choices?.[0]?.message?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${content}\n\n`));
          } else {
            controller.enqueue(encoder.encode('data: [Error] Streaming error\n\n'));
          }
        } catch {
          controller.enqueue(encoder.encode('data: [Error] Streaming error\n\n'));
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const stream = url.searchParams.get('stream') === '1' || url.searchParams.get('stream') === 'true';

    // Parse prompt early for streaming decision
    const body = await request.json();
    const prompt = body?.prompt as string;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    if (stream) {
      const p = prompt.toLowerCase().trim();
      const isCreate = /\b(create|build|generate)\s+(a\s+|the\s+)?(landing\s+page|page|site|component)/.test(p);
      const isEdit = /(edit|update|change|modify|replace)\b/.test(p);
      const isDelete = /(delete|remove)\b/.test(p);
      // Non-CRUD → CHAT streaming
      if (!isCreate && !isEdit && !isDelete) {
        return await streamChatResponse(prompt);
      }
      // For CRUD, fall back to regular orchestrator flow
      const result = await orchestratorAgent(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ prompt, disambiguation: body?.disambiguation }) } as any));
      return NextResponse.json(result);
    }

    // Default non-streaming path + chat-to-create bridge
    const action = body?.action as string | undefined;
    if (action === 'create_from_chat') {
      const { chatToCreatePrompt } = await import('@/lib/services/chat-to-create');
      const createPrompt = chatToCreatePrompt(body?.chatHtml || '', body?.promptContext || prompt);
      const result = await orchestratorAgent(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ prompt: createPrompt }) } as any));
      return NextResponse.json(result);
    }

    const result = await orchestratorAgent(new NextRequest(request.url, { method: 'POST', body: JSON.stringify({ prompt, disambiguation: body?.disambiguation }) } as any));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in agent route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 