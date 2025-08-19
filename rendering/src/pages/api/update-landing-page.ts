import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

// Define a type for style changes
interface StyleChange {
  type: string;
  element: string;
  property: string;
  value: string;
}

// Types for our color and element extraction
type ColorTerm = string;
type ElementTerm = string;
type ActionTerm = string;

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to analyze prompt and extract key information
function analyzePrompt(prompt: string): {
  elementTerms: string[];
  actionTerms: string[];
  colors: string[];
} {
  const promptLower = prompt.toLowerCase();

  // Extract element terms
  const elementTerms: string[] = [];
  if (promptLower.includes("hero")) elementTerms.push("hero");
  if (
    promptLower.includes("heading") ||
    promptLower.includes("headline") ||
    promptLower.includes("title")
  )
    elementTerms.push("heading");
  if (promptLower.includes("logo")) elementTerms.push("logo");
  if (promptLower.includes("star")) elementTerms.push("star");

  // Extract action terms
  const actionTerms: string[] = [];
  if (promptLower.includes("update")) actionTerms.push("update");
  if (promptLower.includes("change")) actionTerms.push("change");
  if (promptLower.includes("set")) actionTerms.push("set");
  if (promptLower.includes("make")) actionTerms.push("make");

  // Extract colors (basic implementation)
  const colorRegex =
    /(red|blue|green|yellow|purple|orange|black|white|gray|grey|pink|brown|gold|silver)/g;
  const colors = promptLower.match(colorRegex) || [];

  return {
    elementTerms,
    actionTerms,
    colors,
  };
}

/**
 * AI-driven landing page builder
 * This function processes user prompts and updates the landing page accordingly
 */
