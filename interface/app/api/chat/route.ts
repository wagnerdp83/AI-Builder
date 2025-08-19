import { NextRequest, NextResponse } from 'next/server';

// Basic knowledge base for common queries
const KNOWLEDGE_BASE = {
  commands: {
    edit: "To edit a component, use: 'edit [component] [what to change]' or '[component]: update [what to change]'",
    create: "To create a new component, use: 'create [component]' or 'add [component]'",
    delete: "To delete a component, use: 'delete [component]' or 'remove [component]'",
  },
  components: {
    hero: "The hero section is the main banner at the top of your landing page",
    culture: "The culture section showcases your company's values and work environment",
    cta: "Call-to-action sections are designed to convert visitors into customers",
    faq: "Frequently Asked Questions section to address common inquiries",
    features: "Highlight your product or service's key features",
    footer: "The bottom section of your page with important links and information",
    header: "The top navigation bar of your website",
    pricing: "Display your pricing tiers and plans",
    testimonials: "Show customer reviews and feedback"
  },
  templates: {
    hero: "Available templates: Modern, Minimal, Bold, Gradient",
    culture: "Available templates: Grid, Timeline, Story",
    cta: "Available templates: Simple, Split, Full-width",
    faq: "Available templates: Accordion, Grid, Searchable",
    features: "Available templates: Grid, Cards, Icons",
    footer: "Available templates: Simple, Multi-column, Centered",
    header: "Available templates: Minimal, Full-featured, Transparent",
    pricing: "Available templates: Cards, Table, Toggle",
    testimonials: "Available templates: Carousel, Grid, Quotes"
  }
};

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Normalize the prompt
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Check for help/command related queries
    if (normalizedPrompt.includes('help') || normalizedPrompt.includes('how to') || normalizedPrompt.includes('commands')) {
      return NextResponse.json({
        response: `Here are the available commands:
        
${KNOWLEDGE_BASE.commands.edit}
${KNOWLEDGE_BASE.commands.create}
${KNOWLEDGE_BASE.commands.delete}

For more specific help about a component, ask about it by name.`
      });
    }

    // Check for component information queries
    for (const [component, description] of Object.entries(KNOWLEDGE_BASE.components)) {
      if (normalizedPrompt.includes(component)) {
        let response = description + '\n\n';
        
        // If asking about templates, include template information
        if (normalizedPrompt.includes('template') || normalizedPrompt.includes('style')) {
          response += KNOWLEDGE_BASE.templates[component as keyof typeof KNOWLEDGE_BASE.templates];
        }
        
        return NextResponse.json({ response });
      }
    }

    // Default response for unrecognized queries
    return NextResponse.json({
      response: `I can help you with building and customizing your landing page. You can ask me about specific components, available commands, or how to make changes. What would you like to know?

Here are some examples of what you can do:
- "update hero headline to 'My New Headline'"
- "add a FAQ section"
- "what templates are available for the features section?"
`
    });

  } catch (error) {
    console.error('Chat processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}