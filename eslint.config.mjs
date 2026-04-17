import { dirname } from 'path';
import { fileURLToPath } from 'url';
import nextPlugin from 'eslint-config-next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  {
    // Ignore generated and external artifacts to reduce noise and speed up linting.
    ignores: [
      '.next/**',
      'public/**',
      'logs/**',
      'package/dist/**',
      'drizzle/**/*.sql',
      // Auto-generated TypeScript helper / metadata files
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
      // Common codegen output conventions (add more here as tooling is introduced)
      '**/__generated__/**',
      '**/*.generated.*',
      '**/*.gen.*',
    ],
  },
  ...nextPlugin,
  {
    // Override rules from the React Compiler ESLint plugin that are bundled with
    // eslint-config-next 16.2+. These rules enforce React Compiler semantics which
    // this project does not use yet. Disable them to avoid false positives on
    // well-established React patterns (useEffect + async fetch, ref mutation
    // outside the render tree, manual memoization).
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];

export default eslintConfig;
