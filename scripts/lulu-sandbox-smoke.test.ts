/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function run(mode: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    [
      join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      join(process.cwd(), 'scripts', 'lulu-sandbox-smoke.ts'),
      ...args,
    ],
    {
      timeout: 15_000,
      windowsHide: true,
      encoding: 'utf8',
      env: {
        ...process.env,
        LULU_PRINT_ENVIRONMENT: mode,
        LULU_PRINT_CLIENT_KEY: '',
        LULU_PRINT_CLIENT_SECRET: '',
      },
    },
  );
}

describe('sandbox lifecycle CLI guards', () => {
  it('validates a fixture offline by default', () => {
    const check = run('production');
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('No network requests or supplier jobs');
  });
  it.each(['production', ''])('refuses execution with mode %p before using credentials', (mode) => {
    const check = run(mode, '--run-sandbox');
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('SANDBOX_REQUIRED');
  });
  it('requires an explicitly supplied fixture in sandbox', () => {
    const check = run('sandbox', '--run-sandbox');
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('SYNTHETIC_FIXTURE_REQUIRED');
  });
  it('validates a square hardcover dry-run fixture offline', async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'lulu-square-smoke-'));
    try {
      const fixturePath = join(dir, 'square.json');
      writeFileSync(
        fixturePath,
        JSON.stringify({
          synthetic: true,
          product: 'square_hardcover',
          binding: 'hardcover',
          pageCount: 33,
          copies: 1,
          shippingAddress: {
            name: 'Synthetic Test',
            street1: 'Test Street 1',
            city: 'Porto',
            postcode: '4000-001',
            country_code: 'PT',
            phone_number: '+351210000000',
            email: 'synthetic@example.org',
          },
          interiorUrl: 'https://example.org/synthetic/interior.pdf',
          coverUrl: 'https://example.org/synthetic/cover.pdf',
        }),
      );
      const check = run('sandbox', '--dry-run', '--fixture', fixturePath);
      expect(check.status).toBe(0);
      expect(check.stdout).toContain('square_hardcover 33 pages');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
