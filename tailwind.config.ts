import { type Config } from "tailwindcss";
import tailwindPresetMantine from "tailwind-preset-mantine";
import { fontFamily } from "tailwindcss/defaultTheme";
import { breakpoints, colors } from "./src/app/theme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
    },
  },
  presets: [tailwindPresetMantine({
    mantineBreakpoints: breakpoints,
    mantineColors: colors,
  })],
  plugins: [],
} satisfies Config;
