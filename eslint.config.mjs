import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // --- Type rules: enforce the layered architecture ---
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:ui',
                'type:domain',
                'type:data-access',
                'type:types',
              ],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:domain', 'type:types'],
            },
            {
              // domain stays pure: types only, never data-access
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:types'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:types'],
            },
            {
              sourceTag: 'type:types',
              onlyDependOnLibsWithTags: [],
            },
            // --- Scope rules: keep feature areas from bleeding into each other ---
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: ['scope:prompts', 'scope:shared'],
            },
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:prompts',
              onlyDependOnLibsWithTags: ['scope:prompts', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
