import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [typography, daisyui],
  // @ts-expect-error - DaisyUI adds its own types at runtime only
  daisyui: {
    themes: ['autumn'],
  },
} satisfies Config;

export default config;
