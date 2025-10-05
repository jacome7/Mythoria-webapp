// Lightweight shim: lib.json has been removed. Keep API shape to avoid wide refactors.
// t() will return the key or perform simple parameter interpolation.

export async function getLibTranslations(locale?: string) {
  return {
    locale: locale || 'en-US',
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        key,
      );
    },
  };
}

export function createLibTranslations(
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  return { t };
}
