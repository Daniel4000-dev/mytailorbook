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
    // One-off root-level utility/scratch scripts — not part of the app:
    "fix-hovers.mjs",
    "get-wa.js",
    "get_order.mjs",
    "remove_bg.js",
    "snap.js",
    "test_query.js",
  ]),
]);

export default eslintConfig;
