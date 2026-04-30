import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { AttachmentCategory, MessageAttachment } from '@tuple-gpt/chat-core'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'csv',
  'js',
  'ts',
  'jsx',
  'tsx',
  'py',
  'html',
  'css',
  'xml',
  'yaml',
  'yml',
  'toml',
  'sh',
  'bat',
  'log',
  'sql',
  'java',
  'go',
  'rs',
  'c',
  'cpp',
  'h',
  'hpp',
  'rb',
  'php',
  'swift',
  'kt',
  'vue',
  'svelte',
  'scss',
  'less',
  'ini',
  'conf',
  'env',
  'gitignore',
])

const MAX_BINARY_SIZE = 30 * 1024 * 1024 // 30MB
const MAX_TEXT_SIZE = 1 * 1024 * 1024 // 1MB
const MAX_FILE_COUNT = 10

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}

function categorizeFile(file: File): AttachmentCategory | null {
  const ext = getExtension(file.name)
  if (file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.has(ext)) return 'text'
  return null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip "data:...;base64," prefix
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// Module-level shared state
const attachments = ref<MessageAttachment[]>([])

export function useFileAttachments() {
  async function addFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (attachments.value.length >= MAX_FILE_COUNT) break

      const category = categorizeFile(file)
      if (!category) continue

      const maxSize = category === 'text' ? MAX_TEXT_SIZE : MAX_BINARY_SIZE
      if (file.size > maxSize) continue

      const attachment: MessageAttachment = {
        id: uuidv4(),
        type: 'file',
        title: file.name,
        category,
        mimeType: file.type || `application/${getExtension(file.name)}`,
        fileSize: file.size,
      }

      if (category === 'text') {
        attachment.extractedContent = await readFileAsText(file)
      } else {
        attachment.base64Data = await readFileAsBase64(file)
      }

      attachments.value.push(attachment)
    }
  }

  function removeFile(id: string | number) {
    attachments.value = attachments.value.filter(a => a.id !== id)
  }

  function clear() {
    attachments.value = []
  }

  return {
    attachments,
    addFiles,
    removeFile,
    clear,
    formatFileSize,
  }
}
