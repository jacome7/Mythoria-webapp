jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/db/services/biographer', () => ({
  BiographerError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
}));
import { internal, owner } from './http';
import { getCurrentAuthor } from '@/lib/auth';
describe('Biographer authentication', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    jest.clearAllMocks();
  });
  it('fails closed before login or configuration', async () => {
    delete process.env.BIOGRAPHER_ENABLED;
    await expect(owner()).rejects.toMatchObject({ status: 404 });
    expect(getCurrentAuthor).not.toHaveBeenCalled();
  });
  it('requires independent internal credentials', () => {
    process.env.BIOGRAPHER_ENABLED = 'true';
    delete process.env.BIOGRAPHER_INTERNAL_API_KEY;
    expect(() => internal(new Request('https://app.test'))).toThrow();
    process.env.BIOGRAPHER_INTERNAL_API_KEY = 'internal-secret';
    expect(() =>
      internal(new Request('https://app.test', { headers: { 'x-api-key': 'internal-secret' } })),
    ).not.toThrow();
    expect(() =>
      internal(new Request('https://app.test', { headers: { 'x-api-key': 'wrong' } })),
    ).toThrow();
  });
});
