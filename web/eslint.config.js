import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

// eslint-plugin-react-hooks 7.x still ships its shareable configs with the
// legacy `plugins: ["react-hooks"]` (array of strings) shape, which ESLint 10's
// flat config rejects. Register the plugin with the required object shape and
// apply its recommended rule set directly instead of spreading the config.
const reactHooksRecommendedRules =
  reactHooks.configs["recommended-latest"].rules;

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooksRecommendedRules,
      // Enforce the project's "no `any`" rule at lint time as well as via tsc.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
