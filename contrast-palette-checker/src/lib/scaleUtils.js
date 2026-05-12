import { getContrast, hexToRGB, rgbToHex } from "./colorUtils";

const SCALE_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const SCALE_CHROMA_FACTORS = [0.16, 0.26, 0.42, 0.62, 0.82, 1, 0.92, 0.78, 0.62, 0.46, 0.32];

function srgbToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel) {
  const value = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  return value * 255;
}

function hexToOklch(color) {
  const { r, g, b } = hexToRGB(color);
  const red = srgbToLinear(r);
  const green = srgbToLinear(g);
  const blue = srgbToLinear(b);

  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const oklabB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.sqrt(a * a + oklabB * oklabB);
  let hue = (Math.atan2(oklabB, a) * 180) / Math.PI;

  if (hue < 0) {
    hue += 360;
  }

  return { lightness, chroma, hue };
}

function oklchToRgb(lightness, chroma, hue) {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function isRgbInGamut(rgb) {
  return rgb.r >= 0 && rgb.r <= 255 && rgb.g >= 0 && rgb.g <= 255 && rgb.b >= 0 && rgb.b <= 255;
}

function oklchToHexInGamut(lightness, chroma, hue) {
  let adjustedChroma = chroma;
  let rgb = oklchToRgb(lightness, adjustedChroma, hue);

  for (let i = 0; i < 24 && !isRgbInGamut(rgb); i += 1) {
    adjustedChroma *= 0.88;
    rgb = oklchToRgb(lightness, adjustedChroma, hue);
  }

  return rgbToHex(rgb);
}

function interpolateLightness(baseLightness, index) {
  if (index < 5) {
    const distanceFromBase = 5 - index;
    return baseLightness + (0.98 - baseLightness) * (distanceFromBase / 5);
  }

  if (index === 5) {
    return baseLightness;
  }

  const distanceFromBase = index - 5;
  return baseLightness - (baseLightness - 0.14) * (distanceFromBase / 5);
}

export function getColorScale(baseColor) {
  const baseOklch = hexToOklch(baseColor);

  return SCALE_STEPS.map((step, index) => {
    if (step === "500") {
      return { step, hex: baseColor };
    }

    const lightness = Math.min(Math.max(interpolateLightness(baseOklch.lightness, index), 0.08), 0.99);
    const chroma = baseOklch.chroma * SCALE_CHROMA_FACTORS[index];
    const hex = oklchToHexInGamut(lightness, chroma, baseOklch.hue);

    return { step, hex };
  });
}

export function getReadableTextColor(color) {
  return getContrast(color, "#ffffff") >= getContrast(color, "#111827") ? "#ffffff" : "#111827";
}

export function getScaleName(name) {
  return name.trim() || "Primary";
}

function getCssVariableName(name) {
  return (
    getScaleName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "primary"
  );
}

export function getScaleCssVariables(scaleColors, name) {
  const variableName = getCssVariableName(name);
  const variableLines = scaleColors.map((color) => `  --${variableName}-${color.step}: ${color.hex};`);

  return [":root {", ...variableLines, "}"].join("\n");
}
