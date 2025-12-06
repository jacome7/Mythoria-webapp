import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [
    typography,
    // Pass DaisyUI options directly so we can drop the properties base (emits @property)
    daisyui({ themes: ['autumn'], exclude: ['properties'] }),
  ],
} satisfies Config;

export default config;
