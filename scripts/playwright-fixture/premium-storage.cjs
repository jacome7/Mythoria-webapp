const { registerHooks } = require('node:module');

if (process.env.PLAYWRIGHT_CLERK_FIXTURE !== '1' || !process.env.PLAYWRIGHT_PREMIUM_STORAGE_DIR) {
  throw new Error('Disposable Playwright premium storage fixture required');
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (specifier !== '@google-cloud/storage' || context.conditions.includes('require')) {
      return resolved;
    }
    const real = JSON.stringify(resolved.url);
    const source = `
      import { Storage as CloudStorage } from ${real};
      import { readFile } from 'node:fs/promises';
      import { join } from 'node:path';
      export * from ${real};
      export class Storage extends CloudStorage {
        bucket(name, ...options) {
          if (name !== 'premium-book-fixture-no-storage') return super.bucket(name, ...options);
          return {
            file(key, { generation }) {
              if (generation !== 101 || !/^[\\w/-]+\\.(json|png|jpg)$/.test(key)) {
                throw new Error('Invalid fixture storage request');
              }
              return {
                download: async () => [await readFile(join(process.env.PLAYWRIGHT_PREMIUM_STORAGE_DIR, key))],
              };
            },
          };
        }
      }
    `;
    return {
      url: 'data:text/javascript;base64,' + Buffer.from(source).toString('base64'),
      format: 'module',
      shortCircuit: true,
    };
  },
});
