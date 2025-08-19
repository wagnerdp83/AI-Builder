import { promises as fs } from 'fs';
import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { getComponentFilePath } from '@/lib/agents/file-utils';

export interface UpdateOperation {
  itemIndex: number;
  updates: Record<string, string>;
}

export interface FrontmatterUpdateInstructions {
  filePath: string;
  arrayName: string;
  updates: UpdateOperation[];
}

export async function executeFrontmatterUpdate(instructions: FrontmatterUpdateInstructions) {
  const { filePath, arrayName, updates } = instructions;
  
  if (!filePath || !arrayName || !updates || !Array.isArray(updates)) {
    throw new Error("Invalid instructions for 'frontmatter-update'. Requires 'filePath', 'arrayName', and a 'updates' array.");
  }

  const fullPath = getComponentFilePath(filePath);

  try {
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const frontmatterRegex = /---([\s\S]*?)---/;
    const match = fileContent.match(frontmatterRegex);

    if (!match) {
      throw new Error('Frontmatter not found in the specified file.');
    }

    let frontmatterCode = match[1];
    const ast = parser.parse(frontmatterCode, { sourceType: 'module' });

    let updateCount = 0;

    traverse(ast, {
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        if (t.isIdentifier(path.node.id) && path.node.id.name === arrayName) {
          if (t.isArrayExpression(path.node.init)) {
            const array = path.node.init.elements;
            
            updates.forEach(({ itemIndex, updates: updateData }) => {
              if (itemIndex < array.length && t.isObjectExpression(array[itemIndex])) {
                const properties = (array[itemIndex] as t.ObjectExpression).properties;
                
                Object.entries(updateData).forEach(([key, value]) => {
                  const prop = properties.find(p => t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === key) as t.ObjectProperty;
                  if (prop) {
                    prop.value = t.stringLiteral(value);
                    updateCount++;
                  } else {
                    const newProp = t.objectProperty(t.identifier(key), t.stringLiteral(value));
                    properties.push(newProp);
                    updateCount++;
                  }
                });
              }
            });
          }
        }
      },
    });

    if (updateCount > 0) {
      const { code } = generate(ast, {}, frontmatterCode);
      const updatedFileContent = fileContent.replace(match[1], code);
      await fs.writeFile(fullPath, updatedFileContent, 'utf-8');
      return { success: true, reasoning: `Applied ${updateCount} updates to the '${arrayName}' array in ${filePath}.` };
    } else {
      throw new Error(`Could not apply any of the specified updates.`);
    }

  } catch (error: any) {
    console.error('Error in frontmatter-updater:', error);
    return { success: false, error: error.message };
  }
}
