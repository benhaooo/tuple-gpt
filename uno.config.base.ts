import { defineConfig, presetAttributify, presetWind3, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'
import presetAnimations from "unocss-preset-animations";
import { presetShadcn } from "unocss-preset-shadcn";

export default defineConfig({
  presets: [
    presetAttributify({}),
    presetWind3(),
    presetAnimations(),
    presetShadcn({
      color: "zinc",
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
