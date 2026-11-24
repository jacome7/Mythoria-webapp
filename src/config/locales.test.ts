/** @jest-environment node */

const defaults = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

afterEach(() => jest.restoreAllMocks());

it.each([
  [undefined, defaults],
  ['', defaults],
  [' ,  , ', defaults],
  [' pt-PT, ,en-US,', ['pt-PT', 'en-US']],
] as const)('resolves the supported locales for %p', async (setting, expected) => {
  const env = { ...process.env };
  if (setting === undefined) delete env.NEXT_PUBLIC_SUPPORTED_LOCALES;
  else env.NEXT_PUBLIC_SUPPORTED_LOCALES = setting;
  jest.replaceProperty(process, 'env', env);

  await jest.isolateModulesAsync(async () => {
    const { SUPPORTED_LOCALES } = await import('./locales');
    expect(SUPPORTED_LOCALES).toEqual(expected);
  });
});
