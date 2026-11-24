import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Disable experimental React 19 compiler rules that conflict with standard React patterns
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/hooks": "off",
      "react-hooks/capitalized-calls": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/void-use-memo": "off",
      "react-hooks/memo-dependencies": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/globals": "off",
      "react-hooks/memoized-effect-dependencies": "off",
      "react-hooks/exhaustive-effect-dependencies": "off",
      "react-hooks/no-deriving-state-in-effects": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/invariant": "off",
      "react-hooks/todo": "off",
      "react-hooks/syntax": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
      "react-hooks/rule-suppression": "off",
      "react-hooks/fbt": "off",
      "react-hooks/component-hook-factories": "off",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Mobile native build directories:
    "android/**",
    "ios/**",
    // Built and public assets:
    "public/**",
    // Utility and test scripts:
    "fix-hovers.mjs",
    "get-wa.js",
    "get_order.mjs",
    "remove_bg.js",
    "snap.js",
    "test_query.js",
    "scripts/**",
    "tests/**",
  ]),
]);

export default eslintConfig;
