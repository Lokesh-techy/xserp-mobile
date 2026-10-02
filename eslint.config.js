/** @author Lokesh */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const restrict = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'assets/brand/*.js', 'coverage/*', '.superpowers/*'] },
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  {
    files: ['src/core/**'],
    rules: restrict([
      {
        group: ['@/ui', '@/ui/*', '@/features', '@/features/*', '@/modules', '@/modules/*', '@/app/*'],
        message: 'core must not depend on higher layers.',
      },
    ]),
  },
  {
    files: ['src/ui/**'],
    rules: restrict([
      { group: ['@/features', '@/features/*', '@/modules', '@/modules/*', '@/app/*'], message: 'ui must stay feature-agnostic.' },
    ]),
  },
  {
    files: ['src/features/**'],
    rules: restrict([
      { group: ['@/modules', '@/modules/*', '@/app/*'], message: 'features must not import modules/ or app/.' },
      {
        group: ['@/features/*/*', '!@/features/approvals/engine'],
        message: 'Import another feature only through its index (@/features/<name>). Use relative imports inside a feature.',
      },
    ]),
  },
]);
