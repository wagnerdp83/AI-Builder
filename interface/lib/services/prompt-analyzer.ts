interface PromptType {
  type: 'style' | 'content' | 'layout';
  route: string;
}

export function analyzePrompt(prompt: string): PromptType {
  const promptLower = prompt.toLowerCase();
  
  // Style-related keywords
  const stylePatterns = [
    /colou?r/,
    /\b(bg|background)\b/,
    /\b(text|font)\b/,
    /\bborder\b/,
    /\bstyle\b/,
    /\btheme\b/,
    /from\s+(\[#[0-9a-fA-F]{6}\]|\w+)\s+to\s+(\[#[0-9a-fA-F]{6}\]|\w+)/i,
  ];
  
  // Content-related keywords
  const contentPatterns = [
    /\b(text|content)\b/,
    /\b(title|heading)\b/,
    /\b(paragraph|description)\b/,
    /\b(link|button)\s+text\b/,
    /\bchange\s+(text|content|wording)\b/,
  ];
  
  // Layout-related keywords
  const layoutPatterns = [
    /\b(layout|position)\b/,
    /\b(move|relocate)\b/,
    /\b(add|remove)\b/,
    /\b(section|component)\b/,
    /\b(spacing|margin|padding)\b/,
  ];
  
  // Check which type of patterns match
  const hasStyleMatch = stylePatterns.some(pattern => pattern.test(promptLower));
  const hasContentMatch = contentPatterns.some(pattern => pattern.test(promptLower));
  const hasLayoutMatch = layoutPatterns.some(pattern => pattern.test(promptLower));
  
  // Determine the most appropriate route
  if (hasStyleMatch) {
    return { type: 'style', route: '/api/styles' };
  } else if (hasContentMatch) {
    return { type: 'content', route: '/api/mistral' };
  } else {
    return { type: 'layout', route: '/api/mistral' };
  }
} 