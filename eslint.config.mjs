import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/purity': 'off',
      // React 19 strictness — keep as error to catch real anti-patterns; the
      // legitimate exceptions (SSR mount detection, sessionStorage restore)
      // carry inline eslint-disable-next-line with a comment.
    },
  },
]);

export default eslintConfig;
