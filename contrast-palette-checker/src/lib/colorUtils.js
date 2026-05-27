const NAMED_COLOR_HEX = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  lime: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  aqua: "#00ffff",
  magenta: "#ff00ff",
  fuchsia: "#ff00ff",
  silver: "#c0c0c0",
  gray: "#808080",
  grey: "#808080",
  maroon: "#800000",
  olive: "#808000",
  green: "#008000",
  purple: "#800080",
  teal: "#008080",
  navy: "#000080",
  orange: "#ffa500",
  pink: "#ffc0cb",
  brown: "#a52a2a",
  gold: "#ffd700",
  coral: "#ff7f50",
  tomato: "#ff6347",
  salmon: "#fa8072",
  crimson: "#dc143c",
  violet: "#ee82ee",
  indigo: "#4b0082",
  lavender: "#e6e6fa",
  plum: "#dda0dd",
  turquoise: "#40e0d0",
  beige: "#f5f5dc",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  tan: "#d2b48c",
  chocolate: "#d2691e",
  transparent: "#ffffff",
  rebeccapurple: "#663399",
};

export function isValidHex(input) {
  const hex = input.startsWith("#") ? input.slice(1) : input;

  if (hex.length !== 3 && hex.length !== 6) {
    return false;
  }

  const split = hex.toLowerCase().split("");
  const allowedCharacters = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

  for (let i = 0; i < split.length; i += 1) {
    if (!allowedCharacters.includes(split[i])) {
      return false;
    }
  }

  return true;
}

export function normalizeHex(input) {
  const cleanedInput = input.trim().toLowerCase();
  const parsedColor = parseColorToHex(cleanedInput);

  if (parsedColor) {
    return parsedColor;
  }

  return cleanedInput.startsWith("#") ? cleanedInput : `#${cleanedInput}`;
}

function clampChannel(value) {
  return Math.round(Math.min(Math.max(Number(value), 0), 255));
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value), 0), 100);
}

function parseHue(value) {
  const raw = value.trim().toLowerCase();
  const parsed = Number.parseFloat(raw);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (raw.endsWith("turn")) {
    return ((parsed * 360) % 360 + 360) % 360;
  }

  if (raw.endsWith("rad")) {
    return (((parsed * 180) / Math.PI) % 360 + 360) % 360;
  }

  return (parsed % 360 + 360) % 360;
}

function parseRgbChannel(value) {
  const raw = value.trim();

  if (raw.endsWith("%")) {
    const percent = clampPercent(Number.parseFloat(raw));
    return clampChannel((percent / 100) * 255);
  }

  return clampChannel(Number.parseFloat(raw));
}

export function parseColorToHex(input) {
  if (typeof input !== "string") {
    return null;
  }

  const cleanedInput = input.trim().toLowerCase();

  if (!cleanedInput) {
    return null;
  }

  if (isValidHex(cleanedInput)) {
    const hex = cleanedInput.startsWith("#") ? cleanedInput : `#${cleanedInput}`;

    if (hex.length === 4) {
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }

    return hex;
  }

  if (NAMED_COLOR_HEX[cleanedInput]) {
    return NAMED_COLOR_HEX[cleanedInput];
  }

  const rgbMatch = cleanedInput.match(/^rgba?\((.+)\)$/);
  if (rgbMatch) {
    const channels = rgbMatch[1].replace(/\s*\/\s*[^, ]+$/, "").split(/[,\s]+/).filter(Boolean);

    if (channels.length >= 3) {
      return rgbToHex({
        r: parseRgbChannel(channels[0]),
        g: parseRgbChannel(channels[1]),
        b: parseRgbChannel(channels[2]),
      });
    }
  }

  const hslMatch = cleanedInput.match(/^hsla?\((.+)\)$/);
  if (hslMatch) {
    const channels = hslMatch[1].replace(/\s*\/\s*[^, ]+$/, "").split(/[,\s]+/).filter(Boolean);
    const hue = channels.length >= 3 ? parseHue(channels[0]) : null;

    if (hue !== null) {
      return hslToHex(hue, clampPercent(Number.parseFloat(channels[1])), clampPercent(Number.parseFloat(channels[2])));
    }
  }

  return null;
}

export function hexToRGB(color) {
  const hex = color.slice(1);

  let r;
  let g;
  let b;

  if (hex.length === 3) {
    r = hex[0] + hex[0];
    g = hex[1] + hex[1];
    b = hex[2] + hex[2];
  } else {
    r = hex.substring(0, 2);
    g = hex.substring(2, 4);
    b = hex.substring(4, 6);
  }

  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
  };
}

function getLuminance(rgb) {
  const { r, g, b } = rgb;

  function transform(channel) {
    const value = channel / 255;

    if (value <= 0.03928) {
      return value / 12.92;
    }

    return ((value + 0.055) / 1.055) ** 2.4;
  }

  return transform(r) * 0.2126 + transform(g) * 0.7152 + transform(b) * 0.0722;
}

export function getContrast(colorA, colorB) {
  const lumA = getLuminance(hexToRGB(colorA));
  const lumB = getLuminance(hexToRGB(colorB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(hex) {
  if (!isValidHex(hex)) {
    return "#111827";
  }

  return getLuminance(hexToRGB(hex)) > 0.45 ? "#111827" : "#ffffff";
}

export function rgbToHex(rgb) {
  function toHex(channel) {
    return Math.round(Math.min(Math.max(channel, 0), 255))
      .toString(16)
      .padStart(2, "0");
  }

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToHSL(color) {
  const { r, g, b } = hexToRGB(color);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(lightness * 100) };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) {
    hue += 360;
  }

  return { h: Math.round(hue), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

export function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex({
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  });
}
