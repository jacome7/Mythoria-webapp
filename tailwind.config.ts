import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [
    require("daisyui")
  ],
} satisfies Config;

// DaisyUI configuration
(config as any).daisyui = {
  themes: ["autumn", "light", "dark"],
  //darkTheme: "light",
  base: true,
  styled: true,
  utils: true,
  prefix: "",
  logs: true,
  themeRoot: ":root",
};

export default config;
