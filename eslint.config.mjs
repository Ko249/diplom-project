import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores(['**/dist/**', '**/build/**', '**/coverage/**']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['client/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['server/**/*.ts', 'client/vite.config.ts', 'eslint.config.mjs'],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
  prettier,
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
]);
