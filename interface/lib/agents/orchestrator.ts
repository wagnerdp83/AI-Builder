import { NextRequest } from 'next/server';

// Standard suggestions to surface as dynamic values when needed (UI or agents)
export const STANDARD_SUGGESTIONS: string[] = [
  'Would you like me to add any extra information to your project scope?',
  'Would you like me to create your landing page based on this content?'
];
import { IntentClassifier } from './intent-classifier';
// NOTE: All heavy modules (agent, tools, image processing, intent services) are dynamically imported
// inside the selected intent branch to avoid loading them during CHAT or unrelated flows.

async function chatAgent(prompt: string) {
  try {
    const { Mistral } = await import('@mistralai/mistralai');
    const { buildChatSystemPrompt } = await import('../prompts/chat-system');
    const mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY as string });
    const chatResponse = await mistralClient.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: buildChatSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 4096
    });
    const content = chatResponse.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.join('') : (content || '');
    try {
      const preview = typeof text === 'string' ? text.slice(0, 1000) : '';
      console.log('[CHAT][Mistral][RAW_NON_STREAM] len=', (text?.length ?? 0), ' preview=\n', preview);
    } catch {}
    return { response: text, reasoning: 'Mistral chat response', success: true };
  } catch (error) {
    console.error('[CHAT] Mistral error:', error);
    return { response: 'How can I help you plan or build your website or landing page?', reasoning: 'Fallback response', success: true };
  }
}

type Intent = 'CREATE' | 'EDIT' | 'DELETE' | 'CHAT';

// New Regex-based intent classifier for speed and accuracy on simple commands.
function getIntentFromPrompt(prompt: string): Intent | null {
    const p = prompt.toLowerCase().trim();

    // Bias planning/scope/discovery queries to CHAT
    const planningKeywords = [
      'scope', 'project scope', 'planning', 'plan', 'pre-creation', 'pre creation',
      'discovery', 'requirements', 'specification', 'spec', 'estimate', 'estimation',
      'proposal', 'roadmap', 'architecture', 'blueprint'
    ];
    if (planningKeywords.some(k => p.includes(k))) return 'CHAT';

    // Pattern for delete: "delete the X component"
    const deleteRegex = /^delete\s*(the)?\s*.*\s*(section|component)/;
    if (deleteRegex.test(p)) return 'DELETE';

    // Pattern for edit: "componentName: update/change..." or "update componentName ..."
    const editRegex = /^\w+:\s*(update|change|set|modify|edit|replace)|^(update|change|set|modify|edit|replace)\s*\w+/;
    if (editRegex.test(p)) return 'EDIT';
    
    // Pattern for create: "create/add/build/generate ..." (more flexible)
    const createRegex = /^(create|add|build|generate)/;
    if (createRegex.test(p)) return 'CREATE';

    return null;
}

