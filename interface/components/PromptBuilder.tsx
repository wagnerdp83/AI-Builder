import { useState, useRef, useEffect } from 'react';
import { useChatStream } from '@/lib/utils/useChatStream';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronUp, ChevronDown, X, Send, Square, Play } from 'lucide-react';
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

// NEW: Interface for stored chat scope
interface ChatScope {
  content: string;
  timestamp: number;
  originalPrompt?: string;
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

// NEW: Helper to extract scope from chat response
const extractScopeFromChatResponse = (content: string): string | null => {
  if (typeof content !== 'string') return null;
  
  // Look for the Design & User Experience section first
  const designSectionMarker = 'Design & User Experience';
  const designStartIndex = content.indexOf(designSectionMarker);
  
  // Look for the Landing Page Scope section
  const scopeMarker = '🏗️ Landing Page Scope';
  const scopeStartIndex = content.indexOf(scopeMarker);
  
  if (designStartIndex === -1 && scopeStartIndex === -1) return null;
  
  let extractedContent = '';
  
  // Extract Design & User Experience section if found
  if (designStartIndex !== -1) {
    const designEndIndex = scopeStartIndex !== -1 ? scopeStartIndex : content.length;
    const designContent = content.substring(designStartIndex, designEndIndex);
    extractedContent += designContent + '\n\n';
  }
  
  // Extract Landing Page Scope section if found
  if (scopeStartIndex !== -1) {
    const scopeContent = content.substring(scopeStartIndex + scopeMarker.length);
    // Remove the ending question if present
    const cleanScopeContent = scopeContent.replace(/\s*Would you like me to add any extra information to your project scope or would you like me to create your landing page based on this\?.*$/i, '');
    extractedContent += cleanScopeContent;
  }
  
  // Clean HTML tags and convert to clean plain text
  const cleanText = extractedContent
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
  
  return cleanText;
};

// NEW: Helper to extract business context from user's original request
const extractBusinessContext = (messages: Message[]): { websiteType: string; businessType: string } => {
  // Find the first user message (excluding initial)
  const firstUserMessage = messages.find(m => m.role === 'user' && m.id !== 'initial');
  
  if (!firstUserMessage || typeof firstUserMessage.content !== 'string') {
    return { websiteType: 'landing page', businessType: 'business' };
  }
  
  const content = firstUserMessage.content.toLowerCase();
  
  // Extract website type
  let websiteType = 'landing page';
  if (content.includes('website')) websiteType = 'website';
  else if (content.includes('landing page')) websiteType = 'landing page';
  else if (content.includes('app')) websiteType = 'app';
  else if (content.includes('dashboard')) websiteType = 'dashboard';
  
  // Extract business type
  let businessType = 'business';
  if (content.includes('real estate')) businessType = 'real estate business';
  else if (content.includes('restaurant')) businessType = 'restaurant';
  else if (content.includes('salon')) businessType = 'salon';
  else if (content.includes('store')) businessType = 'store';
  else if (content.includes('company')) businessType = 'company';
  else if (content.includes('agency')) businessType = 'agency';
  
  return { websiteType, businessType };
};

// NEW: Helper to detect creation intent from user response
const detectCreateIntent = (prompt: string): boolean => {
  const positiveKeywords = [
    'yes', 'yep', 'yup', 'ok', 'okay', 'go ahead', 'proceed', 
    'do it', 'create it', 'build it', 'sounds good', 'looks good', 
    'perfect', 'great', 'awesome', 'make it'
  ];
  
  const lowerPrompt = prompt.toLowerCase().trim();
  return positiveKeywords.some(keyword => 
    lowerPrompt.includes(keyword) || lowerPrompt.startsWith(keyword)
  );
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

      /* NEW: Scope action button styles */
      .scope-action-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 12px;
      }
      
