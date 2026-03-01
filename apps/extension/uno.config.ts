import { mergeConfigs } from 'unocss'
import baseConfig from '../../uno.config.base'

export default mergeConfigs([baseConfig, {
  theme: {
    colors: {
      border: 'oklch(var(--border))',
      input: 'oklch(var(--input))',
      ring: 'oklch(var(--ring))',
      background: 'oklch(var(--background))',
      foreground: 'oklch(var(--foreground))',
      primary: {
        DEFAULT: 'oklch(var(--primary))',
        foreground: 'oklch(var(--primary-foreground))',
        soft: 'hsl(var(--primary-soft))',
        'soft-foreground': 'hsl(var(--primary-soft-foreground))',
      },
      secondary: {
        DEFAULT: 'oklch(var(--secondary))',
        foreground: 'oklch(var(--secondary-foreground))',
        soft: 'hsl(var(--secondary-soft))',
        'soft-foreground': 'hsl(var(--secondary-soft-foreground))',
      },
      destructive: {
        DEFAULT: 'oklch(var(--destructive))',
        foreground: 'oklch(var(--destructive-foreground))',
      },
      muted: {
        DEFAULT: 'oklch(var(--muted))',
        foreground: 'oklch(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'oklch(var(--accent))',
        foreground: 'oklch(var(--accent-foreground))',
        soft: 'hsl(var(--accent-soft))',
        'soft-foreground': 'hsl(var(--accent-soft-foreground))',
      },
      popover: {
        DEFAULT: 'oklch(var(--popover))',
        foreground: 'oklch(var(--popover-foreground))',
      },
      card: {
        DEFAULT: 'oklch(var(--card))',
        foreground: 'oklch(var(--card-foreground))',
      },
      'surface': 'oklch(var(--card))',
      'text-primary': 'oklch(var(--foreground))',
      'text-secondary': 'oklch(var(--muted-foreground))',
    },
  },
}])
