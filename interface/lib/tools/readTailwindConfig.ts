import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

// In ES modules, __dirname is not available by default. This is the standard workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function readTailwindConfig(): any {
  // Correctly resolve the path from the project's root directory.
  // process.cwd() points to the 'interface' directory when running `npm run dev`.
  const configPath = path.resolve(process.cwd(), '..', 'rendering', 'tailwind.config.cjs');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: Tailwind config not found at expected path: ${configPath}`);
    throw new Error('Could not locate the Tailwind configuration file.');
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  
  // Provide a minimal, safe mock for require to avoid loading external modules during analysis
  // We only need to evaluate plain objects in tailwind.config; any plugin calls are stubbed.
  const sandboxedRequire = (_pkg: string) => {
    // Return harmless stubs so config evaluation does not throw
    return () => ({});
  };

  // Create a secure sandbox to execute the config file, which is JavaScript code
  const sandbox = {
    module: { exports: {} },
    exports: {},
    // Use our sandboxed require
    require: sandboxedRequire,
  };
  
  // Execute the config code within the sandboxed context
  vm.runInNewContext(configContent, sandbox);
  
  // The config object is assigned to module.exports in a standard CJS module
  return sandbox.module.exports;
} 