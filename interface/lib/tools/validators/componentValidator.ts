export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates the image paths in the generated Astro component code.
 * It ensures that all image `src` attributes use the expected placeholders
 * instead of hallucinated or incorrect local paths.
 * @param code The generated Astro component code.
 * @returns A ValidationResult object.
 */
export function validateImagePaths(code: string): ValidationResult {
  // This regex finds all src="..." attributes in the code.
  const srcRegex = /src="([^"]*)"/g;
  let match;
  const errors: string[] = [];

  while ((match = srcRegex.exec(code)) !== null) {
    const path = match[1];

    // Check if the path is one of the allowed placeholders.
    const isPlaceholder = path === '__MOCKUP_IMAGE_PATH__' || path === '__AVATAR_IMAGE_PATH__';
    
    // Check if the path is a data URL, which is also acceptable for embedded SVGs from heroicons
    const isDataUrl = path.startsWith('data:image/');

    // A valid path is a placeholder or a data URL. Any other kind of local path or absolute URL is an error.
    if (!isPlaceholder && !isDataUrl) {
        // We check for common patterns that are invalid.
        if (path.startsWith('/') || path.startsWith('http') || path.startsWith('www.')) {
             errors.push(`Invalid image path found: "${path}". Only placeholders "__MOCKUP_IMAGE_PATH__" or "__AVATAR_IMAGE_PATH__" are allowed.`);
        }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('\n'),
    };
  }

  return { isValid: true };
}

// We can add more validators here in the future, e.g., for checking Astro syntax. 