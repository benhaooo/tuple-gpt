/**
 * 防抖和节流 Composables
 * 提供函数防抖和节流的响应式封装
 */

import { ref, watch, onUnmounted } from 'vue';
import { debounce, throttle } from '@/utils/commonUtils';
import { createLogger } from '@/utils/logger';
import type { UseDebounceReturn, UseThrottleReturn } from './types';

const logger = createLogger('UseDebounceThrottle');

/**
 * 防抖 Composable
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
  immediate: boolean = false
): UseDebounceReturn<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  /**
   * 防抖函数
   */
  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (immediate && !timeoutId) {
      fn(...args);
      return;
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
      }
      timeoutId = null;
    }, delay);
  }) as T;

  /**
   * 取消防抖
   */
  const cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };

  /**
   * 立即执行
   */
  const flush = (): void => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  // 组件卸载时清理
  onUnmounted(() => {
    cancel();
  });

  return {
    debouncedFn,
    cancel,
    flush,
  };
}

/**
 * 节流 Composable
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300
): UseThrottleReturn<T> {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * 节流函数
   */
  const throttledFn = ((...args: Parameters<T>) => {
    lastArgs = args;

    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      timeoutId = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttledFn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  }) as T;

  /**
   * 取消节流
   */
  const cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    lastArgs = null;
  };

  // 组件卸载时清理
  onUnmounted(() => {
    cancel();
  });

  return {
    throttledFn,
    cancel,
  };
}

/**
 * 响应式防抖值 Composable
 */
export function useDebouncedRef<T>(value: T, delay: number = 300) {
  const debouncedValue = ref<T>(value);
  const originalValue = ref<T>(value);

  const { debouncedFn } = useDebounce((newValue: T) => {
    debouncedValue.value = newValue;
  }, delay);

  watch(
    () => originalValue.value,
    (newValue) => {
      debouncedFn(newValue);
    },
    { immediate: true }
  );

  const setValue = (newValue: T): void => {
    originalValue.value = newValue;
  };

  return {
    value: debouncedValue,
    originalValue,
    setValue,
  };
}

/**
 * 响应式节流值 Composable
 */
export function useThrottledRef<T>(value: T, limit: number = 300) {
  const throttledValue = ref<T>(value);
  const originalValue = ref<T>(value);

  const { throttledFn } = useThrottle((newValue: T) => {
    throttledValue.value = newValue;
  }, limit);

  watch(
    () => originalValue.value,
    (newValue) => {
      throttledFn(newValue);
    },
    { immediate: true }
  );

  const setValue = (newValue: T): void => {
    originalValue.value = newValue;
  };

  return {
    value: throttledValue,
    originalValue,
    setValue,
  };
}

/**
 * 搜索防抖 Composable
 */
export function useSearchDebounce<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const query = ref('');
  const results = ref<T[]>([]);
  const isSearching = ref(false);
  const error = ref<string | null>(null);

  const { debouncedFn } = useDebounce(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      results.value = [];
      return;
    }

    isSearching.value = true;
    error.value = null;

    try {
      logger.debug('Performing debounced search', { query: searchQuery });
      const searchResults = await searchFn(searchQuery);
      results.value = searchResults;
      logger.debug('Search completed', { 
        query: searchQuery, 
        resultCount: searchResults.length 
      });
    } catch (err) {
      error.value = err.message || 'Search failed';
      logger.error('Search error', err);
    } finally {
      isSearching.value = false;
    }
  }, delay);

  watch(query, (newQuery) => {
    debouncedFn(newQuery);
  });

  const setQuery = (newQuery: string): void => {
    query.value = newQuery;
  };

  const clearSearch = (): void => {
    query.value = '';
    results.value = [];
    error.value = null;
  };

  return {
    query,
    results,
    isSearching,
    error,
    setQuery,
    clearSearch,
  };
}
