export function toPascalCase(str: string): string {
  return str
    .replace('.astro', '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
} 