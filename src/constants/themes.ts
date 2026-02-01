/**
 * --------------------------------------------------------------------------
 *                            THEME DEFINITIONS
 * --------------------------------------------------------------------------
 *
 * This file contains the color definitions for different themes in the application.
 *
 * @source The color palette is based on the `Slate` theme from shadcn/vue.
 * @see https://www.shadcn-vue.com/docs/theming.html
 *
 * ## How to extend:
 * 1. To add a new color, first add its name to the `Theme` interface below.
 * 2. Define the HSL color values for both 'light' and 'dark' modes in the `themes` object.
 *    - The format should be a string: "H S% L%" (e.g., "240 10% 3.9%").
 * 3. Go to `twind.config.ts` to map this new color to a utility class.
 */

export type ThemeName = 'light' | 'dark';

/**
 * Defines the semantic color names used throughout the application.
 * Each key corresponds to a CSS variable `--{key}`.
 */
export interface Theme {
  // Base colors
  background: string; // Body background
  foreground: string; // Body text
  
  // Card-like components
  card: string; // Background for cards, popovers, etc.
  'card-foreground': string; // Text color for cards
  
  // Popovers
  popover: string; // Background for popovers
  'popover-foreground': string; // Text color for popovers

  // Primary interactive elements
  primary: string; // Buttons, active states
  'primary-foreground': string; // Text on primary elements

  // Secondary interactive elements
  secondary: string; // Less prominent buttons
  'secondary-foreground': string; // Text on secondary elements

  // Muted elements
  muted: string; // Less prominent content, like subtitles or disabled states
  'muted-foreground': string; // Text on muted elements

  // Accent elements (e.g., for hover states)
  accent: string; // Hover backgrounds
  'accent-foreground': string; // Text on accent elements

  // Destructive actions
  destructive: string; // Destructive buttons (e.g., delete)
  'destructive-foreground': string; // Text on destructive elements
  
  // Other UI elements
  border: string; // Borders and dividers
  input: string; // Input borders
  ring: string; // Focus rings

  // Soft-colored backgrounds for content sections
  'primary-soft': string;
  'primary-soft-foreground': string;
  'secondary-soft': string;
  'secondary-soft-foreground': string;
  'accent-soft': string;
  'accent-soft-foreground': string;
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    background: '0 0% 100%',
    foreground: '240 10% 3.9%',
    card: '0 0% 100%',
    'card-foreground': '240 10% 3.9%',
    popover: '0 0% 100%',
    'popover-foreground': '240 10% 3.9%',
    primary: '240 5.9% 10%',
    'primary-foreground': '0 0% 98%',
    secondary: '240 4.8% 95.9%',
    'secondary-foreground': '240 5.9% 10%',
    muted: '240 4.8% 95.9%',
    'muted-foreground': '240 3.8% 46.1%',
    accent: '240 4.8% 95.9%',
    'accent-foreground': '240 5.9% 10%',
    destructive: '0 84.2% 60.2%',
    'destructive-foreground': '0 0% 98%',
    border: '240 5.9% 90%',
    input: '240 5.9% 90%',
    ring: '240 5% 64.9%',
    // Soft-color variants
    'primary-soft': '240 100% 97%', // A very light blue
    'primary-soft-foreground': '240 100% 25%',
    'secondary-soft': '145 95% 96%', // A very light green
    'secondary-soft-foreground': '145 95% 20%',
    'accent-soft': '45 100% 96%', // A very light yellow
    'accent-soft-foreground': '45 100% 20%',
  },
  dark: {
    background: '240 10% 3.9%',
    foreground: '0 0% 98%',
    card: '240 10% 3.9%',
    'card-foreground': '0 0% 98%',
    popover: '240 10% 3.9%',
    'popover-foreground': '0 0% 98%',
    primary: '0 0% 98%',
    'primary-foreground': '240 5.9% 10%',
    secondary: '240 3.7% 15.9%',
    'secondary-foreground': '0 0% 98%',
    muted: '240 3.7% 15.9%',
    'muted-foreground': '240 5% 64.9%',
    accent: '240 3.7% 15.9%',
    'accent-foreground': '0 0% 98%',
    destructive: '0 62.8% 30.6%',
    'destructive-foreground': '0 0% 98%',
    border: '240 3.7% 15.9%',
    input: '240 3.7% 15.9%',
    ring: '240 4.9% 83.9%',
    // Soft-color variants
    'primary-soft': '240 15% 10%',
    'primary-soft-foreground': '240 15% 90%',
    'secondary-soft': '145 25% 9%',
    'secondary-soft-foreground': '145 25% 88%',
    'accent-soft': '45 30% 10%',
    'accent-soft-foreground': '45 30% 88%',
  },
};

export const themeNames = Object.keys(themes);

export const defaultTheme: ThemeName = 'light'; 