import { mergeConfigs } from 'unocss'
import baseConfig from '../../uno.config.base'

export default mergeConfigs([baseConfig, {
  theme: {
    colors: {
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
        soft: 'hsl(var(--primary-soft))',
        'soft-foreground': 'hsl(var(--primary-soft-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
        soft: 'hsl(var(--secondary-soft))',
        'soft-foreground': 'hsl(var(--secondary-soft-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
        soft: 'hsl(var(--accent-soft))',
        'soft-foreground': 'hsl(var(--accent-soft-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      'surface': 'hsl(var(--card))',
      'text-primary': 'hsl(var(--foreground))',
      'text-secondary': 'hsl(var(--muted-foreground))',
    },
  },
}])
