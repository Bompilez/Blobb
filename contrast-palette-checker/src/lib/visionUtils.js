import { getContrast, getReadableTextColor, hexToHSL, hexToRGB, hslToHex, rgbToHex } from "./colorUtils";

export const VISION_MODES = [
  { key: "protanopia", label: "Protanopia", description: "Reduced red sensitivity" },
  { key: "deuteranopia", label: "Deuteranopia", description: "Reduced green sensitivity" },
  { key: "tritanopia", label: "Tritanopia", description: "Reduced blue sensitivity" },
  { key: "grayscale", label: "Grayscale", description: "No hue information" },
];

export function simulateColorVision(hex, mode) {
  const { r, g, b } = hexToRGB(hex);

  if (mode === "grayscale") {
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    return rgbToHex({ r: gray, g: gray, b: gray });
  }

  const matrices = {
    protanopia: [
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758],
    ],
    deuteranopia: [
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ],
    tritanopia: [
      [0.95, 0.05, 0],
      [0, 0.433, 0.567],
      [0, 0.475, 0.525],
    ],
  };
  const matrix = matrices[mode];

  if (!matrix) {
    return hex;
  }

  return rgbToHex({
    r: r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2],
    g: r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2],
    b: r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2],
  });
}

export function getDarkModeSuggestion(hex) {
  const hsl = hexToHSL(hex);
  const saturation = Math.round(Math.max(18, Math.min(92, hsl.s * 0.82 + 8)));
  const lightness = hsl.l >= 58 ? Math.round(Math.max(18, 96 - hsl.l)) : Math.round(Math.min(72, 38 + (58 - hsl.l) * 0.55));

  return hslToHex(hsl.h, saturation, lightness);
}

export function getDarkModeSuggestions(colors, getColorName) {
  return colors.map((color, index) => {
    const darkColor = getDarkModeSuggestion(color);
    const textColor = getReadableTextColor(darkColor);

    return {
      name: getColorName(index),
      original: color,
      darkColor,
      textColor,
      contrast: getContrast(darkColor, textColor),
    };
  });
}
