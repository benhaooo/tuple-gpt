import { createPinia } from 'pinia'
import { useAssistantsStore } from './modules/assistants'
import { useMessagesStore } from './modules/messages'
import { createIndexedDBPersistence } from './storage'

const pinia = createPinia()
pinia.use(createIndexedDBPersistence())

export default pinia

export {
  useAssistantsStore,
  useMessagesStore
}
