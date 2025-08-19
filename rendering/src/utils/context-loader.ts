import fs from "fs/promises";
import path from "path";
import glob from "fast-glob";

interface ProjectContext {
  components: {
    [key: string]: {
      path: string;
      content: string;
      dependencies: string[];
      styles: string[];
    };
  };
  styles: {
    theme: any;
    globalClasses: string[];
  };
  routes: string[];
}

export async function loadProjectContext(): Promise<ProjectContext> {
  const srcDir = path.join(process.cwd(), "src");

  // Load all Astro components
  const componentFiles = await glob("**/*.astro", { cwd: srcDir });
  const components: ProjectContext["components"] = {};

  for (const file of componentFiles) {
    const fullPath = path.join(srcDir, file);
    const content = await fs.readFile(fullPath, "utf-8");

    // Basic dependency extraction (can be enhanced with AST parsing)
    const importLines = content.match(/import.*from.*/g) || [];
    const dependencies = importLines
      .map((line) => {
        const match = line.match(/from\s+['"](.+)['"]/);
        return match ? match[1] : null;
      })
      .filter((d): d is string => Boolean(d));

    // Extract Tailwind classes (can be enhanced with proper parsing)
    const classMatches = content.match(/class=["']([^"']+)["']/g) || [];
    const styles = classMatches
      .map((classStr) => {
        const res = classStr.match(/class=["']([^"']+)["']/);
        return res ? res[1] : "";
      })
      .filter(Boolean);

    components[file] = {
      path: fullPath,
      content,
      dependencies,
      styles,
    };
  }

  // Load Tailwind config and extract theme
  let theme = {};
  try {
    const tailwindConfig = require(
      path.join(process.cwd(), "tailwind.config.js"),
    );
    theme = tailwindConfig.theme || {};
  } catch (err: unknown) {
    const error = err as Error;
    console.warn("Could not load Tailwind config:", error);
  }

  // Get all routes (pages)
  const routes = await glob("pages/**/*.{astro,md,mdx}", { cwd: srcDir });

  return {
    components,
    styles: {
      theme,
      globalClasses: [], // Could be populated by analyzing global.css or similar
    },
    routes,
  };
}
