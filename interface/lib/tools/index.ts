import { MistralTools } from '../types/mistral';

export const MISTRAL_TOOLS: MistralTools = {
  findComponent: {
    name: 'findComponent',
    description: 'Find a component based on the user\'s description or request',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'The user\'s description of what they want to modify'
        }
      },
      required: ['description']
    }
  },
  analyzeComponent: {
    name: 'analyzeComponent',
    description: 'Analyze a component\'s structure and content',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the component file'
        }
      },
      required: ['filePath']
    }
  },
  modifyComponent: {
    name: 'modifyComponent',
    description: 'Make changes to a component using AST manipulation',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the component file'
        },
        operation: {
          type: 'object',
          description: 'The modification operation to perform',
          properties: {
            type: {
              type: 'string',
              enum: ['updateText', 'updateAttribute', 'addElement', 'removeElement'],
              description: 'Type of modification'
            },
            selector: {
              type: 'string',
              description: 'CSS-like selector to find the element'
            },
            value: {
              type: 'string',
              description: 'New value to set'
            }
          },
          required: ['type', 'selector']
        }
      },
      required: ['filePath', 'operation']
    }
  },
  previewChanges: {
    name: 'previewChanges',
    description: 'Generate a preview of the proposed changes',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the component file'
        },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              location: { type: 'object' },
              oldValue: { type: 'string' },
              newValue: { type: 'string' }
            }
          }
        }
      },
      required: ['filePath', 'changes']
    }
  }
}; 