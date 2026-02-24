import 'pinia'

interface ChromePersistConfig {
  key?: string
  sync?: boolean
  pick?: string[]
  debounce?: number
}

declare module 'pinia' {
  export interface DefineStoreOptionsInPlugin<Id, S, G, A> {
    chromePersist?: boolean | ChromePersistConfig
  }

  export interface DefineSetupStoreOptions<Id, S, G, A> {
    chromePersist?: boolean | ChromePersistConfig
  }
}
