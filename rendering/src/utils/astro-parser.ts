// @ts-nocheck
import { parse as parseHTML } from "node-html-parser";
import { parse as parseTS } from "@typescript-eslint/typescript-estree";

interface AstroComponent {
  frontmatter: {
    imports: string[];
    exports: string[];
    scripts: string[];
  };
  template: any; // HTML AST
  script: any; // TypeScript AST
}

export function parseAstroComponent(content: string): AstroComponent {
  // Split component into frontmatter and template
  const [frontmatterBlock, ...templateParts] = content.split("---\n");
  const template = templateParts.join("---\n");

  // Parse frontmatter
  const frontmatter: AstroComponent["frontmatter"] = {
    imports: [] as string[],
    exports: [] as string[],
    scripts: [] as string[],
  };

  // Extract imports, exports, and scripts from frontmatter
  const lines = frontmatterBlock.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("import")) {
      frontmatter.imports.push(line.trim());
    } else if (line.trim().startsWith("export")) {
      frontmatter.exports.push(line.trim());
    } else if (line.trim()) {
      frontmatter.scripts.push(line.trim());
    }
  }

  // Parse template HTML
  const templateAST = parseHTML(template, {
    comment: true,
    blockTextElements: {
      script: true,
      style: true,
      pre: true,
    },
  });

  // Extract and parse any script tags
  let scriptAST = null;
  const scriptTag = templateAST.querySelector("script");
  if (scriptTag) {
    try {
      scriptAST = parseTS(scriptTag.text, {
        jsx: true,
        range: true,
        loc: true,
      });
    } catch (error) {
      console.warn("Error parsing script content:", error);
    }
  }

  return {
    frontmatter,
    template: templateAST,
    script: scriptAST,
  };
}

export function findElementByAttribute(
  ast: any,
  attr: string,
  value: string,
): any {
  const elements = ast.querySelectorAll(`[${attr}]`);
  return elements.find((el) => el.getAttribute(attr) === value);
}

export function findElementByText(ast: any, text: string): any {
  const walker = ast.createTreeWalker(ast.root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      return node.textContent.includes(text)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent.includes(text)) {
      return node.parentNode;
    }
  }
  return null;
}

export function updateElement(element: any, updates: any): void {
  if (updates.content) {
    element.textContent = updates.content;
  }

  if (updates.attributes) {
    for (const [attr, value] of Object.entries(updates.attributes)) {
      if (value === null) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, value as string);
      }
    }
  }

  if (updates.styles) {
    let currentClasses = (element.getAttribute("class") || "").split(/\s+/);
    const newClasses = updates.styles.split(/\s+/);

    // Remove classes that are being replaced
    for (const newClass of newClasses) {
      const [utility] = newClass.split("-");
      currentClasses = currentClasses.filter(
        (c) => !c.startsWith(`${utility}-`),
      );
    }

    // Add new classes
    currentClasses.push(...newClasses);
    element.setAttribute("class", currentClasses.join(" "));
  }
}
