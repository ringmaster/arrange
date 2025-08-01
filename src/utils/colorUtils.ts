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

/**
 * Generate a variation of a color in the same color family
 * @param baseColor The original color in hex format
 * @param variation The variation number (starts from 0 for the base color)
 * @param totalVariations Total number of variations to generate
 * @returns A hex color string
 */
export const getColorVariation = (
  baseColor: string,
  variation: number = 0,
  totalVariations: number = 5
): string => {
  // Return the original color for variation 0
  if (variation === 0) return baseColor;

  const [r, g, b] = hexToRgb(baseColor);

  // Calculate HSL values from RGB
  const hsl = rgbToHsl(r, g, b);

  // For each variation, adjust the lightness and saturation
  // We want to maintain the same hue but create variations
  const adjustedHsl = { ...hsl };

  // For odd variations, increase lightness (lighter)
  // For even variations, decrease lightness (darker)
  const isEven = variation % 2 === 0;

  // Calculate the adjustment amount based on the variation number
  // Higher variations have more extreme adjustments
  const adjustmentFactor = Math.min(0.3, (variation / totalVariations) * 0.4);

  if (isEven) {
    // Even variations: darker with increased saturation
    adjustedHsl.l = Math.max(0.1, hsl.l - adjustmentFactor);
    adjustedHsl.s = Math.min(1, hsl.s + 0.1);
  } else {
    // Odd variations: lighter with decreased saturation
    adjustedHsl.l = Math.min(0.9, hsl.l + adjustmentFactor);
    adjustedHsl.s = Math.max(0.1, hsl.s - 0.05);
  }

  // Convert back to RGB
  const newRgb = hslToRgb(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);

  // Convert to hex
  return rgbToHex(newRgb[0], newRgb[1], newRgb[2]);
};

/**
 * Convert RGB to HSL
 * Returns an object with h, s, l properties (h in [0,1], s in [0,1], l in [0,1])
 */
const rgbToHsl = (r: number, g: number, b: number): { h: number, s: number, l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return { h, s, l };
};

/**
 * Convert HSL to RGB
 * Returns an array [r, g, b] with values in [0, 255]
 */
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
};

/**
 * Convert RGB components to hex color string
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
