import { useState, useRef, useEffect } from 'react';
import { useChatStream } from '@/lib/utils/useChatStream';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronUp, ChevronDown, X, Send, Square } from 'lucide-react';
import ImageUpload from '@/app/components/ImageUpload';
import Image from 'next/image';

// A list of known components to check against.
// In a real-world scenario, this might be fetched dynamically.
export const KNOWN_COMPONENTS = [
    'benefits', 'contact', 'culture', 'faq', 'features', 'footer', 
    'header', 'hero', 'pricing', 'socialproof', 'testimonials', 'visualdesign'
];

interface PromptBuilderProps {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: React.ReactNode;
  isPending?: boolean;
}

const INITIAL_MESSAGE: Message = {
    id: 'initial',
    role: 'assistant',
    content: (
        <div>
            <p className="font-semibold mb-2">Welcome to the AI Page Builder!</p>
            <p className="text-sm">
                You can ask me to edit, add, or delete sections of your landing page. 
                Try one of these commands to get started:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 bg-gray-100 dark:bg-neutral-700 p-2 rounded">
                <li><pre className="inline">update hero headline to &quot;My New Headline&quot;</pre></li>
                <li><pre className="inline">add a faq section</pre></li>
                <li><pre className="inline">delete the culture section</pre></li>
            </ul>
        </div>
    )
};

// Helper to create unique IDs for messages
const generateId = () => `${Date.now()}-${Math.random()}`;

// Helper to find mentioned components in a prompt
const findMentionedComponents = (prompt: string): string[] => {
    const mentioned = new Set<string>();
    const normalizedPrompt = prompt.toLowerCase();
    for (const component of KNOWN_COMPONENTS) {
        if (normalizedPrompt.includes(component)) {
            mentioned.add(component);
        }
    }
    return Array.from(mentioned);
};

interface Attachment {
  id: string;
  file: File;
  preview: string;
  url?: string;  // Add URL field for uploaded images
}

