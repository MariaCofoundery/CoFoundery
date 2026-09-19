import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /**
       * Ein Unterstrich vorne heisst: absichtlich nicht benutzt.
       *
       * Diese Codebasis nutzt das an mehreren Stellen, wo eine Signatur
       * vorgegeben ist und ein Parameter nicht gebraucht wird - etwa
       * `(_sessionId, text)`. Bisher gab es dafuer eine Warnung, und dann
       * stehen sechs Warnungen in der Liste, bei denen alles richtig ist.
       * Warnungen, die man wegsehen muss, entwerten die anderen.
       *
       * Dasselbe fuer weggelassene Werte beim Destrukturieren (`{ a: _, b }`)
       * und fuer aufgefangene Fehler, die nicht interessieren.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
