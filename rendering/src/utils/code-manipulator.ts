import fs from "fs/promises";
import {
  parseAstroComponent,
  findElementByAttribute,
  findElementByText,
  updateElement,
} from "./astro-parser";

interface CodeChangeLocation {
  selector?: [string, string];
  text?: string;
  parentSelector?: [string, string];
  position?: "beforebegin" | "afterbegin" | "beforeend" | "afterend";
}

interface CodeChangeContent {
  type?: "import" | "element";
  value?: string;
  text?: string;
  attributes?: Record<string, string | null>;
  styles?: string;
}

interface CodeChange {
  file: string;
  type: "modification" | "addition" | "deletion";
  location: CodeChangeLocation;
  content: CodeChangeContent;
}

interface ChangeResult {
  file: string;
  type: string;
  status: "success" | "error";
  details: string;
}

export async function applyCodeChanges(changes: CodeChange[]): Promise<{
  changes: ChangeResult[];
  details: string;
}> {
  const results: ChangeResult[] = [];

  for (const change of changes) {
    try {
      // Read the target file
      const content = await fs.readFile(change.file, "utf-8");

      // Parse the component
      const component = parseAstroComponent(content);

      // Apply changes based on type
      switch (change.type) {
        case "modification": {
          // Find the target element
          let element;
          if (change.location.selector) {
            element = findElementByAttribute(
              component.template,
              change.location.selector[0],
              change.location.selector[1],
            );
          } else if (change.location.text) {
            element = findElementByText(
              component.template,
              change.location.text,
            );
          }

          if (!element) {
            throw new Error("Target element not found");
          }

          // Apply the updates
          updateElement(element, {
            content: change.content.text || "",
            attributes: change.content.attributes || {},
            styles: change.content.styles || "",
          });

          break;
        }

        case "addition": {
          // Handle additions (new elements, imports, etc.)
          if (change.content.type === "import" && change.content.value) {
            component.frontmatter.imports.push(change.content.value);
          } else if (
            change.content.type === "element" &&
            change.content.value &&
            change.location.parentSelector
          ) {
            const parentElement = findElementByAttribute(
              component.template,
              change.location.parentSelector[0],
              change.location.parentSelector[1],
            );
            if (!parentElement) {
              throw new Error("Parent element not found");
            }
            parentElement.insertAdjacentHTML(
              change.location.position || "beforeend",
              change.content.value,
            );
          }
          break;
        }

        case "deletion": {
          // Handle deletions
          if (!change.location.selector) {
            throw new Error("Selector is required for deletion");
          }
          const element = findElementByAttribute(
            component.template,
            change.location.selector[0],
            change.location.selector[1],
          );
          if (!element) {
            throw new Error("Element to delete not found");
          }
          element.remove();
          break;
        }
      }

      // Reconstruct the file content
      const newContent = [
        "---",
        ...component.frontmatter.imports,
        ...component.frontmatter.exports,
        ...component.frontmatter.scripts,
        "---",
        component.template.toString(),
      ].join("\n");

      // Write back to file
      await fs.writeFile(change.file, newContent, "utf-8");

      results.push({
        file: change.file,
        type: change.type,
        status: "success",
        details: `Successfully applied ${change.type}`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Error applying change to ${change.file}:`, error);
      results.push({
        file: change.file,
        type: change.type,
        status: "error",
        details: error.message,
      });
    }
  }

  return {
    changes: results,
    details: `Applied ${results.filter((r) => r.status === "success").length} out of ${changes.length} changes`,
  };
}
