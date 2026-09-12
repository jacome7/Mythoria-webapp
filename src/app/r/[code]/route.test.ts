import { NextRequest } from 'next/server';
import { GET } from './route';

const originalEnv = process.env;
afterEach(() => {
  process.env = originalEnv;
});

it.each(['http://localhost:3000', 'http://192.168.1.10:3000', 'https://example.ngrok-free.app'])(
  'keeps the visitor origin %s even when Next uses the bind address',
  async (origin) => {
    process.env = {
      ...originalEnv,
      REFERRAL_PROGRAM_ENABLED: 'true',
      REFERRAL_CAPTURE_ENABLED: 'true',
    };
    const request = new NextRequest('http://0.0.0.0:3000/r/RODRI', {
      headers: { 'accept-language': 'pt-PT' },
    });
    const response = await GET(request, { params: Promise.resolve({ code: 'RODRI' }) });
    const location = response.headers.get('location')!;
    expect(response.status).toBe(302);
    expect(location).toBe('/pt-PT?referral=RODRI');
    expect(new URL(location, origin).origin).toBe(origin);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  },
);

it('preserves the locale cookie and omits attribution when capture is disabled', async () => {
  process.env = { ...originalEnv, REFERRAL_CAPTURE_ENABLED: 'false' };
  const request = new NextRequest('http://0.0.0.0:3000/r/RODRI', {
    headers: { cookie: 'NEXT_LOCALE=de-DE', 'accept-language': 'pt-PT' },
  });
  const response = await GET(request, { params: Promise.resolve({ code: 'RODRI' }) });
  expect(response.headers.get('location')).toBe('/de-DE');
});