function parseComponentFromPrompt(prompt: string): string | undefined {
    // Pattern 1: "delete [the] {component-name} section/component"
    const deleteMatch1 = prompt.match(/delete(?: the)?\s*'?"?([\w\s-]+?)\'?"?\s*(?:section|component)/i);
    if (deleteMatch1?.[1]) {
      return deleteMatch1[1].trim().toLowerCase().replace(/\s+/g, '-');
    }

    // Pattern 2: "delete [the] section/component {component-name}"
    const deleteMatch2 = prompt.match(/delete(?: the)?\s*(?:section|component)\s*'?"?([\w\s-]+)\'?"?/i);
    if (deleteMatch2?.[1]) {
        return deleteMatch2[1].trim().toLowerCase().replace(/\s+/g, '-');
    }
  
    // No explicit FIX parsing; non-CRUD requests are handled by CHAT
  
    return undefined;
}

// const ABSTRACT_KEYWORDS = [
//   'landing page', 'landingpage', 'website', 'web page', 'webpage', 'app', 'application', 'system', 'dashboard', 'platform', 'site',
//   // Add more as needed
// ];
const GENERIC_KEYWORDS = [
  'generic', 'multiple sections', 'multiple components', 'several sections', 'several components', 'various sections', 'various components',
  'create sections', 'build sections', 'generate sections', 'add sections',
  'landing page', 'landingpage', 'website', 'web page', 'webpage', 'app', 'application', 'system', 'dashboard', 'platform', 'site'
];
const DEFAULT_ABSTRACT_SECTIONS = [
  'Hero', 'Menu', 'Features', 'Testimonials', 'Pricing', 'Contact', 'Footer'
];

export async function orchestratorAgent(req: NextRequest) {
  let prompt: string;
  let disambiguation: string | undefined;
  let formData: FormData | undefined;
  let hasMultipart = false;

  console.log('--- NEW REQUEST RECEIVED ---');

  const contentType = req.headers.get('content-type') || '';
  console.log(`[DEBUG] Content-Type: ${contentType}`);

  if (contentType.includes('multipart/form-data')) {
    hasMultipart = true;
    formData = await req.formData();
    prompt = formData.get('prompt') as string;
    disambiguation = (formData.get('disambiguation') as string) || undefined;
    console.log(`[DEBUG] Orchestrator received FormData. Prompt: "${prompt}"`);
  } else {
    const body = await req.json();
    prompt = body.prompt;
    disambiguation = body.disambiguation;
    console.log(`[DEBUG] Orchestrator received JSON. Prompt: "${prompt}"`);
  }

  if (!prompt) {
    console.error('[DEBUG] Error: Prompt is required.');
    return { success: false, error: 'Prompt is required' };
  }

  // First, try to classify intent with Regex for speed and reliability.
  let intent: Intent | null = getIntentFromPrompt(prompt);
  console.log(`[DEBUG] Regex-based intent classification result: ${intent}`);
  
  if (intent) {
    console.log(`[Orchestrator] Intent classified by regex as: ${intent}`);
  } else {
    // If regex fails, fallback to the LLM classifier.
    console.log(`[Orchestrator] Regex did not match. Falling back to LLM classifier.`);
    const intentSystemPrompt = `You are an orchestrator agent. Your job is to analyze the user's prompt and classify the intent. You must respond with one of the following four intents: 'CREATE', 'EDIT', 'DELETE', 'CHAT'.
    - 'CREATE': User wants to create something new (e.g., "create a new hero section", "build a page based on this image").
    - 'EDIT': User wants to modify an existing part of the page (e.g., "change the button color").
    - 'DELETE': User wants to remove something (e.g., "delete the footer").
    - 'CHAT': User is asking a question or having a conversation.
    Analyze the following prompt and return only the single word for the intent.`;
    const classifier = new IntentClassifier();
    const intentResult = await classifier.classify(intentSystemPrompt, prompt);
    intent = intentResult.trim().toUpperCase() as Intent;
    console.log(`[DEBUG] LLM-based intent classification result: ${intent}`);
    console.log(`[Orchestrator] Intent classified by LLM as: ${intent}`);
  }

  console.log(`[DEBUG] Entering main switch with intent: ${intent}`);
  switch (intent) {
    case 'CREATE':
      console.log(`[DEBUG] CREATE branch.`);
      // Only enumerate images and detect visual create AFTER intent is decided
      let images: File[] = [];
      let isVisualCreate = false;
      if (hasMultipart && formData) {
        for (const value of formData.values()) {
          if (value instanceof File) images.push(value);
        }
        isVisualCreate = images.length > 0;
        console.log(`[DEBUG] Files present for CREATE: ${images.length}`);
      }

      if (isVisualCreate) {
        console.log('[Orchestrator] Delegating to Visual Edit Handler for creation.');
        
        // This regex extracts the component name, stopping before any positional keywords.
        // Updated to support 'block', 'area', 'section', 'component' as valid website areas
        const createMatch = prompt.trim().match(/create(?: a new| me a)?\s*(?:section|component|block|area)?\s*(?:called)?\s*['"]?([\w\s-.]+?)['"]?(?=\s+underneath|\s+above|\s+below|\s+right|\s+directly|:|\s+layout is|\s+based on|\s+from the attached|$)/i);
        const rawComponentName = createMatch ? createMatch[1].replace(/[.:]/g, '').trim() : 'component';

        // This non-greedy regex correctly extracts the target component for positioning.
        const positionRegex = /(underneath|above|below|right of|left of)\s+(?:the\s+)?([\w\s]+?)\s*(?:\.|,|$)/i;
        const positionMatch = prompt.match(positionRegex);

        const componentName = rawComponentName.trim().replace(/\s+/g, '-');
        const position = positionMatch ? positionMatch[2].replace(/['"]/g, '').trim() : '';
        const preposition = positionMatch ? positionMatch[1].trim() : 'below';

        if (position) {
            console.log(`[Orchestrator] Positional information found. Component: '${componentName}', Preposition: '${preposition}', Target: '${position}'`);
        }

        // Visual creation only uses the FIRST image as the layout.
        const image = images[0];

        // Optimize image before converting to base64
        let layout: string | undefined;
        if (image) {
          try {
            const arrayBuffer = await image.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Dynamic import sharp only here
            const { default: sharp } = await import('sharp');
            // Optimize image
            const optimizedBuffer = await sharp(buffer)
              .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            
            // Convert to base64 with proper mime type
            layout = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;
          } catch (error) {
            console.error('Error optimizing image:', error);
            // Fallback to raw image if optimization fails
            const arrayBuffer = await image.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            layout = `data:${image.type};base64,${buffer.toString('base64')}`;
          }
        }

        if (!layout) {
          return { success: false, error: 'No layout image provided for visual creation.' };
        }

        // Execute visual edit with layout
        const { executeVisualEdit } = await import('../tools/visualEditHandler');
        const result = await executeVisualEdit({
          prompt,
          componentName,
          position,
          preposition,
          layout
        });

        if (!result.success) {
          return { success: false, error: result.error || 'Failed to create component' };
        }

        return {
          success: true,
          response: `Successfully created new component: ${componentName}`,
          filePath: result.componentPath
        };
      } else {
        console.log('[DEBUG] Delegating CREATE to agent.selectTool.');
        
        let componentNames: string[] = [];
        // === GENERIC MODE ENHANCEMENT (Abstract mode commented out for future button implementation) ===
        const lowerPrompt = prompt.toLowerCase();
        // const isAbstract = ABSTRACT_KEYWORDS.some(kw => lowerPrompt.includes(kw));
        const isGeneric = GENERIC_KEYWORDS.some(kw => lowerPrompt.includes(kw));
        // let abstractMode = false;
        let genericMode = false;
        
        // if (isAbstract) {
        //   abstractMode = true;
        //   // Try to extract sections after 'including' or comma-separated
        //   let extracted: string[] = [];
        //   if (lowerPrompt.includes('including')) {
        //     const match = prompt.match(/including\s+([\w\s,-]+)/i);
        //     if (match && match[1]) {
        //       extracted = match[1].split(/,|and/).map(s => s.trim()).filter(Boolean);
        //   }
        //   } else {
        //     // Try to extract comma-separated or 'and' separated sections
        //     const match = prompt.match(/(?:landing page|website|dashboard|platform|site|application|app)[^\w]+([\w\s,-]+)/i);
        //     if (match && match[1]) {
        //       extracted = match[1].split(/,|and/).map(s => s.trim()).filter(Boolean);
        //   }
        //   }
        //   componentNames = extracted.length > 0
        //     ? extracted.map(s => s.charAt(0).toUpperCase() + s.slice(1))
        //     : [...DEFAULT_ABSTRACT_SECTIONS];
        //   console.log(`[DEBUG][Abstract Mode] Abstract mode triggered. Component names:`, componentNames);
        // } else 
        if (isGeneric) {
          genericMode = true;
          
          // ENHANCED INTENT DETECTION FOR GENERIC MODE
          // Using the new structured intent detection system
          
          console.log('[DEBUG] Using Enhanced Intent Detection for Generic mode');
          
          try {
            // Use the new IntentDetectionService (dynamic import)
            const { IntentDetectionService } = await import('../services/intent-detection');
            const intentResult = await IntentDetectionService.detectIntent(prompt);
            
            if (intentResult.success && intentResult.intent) {
              console.log('[DEBUG] Intent detection successful:', {
                intent: intentResult.intent.intent,
                confidence: intentResult.confidence,
                sections: intentResult.intent.slots.sections,
                business_type: intentResult.intent.slots.business_type,
                colors: intentResult.intent.slots.colors,
                theme: intentResult.intent.slots.theme
              });
              
              // Extract sections from the structured intent
              const sections = intentResult.intent.slots.sections || [];
              
              // DYNAMIC: Use AI to convert user-friendly names to component names
              console.log('[DEBUG] Converting user-friendly names to component names via AI...');
              
              try {
                // Import Mistral client for AI-driven name conversion
                const { Mistral } = await import('@mistralai/mistralai');
                const mistralClient = new Mistral({
                  apiKey: process.env.MISTRAL_API_KEY as string
                });
                
                // Create a mapping prompt for AI
                const mappingPrompt = `Convert these user-friendly section names to proper Astro component names. Each component should have only ONE name. Return only a JSON object with the mapping.

User-friendly names: ${sections.join(', ')}

Rules:
- Use PascalCase for component names
- Keep names short and descriptive
- One name per component
- Common mappings: Navigation/Header -> Navbar, Hero Section -> Hero, About Us -> AboutUs, Services -> Services, Gallery -> Gallery, Contact -> Contact, Footer -> Footer

Return format: {"Top Navigation Bar": "Navbar", "Hero Section": "Hero", ...}`;
                
                const mappingResponse = await mistralClient.chat.complete({
                  model: 'mistral-large-latest',
                  messages: [
                    {
                      role: 'user',
                      content: mappingPrompt
                    }
                  ],
                  maxTokens: 500,
                  temperature: 0.1
                });
                
                const mappingText = mappingResponse.choices[0]?.message?.content || '';
                let responseString: string;
                if (Array.isArray(mappingText)) {
                  responseString = mappingText.map(chunk => {
                    if (typeof chunk === 'string') return chunk;
                    if ('text' in chunk) return chunk.text;
                    return '';
                  }).join('');
                } else {
                  responseString = mappingText;
                }
                
                const mappingMatch = responseString.match(/\{[\s\S]*\}/);
                
                if (mappingMatch) {
                  const componentMapping = JSON.parse(mappingMatch[0]);
                  const refinedSections = sections.map(section => {
                    return componentMapping[section] || section.replace(/\s+/g, '');
                  }).filter(Boolean);
                   
                  if (refinedSections.length > 0) {
                    componentNames = refinedSections;
                    console.log(`[DEBUG][AI-Driven] Refined sections:`, componentNames);
                  } else {
                    // Fallback to business type
                    const businessType = intentResult.intent?.slots?.business_type || 'general';
                    componentNames = [businessType.charAt(0).toUpperCase() + businessType.slice(1)];
                    console.log('[DEBUG] Using business type as fallback:', componentNames);
                  }
                } else {
                  throw new Error('Failed to parse AI mapping response');
                }
                
              } catch (error) {
                console.error('[DEBUG] AI-driven name conversion failed:', error);
                // Fallback to simple conversion
                const refinedSections = sections.map(section => {
                  return section
                    .replace(/[^\w\s]/g, '') // Remove special characters
                    .replace(/\s+/g, '') // Remove spaces
                    .replace(/^[a-z]/, (match) => match.toUpperCase()); // Capitalize first letter
                }).filter(Boolean);
                
                if (refinedSections.length > 0) {
                  componentNames = refinedSections;
                  console.log(`[DEBUG][Fallback] Refined sections:`, componentNames);
              } else {
                  // Fallback to business type
                  const businessType = intentResult.intent?.slots?.business_type || 'general';
                  componentNames = [businessType.charAt(0).toUpperCase() + businessType.slice(1)];
                  console.log('[DEBUG] Using business type as fallback:', componentNames);
                }
              }
              
            } else {
              console.error('[DEBUG] Intent detection failed:', intentResult.error);
              // DYNAMIC: Let the framework handle fallback dynamically
              // Use the sections from intent detection even if confidence is low
              const sections = intentResult.intent?.slots?.sections || [];
              const refinedSections = sections.map(section => {
                return section
                  .replace(/[^\w\s]/g, '') // Remove special characters
                  .replace(/\s+/g, '') // Remove spaces
                  .replace(/^[a-z]/, (match) => match.toUpperCase()); // Capitalize first letter
              }).filter(Boolean);
              
              if (refinedSections.length > 0) {
                componentNames = refinedSections;
                console.log('[DEBUG] Using intent sections as fallback:', refinedSections);
              } else {
                // DYNAMIC: Generate default sections based on business type
                const businessType = intentResult.intent?.slots?.business_type || 'general';
                componentNames = [businessType.charAt(0).toUpperCase() + businessType.slice(1)];
                console.log('[DEBUG] Using business type as fallback:', componentNames);
              }
            }
            
          } catch (error) {
            console.error('[DEBUG] Enhanced intent detection failed:', error);
            // DYNAMIC: Use business type from prompt analysis
            const businessKeywords = prompt.toLowerCase().match(/\b(?:salon|restaurant|shop|store|business|company|service)\b/g);
            const businessType = businessKeywords?.[0] || 'general';
            componentNames = [businessType.charAt(0).toUpperCase() + businessType.slice(1)];
            console.log('[DEBUG] Using business type from prompt analysis:', componentNames);
          }
          
          console.log(`[DEBUG][Generic Mode] Generic mode triggered. Component names:`, componentNames);
        }
        
        // This regex is designed to be more robust and capture single or multiple component names, excluding positional keywords.
        // Updated to handle "create a landing page including X, Y, Z" pattern - capture everything after "including"
        let createRegex;
        if (prompt.toLowerCase().includes('including')) {
          // Special regex for "including" pattern - capture everything after "including"
          createRegex = /^(?:create|add|build|generate)\s+(?:a\s+)?(?:new\s+)?(?:landing\s+page|section|component)s?\s+(?:for\s+[^,]+)?\s+including\s+(.+?)(?=\s*$)/i;
        } else {
          // Standard regex for other patterns
          createRegex = /^(?:create|add|build|generate)\s+(?:a\s+)?(?:new\s+)?(?:landing\s+page|section|component)s?\s+(?:called\s+)?['"]?([\w\s,-]+?)(?=['"]|\s*underneath|\s*above|\s*below|:|\.|$)/i;
        }
        
        console.log(`[DEBUG] Using regex pattern for "${prompt.toLowerCase().includes('including') ? 'including' : 'standard'}": ${createRegex.source}`);
        const createMatch = prompt.match(createRegex);
        console.log(`[DEBUG] Regex match result:`, createMatch);

        // if (abstractMode) {
        //   // Route to abstract pipeline
        //   try {
        //     const decision = await mainAgent.selectTool(prompt, disambiguation, undefined, componentNames);
        //     // Add mode information to the decision
        //     if (decision.instructions && typeof decision.instructions === 'object') {
        //       (decision.instructions as any).mode = 'abstract';
        //     }
        //     return await executeAgentDecision(decision, prompt);
        //   } catch (error: any) {
        //     console.error(`[DEBUG] Error in abstract CREATE branch: ${error.message}`);
        //     return { success: false, error: `Abstract create failed: ${error.message}` };
        //   }
        // } else 
        if (genericMode) {
          // Route to generic pipeline
          try {
            const { Agent } = await import('./core/agent');
            const { executeAgentDecision } = await import('./tool-selector');
            const agent = new Agent();
            const decision = await agent.selectTool(prompt, disambiguation, undefined, componentNames);
            // Add mode information to the decision
            if (decision.instructions && typeof decision.instructions === 'object') {
              (decision.instructions as any).mode = 'generic';
            }
            return await executeAgentDecision(decision, prompt);
          } catch (error: any) {
            console.error(`[DEBUG] Error in generic CREATE branch: ${error.message}`);
            return { success: false, error: `Generic create failed: ${error.message}` };
          }
        }
        // === NEW LOGIC: Extract only atomic section/component names ===
        // Use regex to extract the first word after 'called', 'section', or 'component', ignoring position/context
        let atomicNames = createMatch && createMatch[1]
          ? createMatch[1]
              .split(/,?\s+and\s+|,/g)
              .map(name => {
                // Extract only the first word (capitalized) as the atomic name
                const match = name.trim().match(/([A-Za-z0-9]+)/);
                return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : '';
              })
              .filter(Boolean)
          : [];
        
        // Only use atomicNames if intent detection didn't find any sections
        if (componentNames.length === 0 && atomicNames.length > 0) {
          componentNames = atomicNames;
          console.log(`[DEBUG] Using atomic names as fallback:`, componentNames);
        }
        
        console.log(`[DEBUG] Final component names:`, componentNames);

        try {
          const { Agent } = await import('./core/agent');
          const { executeAgentDecision } = await import('./tool-selector');
          const agent = new Agent();
          const decision = await agent.selectTool(prompt, disambiguation, undefined, componentNames);
          return await executeAgentDecision(decision, prompt);
        } catch (error: any) {
          console.error(`[DEBUG] Error in non-visual CREATE branch: ${error.message}`);
          return { success: false, error: `Create failed: ${error.message}` };
        }
      }

    case 'EDIT':
      console.log('[DEBUG] EDIT branch. Delegating to mainAgent.selectTool.');
      try {
        const { Agent } = await import('./core/agent');
        const { executeAgentDecision } = await import('./tool-selector');
        // Only enumerate images for EDIT if multipart
        let images: File[] = [];
        if (hasMultipart && formData) {
          for (const value of formData.values()) {
            if (value instanceof File) images.push(value);
          }
        }
        const agent = new Agent();
        const decision = await agent.selectTool(prompt, disambiguation, images);
        // console.log('[DEBUG] BREAKPOINT: Bypassing executeAgentDecision for EDIT.');
        // return { success: true, response: `[DEBUG] SKIPPED AGENT DECISION for EDIT. Reasoning: ${decision.reasoning}`};
        
        const result = await executeAgentDecision(decision, prompt);
        // Ensure a user-friendly response
        return { 
            success: result.success, 
            response: `Successfully executed: ${decision.reasoning}`
        };
        
      } catch (error: any) {
        console.error(`[DEBUG] Error in EDIT branch: ${error.message}`);
        return { success: false, error: `Edit failed: ${error.message}` };
      }

    case 'DELETE':
      console.log('[DEBUG] DELETE branch.');
      const componentName = parseComponentFromPrompt(prompt);
      if (!componentName) {
        console.error('[DEBUG] Could not determine which component to delete.');
        return { success: false, error: "Could not determine which component to delete." };
      }
      // console.log(`[DEBUG] BREAKPOINT: Bypassing executeComponentDelete for ${componentName}.`);
      // return { success: true, response: `[DEBUG] SKIPPED DELETE for ${componentName}.` };
      {
        const { executeComponentDelete } = await import('../tools/componentDeleteHandler');
        return await executeComponentDelete({ component: componentName });
      }

    case 'CHAT':
      console.log('[DEBUG] CHAT branch.');
      return await chatAgent(prompt);

    default:
      console.warn(`[DEBUG] Unknown intent: '${intent}'. Defaulting to CHAT.`);
      return await chatAgent(prompt);
  }
}