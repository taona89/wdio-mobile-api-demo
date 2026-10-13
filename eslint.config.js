import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
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
    {
        files: ['**/*.ts'],
        extends: [tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            // Each file is checked against its nearest tsconfig (mobile/ or api/).
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            // The classic WebdriverIO bug: a command without `await` races the next step.
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        // WebdriverIO injects driver, browser, $, $$ and expect as globals. Cucumber contributes
        // no globals of its own: Given/When/Then are imported in each step file.
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
        files: ['**/*.{js,mjs}'],
        languageOptions: { globals: globals.node },
    },
);
