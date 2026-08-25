import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from '@eslint-react/eslint-plugin';
import globals from 'globals';

// ESLint 10. `eslint-config-next` is deliberately NOT used: it hard-depends on
// eslint-plugin-react@7.37.5, which has never declared an ESLint 10 peer and
// crashes on it (calls the removed `context.getFilename()`). The bundle is
// unpacked here into its still-maintained parts:
//   eslint-config-next  ->  @next/eslint-plugin-next (no peer deps at all)
//                       +   typescript-eslint
//                       +   eslint-plugin-react-hooks
//                       +   @eslint-react/eslint-plugin (replaces eslint-plugin-react)
// eslint-plugin-jsx-a11y and eslint-plugin-import both still cap at eslint ^9
// and have no ESLint 10 release, so their rules are dropped. See the PR body.

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'public/data/**',
    'analysis/**',
    'scripts/**',
  ]),

  // Bring TypeScript into scope (ESLint only lints js/mjs/cjs by default) and
  // declare the same globals eslint-config-next did. These are load-bearing:
  // several @next/next rules resolve identifiers against the global scope
  // (e.g. no-location-assign-relative-destination looks `window` up in
  // scopeManager.scopes[0]) and silently no-op when it is undeclared.
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  tseslint.configs.recommended,
  nextPlugin.configs['core-web-vitals'],
  reactHooks.configs.flat.recommended,

  // React correctness rules, enabled one-for-one against what
  // eslint-config-next had switched on via eslint-plugin-react. The hooks rules
  // are left to eslint-plugin-react-hooks so existing inline
  // `eslint-disable-next-line react-hooks/*` comments keep working.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@eslint-react': reactPlugin },
    rules: {
      '@eslint-react/no-missing-component-display-name': 'error', // was react/display-name
      '@eslint-react/no-missing-key': 'error', // was react/jsx-key
      '@eslint-react/jsx-no-comment-textnodes': 'error', // was react/jsx-no-comment-textnodes
      '@eslint-react/jsx-no-children-prop': 'error', // was react/no-children-prop
      '@eslint-react/dom-no-dangerously-set-innerhtml-with-children': 'error', // was react/no-danger-with-children
      '@eslint-react/no-direct-mutation-state': 'error', // was react/no-direct-mutation-state
      '@eslint-react/dom-no-find-dom-node': 'error', // was react/no-find-dom-node
      '@eslint-react/dom-no-render-return-value': 'error', // was react/no-render-return-value
    },
  },

  {
    rules: {
      // Restored from eslint-config-next, which switched these core rules on
      // and downgraded no-unused-expressions from typescript-eslint's default.
      'no-var': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      '@typescript-eslint/no-unused-expressions': 'warn',

      // Project overrides, carried over unchanged. The former
      // 'react/no-unescaped-entities': 'off' is gone with eslint-plugin-react;
      // @eslint-react has no equivalent rule, so there is nothing left to
      // switch off.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      '@next/next/no-img-element': 'off',
      'react-hooks/purity': 'off',
      // React 19 strictness — keep as error to catch real anti-patterns; the
      // legitimate exceptions (SSR mount detection, sessionStorage restore)
      // carry inline eslint-disable-next-line with a comment.
    },
  },
]);

export default eslintConfig;
