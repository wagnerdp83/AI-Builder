import type { APIRoute } from "astro";
import { parseAstroComponent } from "../../utils/astro-parser";
import { applyCodeChanges } from "../../utils/code-manipulator";
import { loadProjectContext } from "../../utils/context-loader";
import fs from "fs/promises";
import path from "path";

// Helper to find component files
async function findComponentFile(
  componentName: string,
): Promise<string | null> {
  const srcDir = path.join(process.cwd(), "src");
  const files = await fs.readdir(path.join(srcDir, "components"), {
    recursive: true,
  });

  const componentFile = files.find(
    (file) =>
      file.toLowerCase().includes(componentName.toLowerCase()) &&
      file.endsWith(".astro"),
  );

  return componentFile ? path.join(srcDir, "components", componentFile) : null;
}

export const all: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          Allow: "POST",
        },
      },
    );
  }

  try {
    const body = await request.json();
    const { prompt, context } = body;

    // Load project context
    const projectContext = await loadProjectContext();

    // Prepare the system message
    const systemMessage = `You are an expert Astro developer assistant. Your task is to help modify Astro components based on user requests.

Current project context:
- Framework: Astro ${context.framework.version}
- Styling: Tailwind CSS
- Theme colors: ${JSON.stringify(context.styling.themeColors)}

When processing requests:
1. Identify the target component and element
2. Determine the required changes
3. Return a structured response with precise modifications

Example prompts and responses:
1. "Update hero headline to 'Welcome'"
   Response: {
     "changes": [{
       "file": "src/components/Hero.astro",
       "type": "modification",
       "location": { "selector": ["data-element", "hero-heading"] },
       "content": { "text": "Welcome" }
     }]
   }

2. "Change contact form button text to 'Send'"
   Response: {
     "changes": [{
       "file": "src/components/ContactForm.astro",
       "type": "modification",
       "location": { "selector": ["type", "submit"] },
       "content": { "text": "Send" }
     }]
   }

Always return changes in this format:
{
  "changes": [{
    "file": "path/to/file",
    "type": "modification" | "addition" | "deletion",
    "location": {
      "selector": [attribute, value] | null,
      "text": string | null
    },
    "content": {
      "text": string | null,
      "attributes": object | null,
      "styles": string | null
    }
  }]
}`;

    // Send request to Mistral
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: `Project Context:
${JSON.stringify(projectContext, null, 2)}

User Request:
${prompt}

Generate the necessary code changes to fulfill this request.`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const mistralResponse = await response.json();
    const proposedChanges = JSON.parse(
      mistralResponse.choices[0].message.content,
    );

    // Process each change and resolve file paths
    for (const change of proposedChanges.changes) {
      if (!change.file.startsWith("/")) {
        // Extract component name from relative path
        const componentName = path.basename(change.file, ".astro");
        const componentFile = await findComponentFile(componentName);

        if (!componentFile) {
          throw new Error(`Could not find component file for ${componentName}`);
        }

        change.file = componentFile;
      }
    }

    // Apply the changes
    const results = await applyCodeChanges(proposedChanges.changes);

    return new Response(
      JSON.stringify({
        success: true,
        changes: results.changes,
        details: results.details,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error processing request",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  }
};

// Add OPTIONS handler for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
