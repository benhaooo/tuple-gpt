import type { Citation } from './types'

export function formatCitationLabel(citation: Citation) {
  return citation.title || formatCitationHost(citation.url)
}

export function formatCitationKey(citation: Citation) {
  return `${citation.url}:${citation.startIndex ?? ''}:${citation.endIndex ?? ''}:${
    citation.title ?? ''
  }`
}

export function uniqueCitations(citations: Citation[]) {
  const seen = new Set<string>()
  return citations.filter(citation => {
    const key = formatCitationKey(citation)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatCitationHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
