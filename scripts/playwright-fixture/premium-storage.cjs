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
      import { readFile, mkdir, writeFile } from 'node:fs/promises';
      import { dirname, join } from 'node:path';
      export * from ${real};
      export class Storage extends CloudStorage {
        bucket(name, ...options) {
          if (name === 'story-input-fixture') {
            return {
              name,
              file(key) {
                if (!/^[0-9a-f-]+[/]inputs[/][0-9a-f-]+[.](jpg|webm|wav|mp3|m4a|ogg)$/i.test(key)) {
                  throw new Error('Invalid story input fixture path');
                }
                const path = join(process.env.PLAYWRIGHT_PREMIUM_STORAGE_DIR, key);
                return {
                  async save(bytes, options) {
                    if (options.preconditionOpts?.ifGenerationMatch !== 0) throw new Error('Missing create precondition');
                    await mkdir(dirname(path), { recursive: true });
                    try {
                      await writeFile(path, bytes, { flag: 'wx' });
                    } catch (error) {
                      if (error.code === 'EEXIST') throw Object.assign(new Error('Already exists'), { code: 412 });
                      throw error;
                    }
                  },
                };
              },
            };
          }
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
