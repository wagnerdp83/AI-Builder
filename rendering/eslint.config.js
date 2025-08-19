import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import globals from "globals";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "dist/",
      ".astro/",
      ".next/",
      "**/.eslintrc.cjs",
      "src/components_bkp/", // Ignoring backup components
      "**/*_bkp.astro",
      "**/* copy.astro",
      "**/*.backup*",
      "src/env.d.ts",
      "src/components/src/env.d.ts",
    ],
  },

  // Base configs applied to all files
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],

  // Configuration for Node.js/build script files
  {
    files: [
      "astro.config.mjs",
      "scripts/**/*.js",
      "src/middleware.js",
      "process-html.mjs",
      "tailwind.config.cjs",
      "vite.config.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Configuration for browser-side scripts
  {
    files: ["public/**/*.js", "src/assets/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Specific overrides for the Service Worker
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },

  // Custom rules to make the linter less strict for now
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "no-cond-assign": "warn",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
);
