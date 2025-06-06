import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin(),
  logout: handleLogout(),
  callback: handleCallback(),
  profile: handleProfile()
});

export const POST = GET;
