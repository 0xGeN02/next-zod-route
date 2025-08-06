const { resolve } = require('path');
const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

const project = resolve(__dirname, 'tsconfig.json');

module.exports = [
  // Global ignores
  {
    ignores: [
      // Build outputs
      'dist/**/*',
      'build/**/*',
      'cache/**/*',
      '.next/**/*',
      'out/**/*',
      'tsconfig.tsbuildinfo',
      'next-env.d.ts',
      // Dependencies
      'node_modules/**/*',
      '.pnp',
      '.pnp.js',
      // Config files
      '.prettierrc.js',
      'eslint.config.ts',
      '.eslintrc.js',
      // Testing
      'coverage/**/*',
      // Environment files
      '.env*',
      '!.env.example',
      // Misc
      '.DS_Store',
      '*.pem',
      // Logs
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      // Vercel
      '.vercel/**/*',
    ],
  },
  // Base JS config
  js.configs.recommended,
  // TypeScript config
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Next.js/Web API globals
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Basic rules
      'prefer-const': 'error',
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Test files config
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-unreachable': 'off', // Allow unreachable code in tests for testing error paths
    },
  },
];
