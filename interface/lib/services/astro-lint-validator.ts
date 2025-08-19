import { promises as fs } from 'fs';
import path from 'path';

export interface LintError {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: LintError[];
  fixedCode?: string;
}

export class AstroLintValidator {
  
  /**
   * Comprehensive validation of Astro components
   */
  static async validateComponent(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const errors: LintError[] = [];
      
      // Parse the file line by line for detailed error reporting
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for wrong Lucide imports
        if (line.includes("from 'lucide-astro'")) {
          errors.push({
            type: 'error',
            message: 'Wrong Lucide import source: lucide-astro (should be @lucide/astro)',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        if (line.includes("from 'lucide-react'")) {
          errors.push({
            type: 'error',
            message: 'Wrong Lucide import source: lucide-react (should be @lucide/astro)',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        // Check for non-existent Lucide icons
        if (line.includes('import') && line.includes('@lucide/astro')) {
          const nonExistentIcons = ['Capsule', 'Icon', 'Pill'];
          nonExistentIcons.forEach(icon => {
            if (line.includes(icon)) {
              errors.push({
                type: 'error',
                message: `Non-existent Lucide icon: ${icon}`,
                line: lineNumber,
                code: line.trim()
              });
            }
          });
        }
        
        // Check for React syntax
        if (line.includes('className=')) {
          errors.push({
            type: 'error',
            message: 'React syntax found: className (should be class)',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        if (line.includes('key={')) {
          errors.push({
            type: 'error',
            message: 'React syntax found: key prop (not needed in Astro)',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        // Check for wrong video source attributes
        if (line.includes('<source url=')) {
          errors.push({
            type: 'error',
            message: 'Wrong video source attribute: url (should be src)',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        // Check for malformed URLs
        if (line.includes('""https://')) {
          errors.push({
            type: 'error',
            message: 'Malformed URL with double quotes',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        // Check for untyped map functions
        if (line.includes('.map((') && !line.includes(': ')) {
          errors.push({
            type: 'warning',
            message: 'Untyped map function parameter',
            line: lineNumber,
            code: line.trim()
          });
        }
        
        // Check for hardcoded Unsplash URLs
        if (line.includes('https://images.unsplash.com/') && !line.includes('{{MOCKUP_IMAGE}}')) {
          errors.push({
            type: 'warning',
            message: 'Hardcoded Unsplash URL (should use {{MOCKUP_IMAGE}} placeholder)',
            line: lineNumber,
            code: line.trim()
          });
        }
      }
      
      // Check for duplicate Lucide imports
      const lucideImportMatches = content.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
      if (lucideImportMatches && lucideImportMatches.length > 1) {
        errors.push({
          type: 'error',
          message: 'Duplicate Lucide import statements found',
          code: lucideImportMatches.join('\n')
        });
      }
      
      // Check for duplicate image URLs
      const imageUrlMatches = content.match(/https:\/\/images\.unsplash\.com\/[^"'\s]+/g);
      if (imageUrlMatches) {
        const uniqueUrls = [...new Set(imageUrlMatches)];
        if (uniqueUrls.length < imageUrlMatches.length) {
          errors.push({
            type: 'warning',
            message: 'Duplicate Unsplash image URLs found in component'
          });
        }
      }
      
      // Check for missing TypeScript interfaces
      if (content.includes('interface') && content.includes('Astro.props') && !content.includes('Partial<')) {
        errors.push({
          type: 'warning',
          message: 'Missing Partial<> wrapper for Astro.props'
        });
      }
      
      // Check for React imports
      if (content.includes('import') && content.includes('react')) {
        errors.push({
          type: 'error',
          message: 'React imports found (should not be used in Astro components)'
        });
      }
      
      // Check for React hooks
      if (content.includes('useState') || content.includes('useEffect')) {
        errors.push({
          type: 'error',
          message: 'React hooks found (should not be used in Astro components)'
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'error',
          message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
  
  /**
   * Auto-fix common lint errors
   */
  static async fixComponent(filePath: string): Promise<ValidationResult> {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;
      const errors: LintError[] = [];
      
      // Fix wrong Lucide imports
      content = content.replace(/from\s+['"]lucide-astro['"]/g, "from '@lucide/astro'");
      content = content.replace(/from\s+['"]lucide-react['"]/g, "from '@lucide/astro'");
      
      // Fix duplicate Lucide imports by consolidating them
      const lucideImports = content.match(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"]/g);
      if (lucideImports && lucideImports.length > 1) {
        const allIcons = new Set<string>();
        lucideImports.forEach(importStmt => {
          const iconMatch = importStmt.match(/\{([^}]*)\}/);
          if (iconMatch) {
            const icons = iconMatch[1].split(',').map(icon => icon.trim());
            icons.forEach(icon => allIcons.add(icon));
          }
        });
        const consolidatedImport = `import { ${Array.from(allIcons).join(', ')} } from '@lucide/astro';`;
        content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"]@lucide\/astro['"];?\s*\n?/g, '');
        content = content.replace('---\n', `---\n${consolidatedImport}\n`);
      }
      
      // Fix wrong video source attributes
      content = content.replace(/<source\s+url\s*=\s*["']([^"']+)["']/g, '<source src="$1"');
      
      // Fix React-style issues
      content = content.replace(/key\s*=\s*\{[^}]+\}/g, '');
      content = content.replace(/className\s*=\s*["'][^"']*["']/g, (match) => match.replace('className', 'class'));
      content = content.replace(/import\s+.*from\s+['"]react['"];?\s*\n?/g, '');
      content = content.replace(/import\s+.*from\s+['"]@lucide\/react['"];?\s*\n?/g, '');
      
      // Fix untyped map functions
      content = content.replace(/\.map\(\(([^)]+)\)\s*=>/g, (match, param) => {
        if (!param.includes(':')) {
          if (param.includes('product')) return `.map((${param}: Product) =>`;
          if (param.includes('testimonial')) return `.map((${param}: Testimonial) =>`;
          if (param.includes('item')) return `.map((${param}: any) =>`;
          return `.map((${param}: any) =>`;
        }
        return match;
      });
      
      // Fix malformed URLs
      content = content.replace(/""https:\/\//g, '"https://');
      
      // Fix missing Partial<> wrapper
      content = content.replace(/Astro\.props;?\s*$/gm, 'Astro.props as Partial<ComponentProps>;');
      
      // Remove non-existent icons from imports
      const nonExistentIcons = ['Capsule', 'Icon'];
      nonExistentIcons.forEach(icon => {
        content = content.replace(new RegExp(`\\b${icon}\\b,?\\s*`, 'g'), '');
        content = content.replace(new RegExp(`,\\s*\\b${icon}\\b\\b`, 'g'), '');
      });
      
      // Replace hardcoded Unsplash URLs with placeholders
      content = content.replace(/https:\/\/images\.unsplash\.com\/[^"'\s]+/g, '{{MOCKUP_IMAGE}}');
      
      // Save the fixed content
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf-8');
        console.log(`🔧 [AstroLintValidator] Fixed component: ${filePath}`);
      }
      
      // Validate the fixed component
      const validationResult = await this.validateComponent(filePath);
      
      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        fixedCode: content
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'error',
          message: `Failed to fix file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
  
  /**
   * Validate all components in a directory
   */
  static async validateAllComponents(componentsDir: string): Promise<{
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    errors: Array<{ file: string; errors: LintError[] }>;
  }> {
    try {
      const files = await fs.readdir(componentsDir);
      const astroFiles = files.filter(file => file.endsWith('.astro'));
      
      let validFiles = 0;
      let invalidFiles = 0;
      const allErrors: Array<{ file: string; errors: LintError[] }> = [];
      
      for (const file of astroFiles) {
        const filePath = path.join(componentsDir, file);
        const result = await this.validateComponent(filePath);
        
        if (result.isValid) {
          validFiles++;
        } else {
          invalidFiles++;
          allErrors.push({
            file,
            errors: result.errors
          });
        }
      }
      
      return {
        totalFiles: astroFiles.length,
        validFiles,
        invalidFiles,
        errors: allErrors
      };
      
    } catch (error) {
      console.error('Error validating components:', error);
      return {
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0,
        errors: []
      };
    }
  }
  
  /**
   * Auto-fix all components in a directory
   */
  static async fixAllComponents(componentsDir: string): Promise<{
    totalFiles: number;
    fixedFiles: number;
    failedFiles: number;
    results: Array<{ file: string; success: boolean; errors: LintError[] }>;
  }> {
    try {
      const files = await fs.readdir(componentsDir);
      const astroFiles = files.filter(file => file.endsWith('.astro'));
      
      let fixedFiles = 0;
      let failedFiles = 0;
      const results: Array<{ file: string; success: boolean; errors: LintError[] }> = [];
      
      for (const file of astroFiles) {
        const filePath = path.join(componentsDir, file);
        const result = await this.fixComponent(filePath);
        
        if (result.isValid) {
          fixedFiles++;
        } else {
          failedFiles++;
        }
        
        results.push({
          file,
          success: result.isValid,
          errors: result.errors
        });
      }
      
      return {
        totalFiles: astroFiles.length,
        fixedFiles,
        failedFiles,
        results
      };
      
    } catch (error) {
      console.error('Error fixing components:', error);
      return {
        totalFiles: 0,
        fixedFiles: 0,
        failedFiles: 0,
        results: []
      };
    }
  }
} 