import type { MessageAttachment } from '../types/chat'

export function getBinaryAttachments(attachments?: MessageAttachment[]): MessageAttachment[] {
  return attachments?.filter(a =>
    (a.category === 'image' || a.category === 'pdf') && a.base64Data,
  ) ?? []
}
