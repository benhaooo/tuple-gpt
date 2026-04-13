import { marked, type Tokens } from 'marked'
import hljs from 'highlight.js'

let configured = false

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function configureMarkdown(): void {
  if (configured) return
  configured = true

  marked.use({
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
        const displayLang = lang || 'text'
        const highlighted = hljs.highlight(text, { language }).value

        return (
          '<pre>'
          + `<div class="code-header">`
          + `<span class="code-lang">${escapeHtml(displayLang)}</span>`
          + `<button class="code-copy" type="button">Copy</button>`
          + `</div>`
          + `<code class="hljs language-${escapeHtml(language)}">${highlighted}</code>`
          + '</pre>'
        )
      },
    },
  })
}

export function parseMarkdown(content: string): string {
  if (!content) return ''
  configureMarkdown()
  return marked.parse(content, { async: false }) as string
}

// WeakMap to track containers that already have event listeners bound
const boundContainers = new WeakMap<HTMLElement, Map<Element, () => void>>()

export function setupCodeCopyButtons(container: HTMLElement): void {
  if (boundContainers.has(container)) {
    cleanupCodeCopyButtons(container)
  }

  const handlers = new Map<Element, () => void>()
  const buttons = container.querySelectorAll('.code-copy')

  buttons.forEach((btn) => {
    const handler = () => {
      const pre = btn.closest('pre')
      const codeEl = pre?.querySelector('code')
      if (!codeEl) return

      const text = codeEl.textContent ?? ''
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!'
        setTimeout(() => {
          btn.textContent = 'Copy'
        }, 2000)
      })
    }

    btn.addEventListener('click', handler)
    handlers.set(btn, handler)
  })

  boundContainers.set(container, handlers)
}

export function cleanupCodeCopyButtons(container: HTMLElement): void {
  const handlers = boundContainers.get(container)
  if (!handlers) return

  handlers.forEach((handler, btn) => {
    btn.removeEventListener('click', handler)
  })

  boundContainers.delete(container)
}
