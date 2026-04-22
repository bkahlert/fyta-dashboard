import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

// eslint-disable-next-line @typescript-eslint/no-deprecated, sonarjs/deprecation
export default tseslint.config(
  {
    ignores: [
      'dist/',
      'storybook-static/',
      'node_modules/',
      'home-assistant/',
      '**/config.example.js',
    ],
  },

  eslint.configs.recommended,

  // TypeScript — type-aware strict rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Vue SFCs
  ...pluginVue.configs['flat/recommended'],

  // Type-aware parser config for .vue files
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Type-aware parser config for .ts files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Code quality
  // sonarjsConfigs.recommended is typed as Linter.FlatConfig; cast to satisfy tseslint.config()
  sonarjsConfigs.recommended,
  unicorn.configs.recommended,
  perfectionist.configs['recommended-natural'],

  // Prettier must be last — disables ESLint formatting rules
  prettier,

  // Stories: component field is typed as any by vue-eslint-parser — false positive
  {
    files: ['**/*.stories.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Project-level overrides
  {
    rules: {
      // perfectionist: object property order is semantic in this codebase; don't enforce alphabetical
      'perfectionist/sort-objects': 'off',
      // unicorn: filename conventions — components are PascalCase, composables/configs are camelCase
      'unicorn/filename-case': [
        'error',
        {
          cases: { camelCase: true, pascalCase: true },
          ignore: [/\.stories\.ts$/, /eslint\.config\.ts/, /vite-env\.d\.ts/],
        },
      ],
      // unicorn: forEach is idiomatic in Vue template expressions
      'unicorn/no-array-for-each': 'off',

      // unicorn: Vue uses null by convention (e.g. Date | null refs, prop defaults)
      'unicorn/no-null': 'off',
      // unicorn: Array.from is fine; no need to force spread
      'unicorn/prefer-spread': 'off',
      // unicorn: single-letter vars (p, g) are idiomatic in short callbacks
      'unicorn/prevent-abbreviations': 'off',
      // Enforce TypeScript on all SFCs
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      // Enforce <script setup> API style
      'vue/component-api-style': ['error', ['script-setup']],
    },
  },
)
