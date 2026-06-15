import js from "@eslint/js";
import tseslint from "typescript-eslint";

const nodeGlobals = {
  console: "readonly",
  process: "readonly"
};

const browserGlobals = {
  document: "readonly",
  File: "readonly",
  FileReader: "readonly",
  HTMLInputElement: "readonly",
  window: "readonly"
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "**/dist/**",
      "**/target/**",
      "coverage/**",
      "deepseek_workbench_v0_2_1_codex_pack/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...nodeGlobals,
        ...browserGlobals
      },
      sourceType: "module"
    }
  }
];