async function processPromptWithAI(prompt: string): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  console.log("Processing prompt with AI:", prompt);

  // Initialize changes array
  const changes: StyleChange[] = [];

  try {
    // Analyze the prompt
    const { elementTerms, actionTerms, colors } = analyzePrompt(prompt);
    console.log("AI analysis:", {
      colors,
      elements: elementTerms,
      actions: actionTerms,
    });

    // Early validation
    if (elementTerms.length === 0) {
      return {
        success: false,
        changes,
        details:
          "Could not identify which element to update. Please specify the element (e.g., hero, heading, logo, etc.).",
      };
    }

    if (actionTerms.length === 0) {
      return {
        success: false,
        changes,
        details:
          "Could not identify what action to take. Please specify the action (e.g., update, change, set).",
      };
    }

    // CASE 1: Logo update
    if (elementTerms.includes("logo")) {
      const logoUrl = extractUrl(prompt);
      if (logoUrl) {
        return await updateLogo(logoUrl, changes);
      } else {
        return {
          success: false,
          changes,
          details:
            "Logo update requested but no valid URL found in the prompt.",
        };
      }
    }

    // CASE 2: Hero heading/headline update
    if (
      (elementTerms.includes("heading") ||
        elementTerms.includes("headline") ||
        elementTerms.includes("title")) &&
      elementTerms.includes("hero")
    ) {
      // Extract the new text by removing common phrases
      const newText = prompt
        .replace(/update|change|set|make/gi, "")
        .replace(/hero|heading|headline|title|to/gi, "")
        .trim();

      if (newText) {
        return await updateHeroHeading(newText, changes);
      } else {
        return {
          success: false,
          changes,
          details:
            "Hero heading update requested but no new text content found in the prompt.",
        };
      }
    }

    // CASE 3: Star color update
    if (elementTerms.includes("star") && colors.length > 0) {
      return await updateStarColor(colors[0], changes);
    }

    // If we get here, we couldn't determine what to do
    return {
      success: false,
      changes,
      details: `Could not determine how to process the prompt. Identified elements: [${elementTerms.join(", ")}], actions: [${actionTerms.join(", ")}]${colors.length > 0 ? `, colors: [${colors.join(", ")}]` : ""}`,
    };
  } catch (error) {
    console.error("Error processing prompt with AI:", error);
    return {
      success: false,
      changes,
      details: `Error processing your request: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Helper function to extract color terms from a prompt
function extractColors(prompt: string): ColorTerm[] {
  const colors: ColorTerm[] = [];

  // Check for hex color codes
  const hexMatches = prompt.match(/#([0-9a-f]{3,6})\b/gi);
  if (hexMatches) {
    colors.push(...hexMatches);
  }

  // Check for named colors
  const namedColors = [
    "blue",
    "red",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "gray",
    "black",
    "white",
    "gold",
    "silver",
  ];

  for (const color of namedColors) {
    if (prompt.includes(color)) {
      colors.push(color);
    }
  }

  return colors;
}

// Helper function to extract element terms from a prompt
function extractElements(prompt: string): ElementTerm[] {
  const elements: ElementTerm[] = [];
  const elementTerms = [
    "star",
    "button",
    "heading",
    "title",
    "background",
    "hero",
    "benefit",
    "feature",
    "testimonial",
    "main",
    "text",
    "section",
    "color",
    "content",
    "logo",
  ];

  const promptLower = prompt.toLowerCase();

  for (const term of elementTerms) {
    // Use word boundary regex to find whole words
    const regex = new RegExp(`\\b${term}\\b|\\b${term}s\\b`, "i");
    if (regex.test(promptLower)) {
      elements.push(term);
    }
  }

  // Special handling for specific phrases
  if (promptLower.includes("header") || promptLower.includes("footer")) {
    if (promptLower.includes("logo")) {
      elements.push("logo");
    }
  }

  return elements;
}

// Helper function to extract action terms from a prompt
function extractActions(prompt: string): ActionTerm[] {
  const actions: ActionTerm[] = [];
  const actionTerms = [
    "change",
    "update",
    "modify",
    "set",
    "make",
    "transform",
    "convert",
    "color",
    "replace",
    "edit",
  ];

  const promptLower = prompt.toLowerCase();

  for (const term of actionTerms) {
    // Use word boundary regex to find whole words and their variations
    const regex = new RegExp(
      `\\b${term}\\b|\\b${term}s\\b|\\b${term}d\\b|\\b${term}ing\\b`,
      "i",
    );
    if (regex.test(promptLower)) {
      actions.push(term);
    }
  }

  return actions;
}

// Helper function to extract new text from a prompt
function extractNewText(prompt: string): string | null {
  // Try various patterns to extract text

  // Pattern 1: "to [new text]" at the end
  const toMatch = prompt.match(/\bto\s+(.+)$/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }

  // Pattern 2: "from X to Y"
  const fromToMatch = prompt.match(
    /from\s+["']?([^"']+)["']?\s+to\s+["']?([^"']+)["']?/i,
  );
  if (fromToMatch && fromToMatch[2]) {
    return fromToMatch[2].trim();
  }

  // If no pattern matches, return null
  return null;
}

// Helper function to extract URLs from a prompt
function extractUrl(prompt: string): string | null {
  // Match URLs that are part of common phrases
  // "to this one: URL" or "to URL" or "use URL" or just a URL
  const phrases = [
    /to\s+this\s+one:?\s*(https?:\/\/[^\s"']+)/i,
    /to\s+(https?:\/\/[^\s"']+)/i,
    /use\s+(https?:\/\/[^\s"']+)/i,
    /(https?:\/\/[^\s"']+)/i,
  ];

  for (const regex of phrases) {
    const match = prompt.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// Function to update star color
async function updateStarColor(
  color: string,
  changes: StyleChange[],
): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  try {
    const heroFilePath = path.join(
      process.cwd(),
      "src",
      "components",
      "Hero.astro",
    );
    if (await fileExists(heroFilePath)) {
      const heroContent = await fs.readFile(heroFilePath, "utf-8");

      // Replace the star color with inline style instead of text-color classes
      const updatedContent = heroContent.replace(
        /<svg class="size-4 sm:size-5 text-[a-z0-9-]+"/g,
        `<svg class="size-4 sm:size-5" style="color: ${color}"`,
      );

      await fs.writeFile(heroFilePath, updatedContent, "utf-8");

      changes.push({
        type: "style",
        element: "hero-stars",
        property: "color",
        value: color,
      });

      return {
        success: true,
        changes,
        details: `Updated star color to ${color} in the hero section.`,
      };
    }
  } catch (error) {
    console.error("Error updating star color:", error);
  }

  return {
    success: false,
    changes,
    details: "Failed to update star color.",
  };
}

// Function to update button color
async function updateButtonColor(
  color: string,
  changes: StyleChange[],
): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  try {
    const customStylesPath = path.join(
      process.cwd(),
      "public",
      "styles",
      "custom-styles.css",
    );
    let cssContent = "";

    try {
      cssContent = await fs.readFile(customStylesPath, "utf-8");
    } catch (error) {
      // File doesn't exist, create it
      cssContent = "";
    }

    // Update button styles directly
    let updatedContent = cssContent;

    // Create or update button styles
    const buttonStyles = `
/* Button styles updated via prompt */
.bg-blue-500, .bg-blue-600, .bg-blue-700,
button.bg-blue-500, button.bg-blue-600, button.bg-blue-700,
.btn-primary {
  background-color: ${color} !important;
  border-color: ${color} !important;
}

.hover\\:bg-blue-600:hover, .hover\\:bg-blue-700:hover {
  background-color: ${color} !important;
}`;

    // If we already have button styles, replace them
    if (updatedContent.includes("/* Button styles updated via prompt */")) {
      const buttonStylesRegex =
        /\/\* Button styles updated via prompt \*\/[\s\S]*?(?=\/\*|$)/;
      updatedContent = updatedContent.replace(buttonStylesRegex, buttonStyles);
    } else {
      // Otherwise append them
      updatedContent += buttonStyles;
    }

    await fs.writeFile(customStylesPath, updatedContent, "utf-8");

    changes.push({
      type: "style",
      element: "buttons",
      property: "background-color",
      value: color,
    });

    return {
      success: true,
      changes,
      details: `Updated button colors to ${color} throughout the site.`,
    };
  } catch (error) {
    console.error("Error updating button color:", error);
  }

  return {
    success: false,
    changes,
    details: "Failed to update button color.",
  };
}

// Function to update background color
async function updateBackgroundColor(
  section: string,
  color: string,
  changes: StyleChange[],
): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  try {
    const customStylesPath = path.join(
      process.cwd(),
      "public",
      "styles",
      "custom-styles.css",
    );
    let cssContent = "";

    try {
      cssContent = await fs.readFile(customStylesPath, "utf-8");
    } catch (error) {
      // File doesn't exist, create it
      cssContent = "";
    }

    // Add or update background style
    const sectionId = `#${section}`;
    if (!cssContent.includes(sectionId)) {
      cssContent += `\n${sectionId} { background-color: ${color}; }\n`;
    } else {
      cssContent = cssContent.replace(
        new RegExp(`${sectionId}\\s*{[^}]*}`),
        `${sectionId} { background-color: ${color}; }`,
      );
    }

    await fs.writeFile(customStylesPath, cssContent, "utf-8");

    changes.push({
      type: "style",
      element: sectionId,
      property: "background-color",
      value: color,
    });

    return {
      success: true,
      changes,
      details: `Updated background color to ${color} for the ${section} section.`,
    };
  } catch (error) {
    console.error("Error updating background color:", error);
  }

  return {
    success: false,
    changes,
    details: "Failed to update background color.",
  };
}

