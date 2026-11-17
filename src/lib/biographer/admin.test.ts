jest.mock('google-auth-library', () => ({ OAuth2Client: jest.fn() }));
jest.mock('@/db', () => ({ db: {} }));
import { commandSchema } from './admin';
const id = '5e835659-c804-4bdf-9ec4-d4d60bf86661';
describe('Biographer Admin wire contract', () => {
  const actor = { email: 'admin@example.com' };
  it('accepts the Admin additionalSeconds command and rejects invalid allowance', () => {
    const input = {
      projectId: id,
      requestId: id,
      reason: 'Pilot extension',
      additionalSeconds: 600,
    };
    expect(commandSchema.parse({ operation: 'extendAllowance', actor, input }).operation).toBe(
      'extendAllowance',
    );
    expect(
      commandSchema.safeParse({
        operation: 'extendAllowance',
        actor,
        input: { ...input, additionalSeconds: 36001 },
      }).success,
    ).toBe(false);
    expect(
      commandSchema.safeParse({
        operation: 'extendAllowance',
        actor,
        input: { ...input, additionalSeconds: undefined, seconds: 600 },
      }).success,
    ).toBe(false);
  });
  it('bounds list request size', () => {
    expect(
      commandSchema.safeParse({ operation: 'listProjects', actor, input: { limit: 20 } }).success,
    ).toBe(true);
    expect(
      commandSchema.safeParse({ operation: 'listProjects', actor, input: { limit: 1000 } }).success,
    ).toBe(false);
  });
});
