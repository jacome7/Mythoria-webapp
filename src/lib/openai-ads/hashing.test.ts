/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import {
  hashForOpenAiBrowser,
  normalizeEmail,
  normalizeExternalId,
  normalizeForOpenAi,
  normalizeName,
  normalizePhone,
  sha256HexBrowser,
} from './hashing';
import { hashForOpenAi, sha256HexNode } from './hashing.server';

describe('OpenAI Ads identifier normalization', () => {
  it('normalizes emails with trim + lowercase', () => {
    expect(normalizeEmail('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
    expect(normalizeEmail('   ')).toBeUndefined();
    expect(normalizeEmail('not-an-email')).toBeUndefined();
    expect(normalizeEmail(null)).toBeUndefined();
  });

  it('normalizes phones to bare digits (doc vector)', () => {
    expect(normalizePhone('+1 (415) 555-2671')).toBe('14155552671');
    expect(normalizePhone('00351 912 345 678')).toBe('351912345678');
    expect(normalizePhone('+351.912.345.678')).toBe('351912345678');
  });

  it('drops phones outside 8-15 digits', () => {
    expect(normalizePhone('12345')).toBeUndefined();
    expect(normalizePhone('000 1234567')).toBeUndefined();
    expect(normalizePhone('1234567890123456')).toBeUndefined();
    expect(normalizePhone('')).toBeUndefined();
    expect(normalizePhone(undefined)).toBeUndefined();
  });

  it('only trims external ids', () => {
    expect(normalizeExternalId('  user_2AbC  ')).toBe('user_2AbC');
    expect(normalizeExternalId('  ')).toBeUndefined();
  });

  it('normalizes names (doc vectors) and keeps accents', () => {
    expect(normalizeName('Mary Jane')).toBe('maryjane');
    expect(normalizeName("O'Connor")).toBe('oconnor');
    expect(normalizeName('José')).toBe('josé');
    expect(normalizeName(' Anne-Marie  D. ')).toBe('annemaried');
    expect(normalizeName('Müller_[x]~')).toBe('müllerx');
    expect(normalizeName(" .-' ")).toBeUndefined();
  });

  it('dispatches by kind', () => {
    expect(normalizeForOpenAi('email', ' A@B.co ')).toBe('a@b.co');
    expect(normalizeForOpenAi('phone', '+1 (415) 555-2671')).toBe('14155552671');
    expect(normalizeForOpenAi('external_id', ' Id ')).toBe('Id');
    expect(normalizeForOpenAi('name', 'Mary Jane')).toBe('maryjane');
  });
});

describe('OpenAI Ads SHA-256 hashing', () => {
  it('matches the known SHA-256 vector', () => {
    expect(sha256HexNode('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('hashes the normalized email deterministically as 64-char lowercase hex', () => {
    const hash = hashForOpenAi('email', '  Jane.Doe@Example.COM ');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashForOpenAi('email', 'jane.doe@example.com'));
    expect(hash).toBe(createHash('sha256').update('jane.doe@example.com').digest('hex'));
  });

  it('hashes UTF-8 bytes and preserves external id case', () => {
    expect(hashForOpenAi('name', 'José')).toBe(
      createHash('sha256').update(Buffer.from('josé', 'utf8')).digest('hex'),
    );
    expect(hashForOpenAi('external_id', 'user_A')).not.toBe(hashForOpenAi('external_id', 'user_a'));
  });

  it('returns undefined for missing or invalid values', () => {
    expect(hashForOpenAi('phone', '123')).toBeUndefined();
    expect(hashForOpenAi('email', null)).toBeUndefined();
    expect(hashForOpenAi('name', undefined)).toBeUndefined();
  });

  it('produces the same hash in the browser and on the server', async () => {
    await expect(sha256HexBrowser('josé')).resolves.toBe(sha256HexNode('josé'));
    await expect(hashForOpenAiBrowser('email', ' Jane.Doe@Example.COM ')).resolves.toBe(
      hashForOpenAi('email', 'jane.doe@example.com'),
    );
    await expect(hashForOpenAiBrowser('phone', '+1 (415) 555-2671')).resolves.toBe(
      sha256HexNode('14155552671'),
    );
    await expect(hashForOpenAiBrowser('phone', '123')).resolves.toBeUndefined();
  });
});
