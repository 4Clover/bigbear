import { defineConfig, globalIgnores } from 'eslint/config'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Next.js core web vitals (includes React, React Hooks, and Next.js rules)
  ...nextVitals,

  // TypeScript strict type-checked rules (catches more bugs than recommended)
  ...tseslint.configs.strictTypeChecked,

  // TypeScript stylistic rules for consistency
  ...tseslint.configs.stylisticTypeChecked,

  // Configure TypeScript parser with project service for type-aware linting
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rule overrides for production quality
  {
    rules: {
      // Enforce consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Require explicit return types on exported functions (relaxed for React components)
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowFunctionsWithoutTypeParameters: true,
        },
      ],

      // Prevent floating promises (unhandled async errors)
      '@typescript-eslint/no-floating-promises': 'error',

      // Require awaiting promises in appropriate contexts
      '@typescript-eslint/require-await': 'warn',

      // Disallow non-null assertions (use proper null checks instead)
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Warn on unused variables (allow underscore prefix for intentionally unused)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Enforce exhaustive switch statements
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Prefer nullish coalescing over logical OR for null/undefined checks
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // Prefer optional chaining over && chains
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Allow template literals with numbers (common pattern)
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: false,
          allowAny: false,
          allowNullish: false,
        },
      ],

      // Enforce naming conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE', 'PascalCase'],
        },
      ],
    },
  },

  // Relaxed rules for React components (tsx files)
  {
    files: ['**/*.tsx'],
    rules: {
      // React components don't need explicit return types
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Relaxed rules for test files
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // Allow any in tests for mocking flexibility
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow unbound methods in test assertions
      '@typescript-eslint/unbound-method': 'off',
      // Don't require explicit return types in tests
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Allow unnecessary conditions in tests (common in assertions)
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Relax nullish coalescing in tests
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },

  // Disable type-checked rules for JavaScript config files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Prettier must be last to override formatting rules
  prettier,

  // Override default ignores of eslint-config-next
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'coverage/**',
  ]),
])

export default eslintConfig
