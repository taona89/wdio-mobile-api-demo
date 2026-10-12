import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            'apps/',
            'api/playwright-report/',
            'api/test-results/',
            'mobile/artifacts/',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        // WebdriverIO injects driver/$/expect as globals in the mobile project.
        files: ['mobile/**/*.ts'],
        languageOptions: {
            globals: {
                driver: 'readonly',
                browser: 'readonly',
                $: 'readonly',
                $$: 'readonly',
                expect: 'readonly',
            },
        },
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: { console: 'readonly', process: 'readonly', fetch: 'readonly' },
        },
    },
);
