import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { themes, defaultTheme, ThemeName } from '@/constants/themes'

/**
 * Manages the dynamic application of theme variables.
 * @param getTargetElement - A function that returns the element to which theme variables will be applied. Defaults to document.documentElement.
 */
export function useThemeManager(getTargetElement = () => document.documentElement) {
  const settingsStore = useSettingsStore()

  const applyTheme = (themeName: ThemeName) => {
    const theme = themes[themeName] || themes[defaultTheme];

    if (!theme) {
      console.error(`Theme "${themeName}" not found.`);
      return;
    }

    const element = getTargetElement();
    if (!element) return;

    // Clear previously set theme variables
    // A bit brute-force, but effective for this use case.
    // It assumes we are the only ones setting variables with these names.
    if (element.style.length > 0) {
      const styleKeys = Object.keys(themes[defaultTheme]);
      styleKeys.forEach(key => element.style.removeProperty(`--${key}`));
    }

    // Apply new variables from the theme object
    Object.entries(theme).forEach(([key, value]) => {
      element.style.setProperty(`--${key}`, value);
    });
  };


  watch(
    () => settingsStore.settings.theme,
    (newTheme) => {
      if (newTheme) {
        applyTheme(newTheme as ThemeName);
      }
    },
    { immediate: true }
  );
} 