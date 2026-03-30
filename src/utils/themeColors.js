/**
 * src/utils/themeColors.js
 * 
 * HOW TO QUICKLY MAKE ANY SCREEN THEME-AWARE:
 * 
 * Replace this pattern in any screen:
 *   import { COLORS } from '../utils/theme';
 * 
 * With:
 *   import { useColors } from '../utils/themeColors';
 *   // then inside component:
 *   const COLORS = useColors();
 * 
 * That's it! All COLORS.xxx references will automatically
 * use the correct dark/light color based on user setting.
 */

import { useTheme } from '../context/ThemeContext';

/**
 * Drop-in replacement for COLORS constant.
 * Returns theme-aware colors.
 * 
 * Usage:
 *   const COLORS = useColors();
 */
export const useColors = () => {
  const { colors } = useTheme();
  return colors;
};

export default useColors;