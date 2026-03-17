import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['.claude/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['tests/flavor.select.test.js', 'tests/subscribe.form.test.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
