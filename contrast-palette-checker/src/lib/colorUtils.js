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
  return cleanedInput.startsWith("#") ? cleanedInput : `#${cleanedInput}`;
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
