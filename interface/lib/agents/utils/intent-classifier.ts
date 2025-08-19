export type Intent = 'CREATE' | 'EDIT' | 'DELETE' | 'CHAT';

// Regex-based intent classifier for speed and accuracy on simple commands.
export function getIntentFromPrompt(prompt: string): Intent | null {
    const p = prompt.toLowerCase().trim();

    // Pattern for delete: "delete the X component"
    const deleteRegex = /^delete\s*(the)?\s*.*\s*(section|component)/;
    if (deleteRegex.test(p)) return 'DELETE';

    // Pattern for edit: "componentName: update/change..." or "update componentName ..."
    const editRegex = /^\w+:\s*(update|change|set|modify|edit|replace)|^(update|change|set|modify|edit|replace)\s*\w+/;
    if (editRegex.test(p)) return 'EDIT';
    
    // Pattern for create: "create/add/build/generate ..."
    const createRegex = /^(create|add|build|generate)\s*.*(section|component|page)/;
    if (createRegex.test(p)) return 'CREATE';

    return null;
} 