// Function to update hero heading
async function updateHeroHeading(
  newText: string,
  changes: StyleChange[],
): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  try {
    const heroFilePath = path.join(
      process.cwd(),
      "src",
      "components",
      "Hero.astro",
    );
    if (await fileExists(heroFilePath)) {
      const heroContent = await fs.readFile(heroFilePath, "utf-8");

      // Look for the heading using a flexible approach
      const headingRegex = /<h1[^>]*>([\s\S]*?)<\/h1>/;
      const headingMatch = heroContent.match(headingRegex);

      if (headingMatch) {
        // Try to preserve the span if present
        const spanMatch = headingMatch[1].match(/<span[^>]*>([^<]*)<\/span>/);
        let updatedHeading;

        if (spanMatch && newText.includes(" with ")) {
          // If the new text contains "with", split and highlight the second part
          const parts = newText.split(/\s+with\s+/i);
          if (parts.length === 2) {
            updatedHeading = `${parts[0]} with <span class="text-blue-600">${parts[1]}</span>`;
          } else {
            updatedHeading = newText;
          }
        } else {
          updatedHeading = newText;
        }

        const updatedContent = heroContent.replace(
          headingRegex,
          `<h1 class="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 leading-tight sm:leading-tight md:leading-tight lg:leading-tight">
        ${updatedHeading}
      </h1>`,
        );

        await fs.writeFile(heroFilePath, updatedContent, "utf-8");

        changes.push({
          type: "text",
          element: "hero-heading",
          property: "textContent",
          value: newText,
        });

        return {
          success: true,
          changes,
          details: `Updated hero heading to "${newText}".`,
        };
      }
    }
  } catch (error) {
    console.error("Error updating hero heading:", error);
  }

  return {
    success: false,
    changes,
    details: "Failed to update hero heading.",
  };
}

