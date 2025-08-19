export function parseComponentFromPrompt(prompt: string): string | undefined {
    const match = prompt.match(/delete(?: the)?\s*\'?\"?([a-zA-Z0-9\s]+)\'?\"?\s*(?:section|component)/i);
    if (!match) return undefined;
    return match[1].trim().toLowerCase().replace(/\s+/g, '-');
} 