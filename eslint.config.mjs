import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mobile app (handled by Flutter)
    "mobile/**",
  ]),
  // Custom rules - relaxed for MVP, tighten later
  {
    rules: {
      // Allow any types for now (tighten later)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow require imports (needed for dynamic imports)
      "@typescript-eslint/no-require-imports": "warn",
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      // Allow img elements (we'll optimize later)
      "@next/next/no-img-element": "warn",
      // Allow <a> tags for external links
      "@next/next/no-html-link-for-pages": "warn",
      // Relax react hooks rules for complex state
      "react-hooks/exhaustive-deps": "warn",
      // React compiler rules - relax for MVP
      "react-hooks/immutability": "warn",
      "react-compiler/react-compiler": "off",
    }
  }
]);

export default eslintConfig;
