export type StoryGenerationFeatures = {
  ebook: boolean;
  printed: boolean;
  audiobook: boolean;
};

export function normalizeGenerationFeatures(
  features?: Partial<StoryGenerationFeatures>,
): StoryGenerationFeatures {
  return {
    ebook: features?.ebook ?? true,
    printed: features?.printed ?? false,
    audiobook: features?.audiobook ?? false,
  };
}

export function hasAnyGenerationFeature(features: StoryGenerationFeatures): boolean {
  return features.ebook || features.printed || features.audiobook;
}

export function getCreditServiceLabel(serviceCode: string): string {
  if (serviceCode === 'eBookGeneration') return 'Digital book generation';
  if (serviceCode === 'printOrder') return 'Printed book order';
  if (serviceCode === 'audioBookGeneration') return 'Audiobook generation';
  return serviceCode;
}
