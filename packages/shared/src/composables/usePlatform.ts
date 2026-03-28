import { provide, inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { PlatformConfig } from '../types/platform'

const PLATFORM_KEY: InjectionKey<PlatformConfig> = Symbol('platform-config')

export function providePlatform(config: PlatformConfig) {
  provide(PLATFORM_KEY, config)
}

export function usePlatform(): PlatformConfig {
  return inject(PLATFORM_KEY, {})
}
