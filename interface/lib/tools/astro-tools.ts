import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseHTML } from 'node-html-parser';

const PROJECT_ROOT = process.cwd().replace('/interface', '');

export const ASTRO_TOOLS = [
  {
    type: "function",
    function: {
      name: "updateText",
      description: "Update text content in an element",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "Component file path (e.g. Hero.astro)"
          },
          selector: {
            type: "string",
            description: "CSS selector to find the element"
          },
          newText: {
            type: "string",
            description: "New text content"
          }
        },
        required: ["file", "selector", "newText"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTailwindClass",
      description: "Update Tailwind classes on an element",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "Component file path (e.g. Hero.astro)"
          },
          selector: {
            type: "string",
            description: "CSS selector to find the element"
          },
          addClass: {
            type: "array",
            items: { type: "string" },
            description: "Tailwind classes to add"
          },
          removeClass: {
            type: "array",
            items: { type: "string" },
            description: "Tailwind classes to remove"
          }
        },
        required: ["file", "selector"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteElement",
      description: "Remove an element from the component",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "Component file path (e.g. Hero.astro)"
          },
          selector: {
            type: "string",
            description: "CSS selector to find the element to delete"
          }
        },
        required: ["file", "selector"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addElement",
      description: "Add a new element to the component",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "Component file path (e.g. Hero.astro)"
          },
          parentSelector: {
            type: "string",
            description: "CSS selector for the parent element"
          },
          position: {
            type: "string",
            enum: ["beforebegin", "afterbegin", "beforeend", "afterend"],
            description: "Where to insert the element relative to parent"
          },
          html: {
            type: "string",
            description: "HTML content to insert"
          }
        },
        required: ["file", "parentSelector", "position", "html"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateAttribute",
      description: "Update an attribute on an element",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "Component file path (e.g. Hero.astro)"
          },
          selector: {
            type: "string",
            description: "CSS selector to find the element"
          },
          attribute: {
            type: "string",
            description: "Attribute name to update"
          },
          value: {
            type: "string",
            description: "New attribute value"
          }
        },
        required: ["file", "selector", "attribute", "value"]
      }
    }
  }
]; 