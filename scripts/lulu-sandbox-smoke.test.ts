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
        LULU_PRINT_SECRET_VERSION: '',
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
});