// Function to update logo
async function updateLogo(
  logoUrl: string,
  changes: StyleChange[],
): Promise<{
  success: boolean;
  changes: StyleChange[];
  details: string;
}> {
  try {
    // Update Header logo
    const headerFilePath = path.join(
      process.cwd(),
      "src",
      "components",
      "Header.astro",
    );
    if (await fileExists(headerFilePath)) {
      const headerContent = await fs.readFile(headerFilePath, "utf-8");

      // Replace the logo in the header
      const updatedHeaderContent = headerContent.replace(
        /<a class="flex-none font-semibold text-xl text-black[^>]*>(.*?)<\/a>/s,
        `<a class="flex-none font-semibold text-xl text-black focus:outline-hidden focus:opacity-80 dark:text-white" href="#" aria-label="FoxFreela">
        <img src="${logoUrl}" alt="FoxFreela Logo" class="h-8" />
      </a>`,
      );

      await fs.writeFile(headerFilePath, updatedHeaderContent, "utf-8");

      changes.push({
        type: "image",
        element: "header-logo",
        property: "src",
        value: logoUrl,
      });
    }

    // Update Footer logo
    const footerFilePath = path.join(
      process.cwd(),
      "src",
      "components",
      "Footer.astro",
    );
    if (await fileExists(footerFilePath)) {
      const footerContent = await fs.readFile(footerFilePath, "utf-8");

      // Replace the logo in the footer
      const updatedFooterContent = footerContent.replace(
        /<a class="flex-none text-lg sm:text-xl font-semibold text-white[^>]*>(.*?)<\/a>/s,
        `<a class="flex-none text-lg sm:text-xl font-semibold text-white focus:outline-hidden focus:opacity-80 hover:opacity-90 transition-opacity" href="#" aria-label="FoxFreela">
        <img src="${logoUrl}" alt="FoxFreela Logo" class="h-8" />
      </a>`,
      );

      await fs.writeFile(footerFilePath, updatedFooterContent, "utf-8");

      changes.push({
        type: "image",
        element: "footer-logo",
        property: "src",
        value: logoUrl,
      });
    }

    return {
      success: true,
      changes,
      details: `Updated logo in header and footer to ${logoUrl}.`,
    };
  } catch (error) {
    console.error("Error updating logo:", error);
  }

  return {
    success: false,
    changes,
    details: "Failed to update logo.",
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body
    const body = await request.json();

    if (!body || !body.prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          details: "Missing prompt in request body",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Process the prompt
    const result = await processPromptWithAI(body.prompt);

    // Return the result
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        success: false,
        details:
          error instanceof Error
            ? error.message
            : "Unknown error processing request",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
