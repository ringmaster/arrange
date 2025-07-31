// colorUtils.ts
/**
 * Utility functions for working with colors in the Music Arrangement Analyzer
 */

// Predefined palette of contrasting colors
const COLOR_PALETTE = [
  '#4285F4', // blue
  '#EA4335', // red
  '#34A853', // green
  '#FBBC05', // yellow
  '#8F44AD', // purple
  '#F39C12', // orange
  '#16A085', // teal
  '#D81B60', // pink
  '#607D8B', // blue-grey
  '#FF5722', // deep orange
  '#00BCD4', // cyan
  '#009688', // green-teal
];

/**
 * Generates a color that is not already in use by other instruments
 * Falls back to random generation if all palette colors are used
 */
export const generateUniqueColor = (existingColors: string[] = []): string => {
  // First try to find an unused color from the palette
  const availableColor = COLOR_PALETTE.find(color =>
    !existingColors.includes(color)
  );

  if (availableColor) {
    return availableColor;
  }

  // If all palette colors are used, generate a random color
  // that is sufficiently different from existing ones
  let newColor: string;
  let attempts = 0;
  const MAX_ATTEMPTS = 20;

  do {
    newColor = generateRandomColor();
    attempts++;

    // If we've tried too many times, just use the last generated color
    if (attempts > MAX_ATTEMPTS) {
      break;
    }
  } while (!isColorDistinct(newColor, existingColors) && existingColors.length > 0);

  return newColor;
};

/**
 * Generates a random hex color
 */
const generateRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';

  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }

  return color;
};

/**
 * Converts hex color to RGB components
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    return [0, 0, 0];
  }

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
};

/**
 * Calculates color distance using a simple Euclidean distance in RGB space
 * Higher values mean colors are more distinct from each other
 */
const colorDistance = (color1: string, color2: string): number => {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);

  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

/**
 * Determines if a color is sufficiently distinct from a list of existing colors
 */
const isColorDistinct = (color: string, existingColors: string[]): boolean => {
  // Minimum distance threshold for colors to be considered distinct
  const MIN_DISTANCE = 100;

  return existingColors.every(existingColor =>
    colorDistance(color, existingColor) > MIN_DISTANCE
  );
};

/**
 * Generates a contrasting text color (black or white) based on background color
 */
export const getContrastTextColor = (backgroundColor: string): string => {
  const [r, g, b] = hexToRgb(backgroundColor);

  // Calculate relative luminance using the formula from WCAG 2.0
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Use white text for dark backgrounds, black text for light backgrounds
  return luminance > 128 ? '#000000' : '#FFFFFF';
};