export default function PromptBuilder({ isLoading, setIsLoading }: PromptBuilderProps) {
  // Add CSS styles for chat response formatting and enhanced dots animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .chat-response h2 {
        font-size: 1.5rem;
        font-weight: 700;
        
        margin-bottom: 0.5rem;
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }
      .chat-response h3,
      .chat-response h4 {
        font-size: 1.4rem;
        font-weight: 600;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        
      }
     
      
      .chat-response ul {
        margin-bottom: 0.5rem;
        padding-left: 1.5rem;
      }
      .chat-response li {
        margin-bottom: 0.7rem;
        line-height: 1.3rem;
       
       
      }
      .chat-response strong {
        font-weight: 600;
        color: #1f2937;
      }
      .chat-response em {
        font-style: italic;
        color: #6b7280;
      }
      .chat-response hr {
        margin: 1rem 0;
        border: none;
        border-top: 1px solid #262626;
      }
      
      .dark .chat-response h2 {
        color: #f9fafb;
        border-bottom-color: #262626;
      }
      .dark .chat-response h3 {
        color: #e5e7eb;
      }
      .dark .chat-response p,
      .dark .chat-response li {
        color: #d1d5db;
      }
      .dark .chat-response strong {
        color: #f9fafb;
      }
      .dark .chat-response em {
        color: #9ca3af;
      }
      .dark .chat-response hr {
        border-top-color: #4b5563;
      }
      
      /* Enhanced dots animation with higher bounce */
      @keyframes enhancedBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -15px, 0);
        }
        70% {
          transform: translate3d(0, -10px, 0);
        }
        90% {
          transform: translate3d(0, -4px, 0);
        }
      }
      
      .enhanced-bounce {
        animation: enhancedBounce 1.8s ease-in-out infinite;
      }

      /* Keep chat scrollbar position stable while new content streams */
      .chat-scroll {
        overflow-anchor: none;
        overscroll-behavior: contain;
      }

      /* Ensure bullets show for lists */
      .chat-response ul {
        list-style: disc;
        list-style-position: outside;
        padding-left: 1.5rem;
        margin: 0.5rem 0 1rem;
      }
      .chat-response ul ul {
        list-style: circle;
        padding-left: 1.25rem;
        margin: 0.25rem 0 0.75rem;
      }

      /* Remove extra <br> gaps coming from LLM */
      .chat-response br {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [ambiguousPrompt, setAmbiguousPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const { start, cancel, isStreaming } = useChatStream();

  // Function to normalize malformed HTML tags only (no word mutation)
  const normalizeHtmlOnly = (text: string): string => {
    if (!text) return text;
    
    // Fix malformed HTML tags first
    let fixed = text
      // Fix malformed heading tags like <h 2=""> to <h2>
      .replace(/<h\s+(\d+)="">/g, '<h$1>')
      .replace(/<h\s+(\d+)\s*>/g, '<h$1>')
      // Fix headings missing level number but with stray space like <h 2=""> or <h 3>
      .replace(/<h\s+(\d+)[^>]*>/g, '<h$1>')
      // Fix malformed closing tags
      .replace(/<\/h\s+(\d+)>/g, '</h$1>')
      // Fallback: bare </h> to </h2>
      .replace(/<\/h>/g, '</h2>')
      // Fix malformed list tags
      .replace(/<ul\s*>/g, '<ul>')
      .replace(/<\/ul\s*>/g, '</ul>')
      .replace(/<li\s*>/g, '<li>')
      .replace(/<\/li\s*>/g, '</li>')
      // Fix malformed paragraph tags
      .replace(/<p\s*>/g, '<p>')
      .replace(/<\/p\s*>/g, '</p>')
      // Fix malformed div tags
      .replace(/<div\s*>/g, '<div>')
      .replace(/<\/div\s*>/g, '</div>')
      // Fix HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    return fixed;
  };

  // Best-effort sanitizer/normalizer using DOMParser to auto-correct malformed HTML
  const sanitizeAndNormalizeHtml = (html: string): string => {
    try {
      if (typeof window === 'undefined' || !('DOMParser' in window)) return html;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return doc.body.innerHTML || html;
    } catch {
      return html;
    }
  };

  // Insert an <hr> before each <h3> and <h4> to visually separate content blocks
  const insertHrBeforeH3 = (html: string): string => {
    try {
      if (typeof window === 'undefined' || !('DOMParser' in window)) return html;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const headings = Array.from(doc.body.querySelectorAll('h3, h4'));
      for (const h3 of headings) {
        const prevEl = h3.previousElementSibling;
        if (!prevEl || prevEl.tagName !== 'HR') {
          const hr = doc.createElement('hr');
          h3.parentElement?.insertBefore(hr, h3);
        }
      }
      return doc.body.innerHTML || html;
    } catch {
      return html;
    }
  };

  // Enhanced typing dots indicator with higher bounce
  const TypingDots = () => (
    <span className="inline-flex gap-1">
      <span className="h-1 w-1 rounded-full bg-gray-600 dark:bg-neutral-300 enhanced-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-1 w-1 rounded-full bg-gray-600 dark:bg-neutral-300 enhanced-bounce" style={{ animationDelay: '120ms' }} />
      <span className="h-1 w-1 rounded-full bg-gray-600 dark:bg-neutral-300 enhanced-bounce" style={{ animationDelay: '240ms' }} />
    </span>
  );

  // Show welcome message only on first visit per session
  useEffect(() => {
    if (sessionStorage.getItem('hasVisitedBuilder') !== 'true') {
      setMessages([INITIAL_MESSAGE]);
      sessionStorage.setItem('hasVisitedBuilder', 'true');
    }
  }, []);

  // Auto-scroll to the bottom of the messages
  useEffect(() => {
    if (scrollRef.current && isChatExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatExpanded]);

  const handleImageSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newAttachment: Attachment = {
        id: `${file.name}-${Date.now()}`,
        file,
        preview: reader.result as string,
      };
      setAttachments(prev => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleDisambiguation = (component: string) => {
    if (ambiguousPrompt) {
      // Add the user's original (ambiguous) prompt to the chat
      setMessages(prev => [
        ...prev.filter(m => m.role !== 'assistant'), // remove clarification question
        { id: generateId(), role: 'user', content: ambiguousPrompt }
      ]);
      // Resubmit with the chosen component
      processPrompt(ambiguousPrompt, component);
      setAmbiguousPrompt(null);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setPrompt('');
    setAmbiguousPrompt(null);
  }

  const processPrompt = async (currentPrompt: string, disambiguation?: string) => {
    setIsLoading(true);
    // Decide if this is likely a pipeline (CREATE/EDIT/DELETE) request
    const lp = currentPrompt.trim().toLowerCase();
    const isLikelyPipeline = /^(create|add|build|generate|edit|update|change|modify|replace|delete|remove)\b/.test(lp) || attachments.length > 0 || lp.includes('with these instructions');
    // Expand chat only for CHAT flows; collapse for pipelines
    setIsChatExpanded(!isLikelyPipeline);

    try {
      const hasAttachment = attachments.length > 0;
      const apiEndpoint = '/api/agent';

      // If there are attachments, use the existing non-streaming multipart flow
      if (hasAttachment) {
        const formData = new FormData();
        formData.append('prompt', currentPrompt);
        formData.append('disambiguation', disambiguation || '');
        for (const attachment of attachments) formData.append('image', attachment.file);

        const response = await fetch(apiEndpoint, { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Request failed');

        const agentResponse = result.response || result.reasoning || 'Task completed successfully.';
        setMessages(prev => [...prev.filter(m => m.id !== 'initial' && !m.isPending),
          { id: generateId(), role: 'user', content: currentPrompt },
          { id: generateId(), role: 'assistant', content: agentResponse }
        ]);
        // Ensure chat is collapsed for pipeline paths
        setIsChatExpanded(false);
      } else if (isLikelyPipeline) {
        // Non-streaming pipeline path (no attachments)
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string' && (m.content as string).includes('<'));
        const useChatToCreate = lp.includes('with these instructions') && lastAssistant;
        const payload = useChatToCreate
          ? { action: 'create_from_chat', chatHtml: String(lastAssistant?.content || ''), promptContext: currentPrompt }
          : { prompt: currentPrompt };

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        const ok = response.ok && (result?.success !== false);
        setMessages(prev => [...prev.filter(m => m.id !== 'initial' && !m.isPending),
          { id: generateId(), role: 'user', content: currentPrompt },
          { id: generateId(), role: 'assistant', content: ok ? (result.response || result.reasoning || 'Created successfully.') : (`Error: ${result?.error || 'Request failed'}`) }
        ]);
        setIsChatExpanded(false);
      } else {
        // Streaming path for CHAT/non-CRUD
        const assistantId = generateId();
        setMessages(prev => [...prev.filter(m => m.id !== 'initial' && !m.isPending),
          { id: generateId(), role: 'user', content: currentPrompt },
          { id: assistantId, role: 'assistant', content: '', isPending: true }
        ]);

        await start({
          prompt: currentPrompt,
          disambiguation,
          endpoint: apiEndpoint,
          onStart: () => {},
          onToken: (t) => {
            // Ensure content is a string when appending tokens to avoid [object Object]
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `${typeof m.content === 'string' ? m.content : String(m.content ?? '')}${t}` } : m));
          },
          onDone: (full) => {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full, isPending: false } : m));
          },
          onError: (err) => {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${err}`, isPending: false } : m));
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev.filter(m => m.id !== 'initial' && !m.isPending),
        { id: generateId(), role: 'user', content: currentPrompt },
        { id: generateId(), role: 'assistant', content: `Error: ${errorMessage}` }
      ]);
    }

    setIsLoading(false);
    setPrompt('');
    setAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    // Ensure chat is visible before sending
    setIsChatExpanded(true);

    // Check for ambiguity before processing, but allow multiple components for 'create' commands.
    const mentioned = findMentionedComponents(prompt);
    const isCreateIntent = prompt.toLowerCase().includes('create');

    if (mentioned.length > 1 && !isCreateIntent) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'initial'),
        { id: generateId(), role: 'user', content: prompt },
        { 
          id: generateId(), 
          role: 'assistant', 
          content: (
            <div>
              <p className="mb-2">Your request is ambiguous. Which component did you mean to edit?</p>
              <div className="flex gap-2">
                {mentioned.map(comp => (
                  <Button key={comp} size="sm" variant="outline" onClick={() => handleDisambiguation(comp)}>
                    {comp.charAt(0).toUpperCase() + comp.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          )
        }
      ]);
      setAmbiguousPrompt(prompt);
      setPrompt(''); // Clear input after showing clarification
      return;
    }

    processPrompt(prompt);
  };

  return (
    <>
      <div className="relative bg-[#5c5c5f] dark:bg-neutral-800 rounded-t-lg">
        {/* Chat History */}
        <div 
          ref={scrollRef} 
          className={`chat-scroll transition-all duration-300 ease-in-out overflow-y-auto space-y-4 p-4 ${isChatExpanded ? 'max-h-[65vh]' : 'max-h-0 !p-0'}`}
          style={{ scrollbarWidth: 'thin' }}
        >
          {messages.map((message, index) => (
            <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`break-words p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-700 text-white max-w-[90%]' : 'bg-transparent text-gray-800 dark:text-neutral-200 w-full'} ${message.role === 'assistant' ? 'chat-response' : ''}`}>
                {message.role === 'assistant' ? (
                  typeof message.content === 'string' && message.content.includes('<') ? (
                    <div className="chat-response" dangerouslySetInnerHTML={{ __html: insertHrBeforeH3(sanitizeAndNormalizeHtml(normalizeHtmlOnly(message.content as string))) }} />
                  ) : (
                    // Do not mutate plain text; render as-is
                    String(message.content || '')
                  )
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          {messages.some(m => m.isPending) && (
            <div className="flex justify-start">
              <div className="max-w-[100%]  text-gray-800">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Prompt Input Area */}
      <div className="relative dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-br-lg rounded-bl-lg shadow-lg">
        {/* Toggle Button */}
        {messages.length > 0 && (
          <button
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            className="relative float-right z-10 p-2  text-dark dark:text-white"
            aria-label={isChatExpanded ? 'Collapse chat' : 'Expand chat'}
          >
            {isChatExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        )}

        <form onSubmit={handleSubmit} className="p-2">
          {/* Top row: Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2">
              {attachments.map(att => (
                <div key={att.id} className="relative group">
                  <Image
                    src={att.preview}
                    alt={att.file.name}
                    width={40}
                    height={40}
                    className="rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className=" relative right-0 -m-1 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Middle row: Textarea */}
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="What do you want to build today?"
              className="placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content min-h-16 border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed md:text-sm p-3 pr-28 pb-12 block w-full bg-gray-100 dark:bg-neutral-700 border-transparent rounded-lg text-sm focus:outline-none focus:ring-0 disabled:opacity-50 disabled:pointer-events-none"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Bottom row: Actions */}
            <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-x-2">
              <ImageUpload onImageSelect={handleImageSelect} />
            </div>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={cancel}
                  data-slot="button"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2 has-[>svg]:px-3"
                >
                  <Square fill="currentColor" className="shrink-0 size-4" />
                  <span className="ml-1">Stop</span>
                </button>
              ) : (
                <Button type="submit" disabled={isLoading || (!prompt.trim() && attachments.length === 0)} className="rounded-full">
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Send className="shrink-0 size-4" />
                      <span className="ml-1">Send</span>
                    </>
                  )}
                </Button>
              )}
          </div>
        </form>
      </div>
    </>
  );
}