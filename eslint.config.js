import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import mocha from 'eslint-plugin-mocha';
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
        // WebdriverIO injects driver, browser, $ and $$ as globals; Mocha provides describe/it.
        files: ['mobile/**/*.ts'],
        plugins: { mocha },
        languageOptions: {
            globals: {
                ...globals.mocha,
                driver: 'readonly',
                browser: 'readonly',
                $: 'readonly',
                $$: 'readonly',
            },
        },
        rules: {
            'mocha/no-exclusive-tests': 'error',
            'mocha/no-identical-title': 'error',
            'mocha/no-pending-tests': 'warn',
        },
    },
    {
        files: ['**/*.{js,mjs}'],
        languageOptions: { globals: globals.node },
    },
);
