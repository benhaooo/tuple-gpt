const FALLBACK_AVATAR_INITIAL = '?'

// Stable string-to-color mapping constants.
const HASH_MULTIPLIER = 131
const LCG_MULTIPLIER = 1664525
const LCG_INCREMENT = 1013904223
const RGB_CHANNEL_BASE = 64
const RGB_CHANNEL_RANGE = 128

// Standard sRGB / WCAG contrast constants.
const RGB_MAX = 255
const SRGB_LINEAR_THRESHOLD = 0.03928
const SRGB_LINEAR_DIVISOR = 12.92
const SRGB_GAMMA_OFFSET = 0.055
const SRGB_GAMMA_SCALE = 1.055
const SRGB_GAMMA_EXPONENT = 2.4
const RED_LUMINANCE_WEIGHT = 0.2126
const GREEN_LUMINANCE_WEIGHT = 0.7152
const BLUE_LUMINANCE_WEIGHT = 0.0722

// UI tuning for readable generated initials.
const DARK_TEXT_LUMINANCE_THRESHOLD = 0.48
const DARK_TEXT_COLOR = '#0f172a'
const LIGHT_TEXT_COLOR = '#ffffff'

export function getAvatarInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return FALLBACK_AVATAR_INITIAL

  const first =
    trimmed.match(/\p{L}\p{M}*|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u)?.[0] ??
    Array.from(trimmed)[0] ??
    FALLBACK_AVATAR_INITIAL

  return first.toLocaleUpperCase()
}

export function generateAvatarColor(name: string): string {
  const source = name.trim() || FALLBACK_AVATAR_INITIAL
  let seed = 0

  for (const char of Array.from(source)) {
    seed = (seed * HASH_MULTIPLIER + (char.codePointAt(0) ?? 0)) >>> 0
  }

  const next = () => {
    seed = (seed * LCG_MULTIPLIER + LCG_INCREMENT) >>> 0
    return seed
  }

  const r = RGB_CHANNEL_BASE + (next() % RGB_CHANNEL_RANGE)
  const g = RGB_CHANNEL_BASE + (next() % RGB_CHANNEL_RANGE)
  const b = RGB_CHANNEL_BASE + (next() % RGB_CHANNEL_RANGE)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function toRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map(char => char + char)
          .join('')
      : normalized

  const int = Number.parseInt(value, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const normalize = (channel: number) => {
    const value = channel / RGB_MAX
    return value <= SRGB_LINEAR_THRESHOLD
      ? value / SRGB_LINEAR_DIVISOR
      : ((value + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA_EXPONENT
  }

  return (
    RED_LUMINANCE_WEIGHT * normalize(r) +
    GREEN_LUMINANCE_WEIGHT * normalize(g) +
    BLUE_LUMINANCE_WEIGHT * normalize(b)
  )
}

export function getAvatarForegroundColor(backgroundColor: string): string {
  const [r, g, b] = toRgb(backgroundColor)
  const luminance = relativeLuminance(r, g, b)
  return luminance > DARK_TEXT_LUMINANCE_THRESHOLD ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR
}
