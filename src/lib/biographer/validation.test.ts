import { projectInput, segmentInput, turnInput, turnPatch, biographerEnabled } from './validation';
const uuid = '5e835659-c804-4bdf-9ec4-d4d60bf86661';
describe('Biographer boundary validation', () => {
  it('requires explicit consent and a supported locale', () => {
    expect(projectInput.safeParse({ locale: 'pt-PT' }).success).toBe(false);
    expect(projectInput.safeParse({ locale: 'pt-BR', consent: true }).success).toBe(false);
    expect(projectInput.parse({ locale: 'pt-PT', consent: true }).locale).toBe('pt-PT');
  });
  it('rejects client authority over ownership, quotas or assistant testimony', () => {
    expect(
      projectInput.safeParse({ locale: 'en-US', consent: true, allowanceSeconds: 999999 }).success,
    ).toBe(false);
    expect(turnInput.safeParse({ id: uuid, role: 'assistant', text: 'invented' }).success).toBe(
      false,
    );
    expect(turnPatch.safeParse({ originalText: 'rewritten' }).success).toBe(false);
  });
  it('bounds recovery segments and enforces integrity envelope', () => {
    const value = {
      id: uuid,
      turnId: uuid,
      sequence: 0,
      contentType: 'audio/pcm;rate=16000',
      data: 'YQ==',
      sha256: 'a'.repeat(64),
      durationMs: 1000,
    };
    expect(segmentInput.safeParse(value).success).toBe(true);
    expect(segmentInput.safeParse({ ...value, sequence: -1 }).success).toBe(false);
    expect(segmentInput.safeParse({ ...value, durationMs: 999999 }).success).toBe(false);
    expect(segmentInput.safeParse({ ...value, sha256: 'unchecked' }).success).toBe(false);
  });
  it('defaults disabled and only accepts explicit enablement', () => {
    const previous = process.env.BIOGRAPHER_ENABLED;
    delete process.env.BIOGRAPHER_ENABLED;
    expect(biographerEnabled()).toBe(false);
    process.env.BIOGRAPHER_ENABLED = '1';
    expect(biographerEnabled()).toBe(false);
    process.env.BIOGRAPHER_ENABLED = 'true';
    expect(biographerEnabled()).toBe(true);
    if (previous === undefined) delete process.env.BIOGRAPHER_ENABLED;
    else process.env.BIOGRAPHER_ENABLED = previous;
  });
});