      .scope-action-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .scope-action-button:active {
        transform: translateY(0);
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
  
  // NEW: State for storing chat scope
  const [storedScope, setStoredScope] = useState<ChatScope | null>(null);
  
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

  // NEW: Function to bridge from chat scope to create pipeline
  const bridgeToCreatePipeline = async (scope: ChatScope) => {
    setIsLoading(true);
    
    try {
      // Extract business context from user's original request
      const { websiteType, businessType } = extractBusinessContext(messages);
      
      // Create a comprehensive scope with business context at the top
      const comprehensiveScope = `Create a ${websiteType} for my ${businessType} following:

${scope.content}`;
      
      // Create the create prompt using the comprehensive scope
      const createPrompt = `Create a ${websiteType} with these sections: Header, Hero, Lead Capture Form, Footer. Use this detailed specification: ${comprehensiveScope}`;
      
      console.log('[Bridge] Sending create prompt:', createPrompt);
      
      // Send directly to the create pipeline via the agent API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: createPrompt,
          mode: 'direct_create_from_chat_scope'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create landing page');
      }
      
      // Add success message to chat
      setMessages(prev => [
        ...prev,
        { 
          id: generateId(), 
          role: 'user', 
          content: `Create ${websiteType} from scope (${new Date().toLocaleTimeString()})` 
        },
        { 
          id: generateId(), 
          role: 'assistant', 
          content: result.response || result.reasoning || `${websiteType} created successfully!` 
        }
      ]);
      
      // Clear the stored scope after successful creation
      setStoredScope(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Bridge] Error creating landing page:', error);
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        { 
          id: generateId(), 
          role: 'user', 
          content: `Create landing page from scope (${new Date().toLocaleTimeString()})` 
        },
        { 
          id: generateId(), 
          role: 'assistant', 
          content: `Error: ${errorMessage}. The create pipeline may have encountered an issue. Please try again or contact support.` 
        }
      ]);
    }
    
    setIsLoading(false);
  };

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

  // NEW: Effect to detect and store scope from chat responses
  useEffect(() => {
    messages.forEach(message => {
      if (message.role === 'assistant' && typeof message.content === 'string') {
        const scope = extractScopeFromChatResponse(message.content);
        if (scope) {
          setStoredScope({
            content: scope,
            timestamp: Date.now(),
            originalPrompt: messages.find(m => m.role === 'user' && m.id !== 'initial')?.content as string
          });
        }
      }
    });
  }, [messages]);

  // NEW: Helper to check if message contains scope sections
  const messageContainsScope = (content: string): boolean => {
    return content.includes('🏗️ Landing Page Scope') || content.includes('Design & User Experience');
  };

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
    // NEW: Clear stored scope when starting new chat
    setStoredScope(null);
  }

  const processPrompt = async (currentPrompt: string, disambiguation?: string) => {
    setIsLoading(true);
    
    // NEW: Check if this is a create intent response to stored scope
    if (storedScope && detectCreateIntent(currentPrompt)) {
      await bridgeToCreatePipeline(storedScope);
      return;
    }
    
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

  // NEW: Component to render scope action button
  const ScopeActionButton = ({ scope }: { scope: ChatScope }) => {
    const { websiteType, businessType } = extractBusinessContext(messages);
    
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🎯 Complete Project Scope Detected
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Ready to create your {websiteType} for your {businessType}?
            </p>
            
            
            {/* NEW: Debug scope preview */}
            <details className="mt-3">
              <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                📋 Preview extracted scope (click to expand)
              </summary>
              <div className="mt-2 p-2 bg-white dark:bg-neutral-700 rounded text-xs text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                <div className="mb-2 p-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300 font-medium">
                  🔍 Complete Scope (what will be sent to create pipeline):
                </div>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {(() => {
                    const { websiteType, businessType } = extractBusinessContext(messages);
                    return `Create a ${websiteType} for my ${businessType} following:

${scope.content}`;
                  })()}
                </pre>
              </div>
            </details>
          </div>
          <button
            onClick={() => bridgeToCreatePipeline(scope)}
            disabled={isLoading}
            className="scope-action-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Create {websiteType.charAt(0).toUpperCase() + websiteType.slice(1)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="relative bg-[#5c5c5f] dark:bg-neutral-800 rounded-t-lg">
        {/* Chat History */}
        <div 
          ref={scrollRef} 
          className={` transition-all duration-300 ease-in-out overflow-y-auto space-y-4 p-4 ${isChatExpanded ? 'max-h-[65vh]' : 'max-h-0 !p-0'}`}
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
                
                {/* NEW: Show scope action button if this message contains scope */}
                {message.role === 'assistant' && 
                 typeof message.content === 'string' && 
                 storedScope && 
                 messageContainsScope(message.content) && (
                  <ScopeActionButton scope={storedScope} />
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
              placeholder={storedScope ? "Type 'yes' or 'create it' to build your landing page, or ask something else..." : "What do you want to build today?"}
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