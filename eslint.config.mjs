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
];

export default eslintConfig;
