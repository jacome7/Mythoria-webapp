// Published editions pin these values. Keep this registry identical in SGW and WebApp.
export const premiumOpeningColors = [
  '#f9efd9', // warm cream
  '#f9e5d9', // peach
  '#f7e2e8', // rose
  '#eee6f6', // lilac
  '#e2edf8', // sky
  '#e1f0eb', // sea glass
  '#e8efdc', // sage
  '#f6efcc', // butter yellow
] as const;

export const premiumOpeningMotifs = [
  'paper_boat',
  'leaf',
  'star',
  'crescent_moon',
  'shell',
  'feather',
  'key',
  'flower',
  'mountain',
  'kite',
  'book',
  'heart',
] as const;

export const openingInk = '#243735';
export const motifInk = '#a33529';
export const motifAccent = '#285957';

// Each drawing occupies the same 64 by 52 view box. The boat follows the Phase 0 sample.
export const openingMotifPaths: Record<
  (typeof premiumOpeningMotifs)[number],
  readonly [string, string]
> = {
  paper_boat: [
    'M3 24H61L51 37H16ZM16 24 33 6 48 24M33 7 34 24',
    'M3 45C10 41 16 49 23 45M27 49C34 45 40 53 47 49',
  ],
  leaf: [
    'M12 36C11 16 32 10 54 8 51 27 42 43 20 40M14 43C21 34 32 26 44 18',
    'M25 32 25 23M32 27 41 28',
  ],
  star: [
    'M32 5 39 19 55 21 43 32 46 47 32 40 18 47 21 32 9 21 25 19Z',
    'M7 10 12 13M53 12 57 9M54 41 59 43',
  ],
  crescent_moon: [
    'M41 6C22 5 12 18 15 32S35 52 49 39C35 40 25 30 27 19 28 13 33 8 41 6Z',
    'M50 13V21M46 17H54M55 25V29M53 27H57',
  ],
  shell: [
    'M29 42 10 28C6 23 9 16 15 16 15 10 21 8 26 10 30 3 38 4 41 11 47 9 52 13 51 18 58 20 59 26 54 30L36 42Z',
    'M31 38 16 19M32 37 25 13M34 37 39 14M36 38 49 21M24 45Q32 48 40 45',
  ],
  feather: [
    'M13 44C18 36 14 21 28 11 34 6 46 5 51 6 49 18 46 27 37 31 29 36 24 36 18 37M12 46 41 16',
    'M26 31 25 24M30 27 38 26',
  ],
  key: [
    'M32 20C32 11 23 6 16 10 7 14 8 26 18 29 23 30 27 28 29 25L48 43 53 38 49 34 46 36 43 33 46 30 42 26 39 29Z',
    'M18 16C21 13 26 17 23 20 20 23 15 20 18 16Z',
  ],
  flower: [
    'M31 16C20 4 14 15 22 21 9 20 13 34 24 29 19 41 32 44 34 32 40 43 51 34 42 27 55 28 55 15 42 19 45 6 33 6 31 16ZM29 21C34 16 40 24 35 27 30 31 25 26 29 21Z',
    'M33 33Q35 41 32 48M34 42Q42 35 47 37 42 44 34 44',
  ],
  mountain: [
    'M5 41 25 13 35 28 44 15 60 41ZM17 24 23 26 26 21 29 23M39 22 43 24 46 21',
    'M14 46Q27 43 34 46M41 45H53',
  ],
  kite: [
    'M32 4 49 18 33 37 15 18ZM32 5 33 36M16 18H48',
    'M33 37C28 44 43 42 34 49M35 42 31 39M35 42 39 39',
  ],
  book: [
    'M6 12Q20 9 32 17 44 9 58 12V40Q43 37 32 44 21 37 6 40ZM32 17V43',
    'M12 20Q20 19 26 23M39 23Q46 19 52 20',
  ],
  heart: [
    'M32 43C25 37 10 27 11 17 12 6 24 5 32 16 40 5 52 6 53 17 54 27 39 38 32 43Z',
    'M43 13Q48 12 49 18',
  ],
};
