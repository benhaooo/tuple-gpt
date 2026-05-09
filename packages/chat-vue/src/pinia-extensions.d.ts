import 'pinia'

declare module 'pinia' {
  export interface DefineStoreOptionsInPlugin<Id, S, G, A> {
    chromePersist?: boolean | Record<string, unknown>
  }

  export interface DefineSetupStoreOptions<Id, S, G, A> {
    chromePersist?: boolean | Record<string, unknown>
  }
}
