const { generateKeyPairSync, sign } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const issued = Math.floor(Date.now() / 1000);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = [
  encode({ alg: 'RS256', typ: 'JWT', cat: 'cl_B7d4PD111AAA', kid: 'ins_fixture' }),
  encode({
    iss: 'https://clerk.fixture.invalid',
    sub: 'user_isolated_fixture',
    sid: 'sess_fixture',
    iat: issued,
    nbf: issued - 1,
    exp: issued + 3600,
    azp: `http://localhost:${process.env.PORT}`,
    sts: 'active',
  }),
].join('.');
writeFileSync(
  'clerk-public.jwk',
  JSON.stringify({ ...publicKey.export({ format: 'jwk' }), kid: 'ins_fixture' }),
);
writeFileSync('clerk-public.pem', publicKey.export({ format: 'pem', type: 'spki' }));
writeFileSync(
  'clerk-session.txt',
  unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url'),
);
