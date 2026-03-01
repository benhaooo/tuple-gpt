import { defineConfig, presetAttributify, presetWind4, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'
import presetAnimations from "unocss-preset-animations";
import presetShadcn from "unocss-preset-shadcn";

export default defineConfig({
  presets: [
    presetAttributify({}),
    presetWind4({
      preflights: {
        property: {
          parent: false,
        },
      },
    }),
    presetAnimations(),
    presetShadcn({
      color: "neutral",
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
