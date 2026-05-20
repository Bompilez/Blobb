import { useEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { getContrast, getReadableTextColor, hexToHSL, hexToRGB, hslToHex, isValidHex, normalizeHex, rgbToHex } from "./lib/colorUtils";
import { getRouteFromPath, PAGE_META, setMetaContent } from "./lib/routeMeta";
import FaqPage from "./pages/FaqPage";
import "./styles/index.css";

const DEFAULT_COLORS = [];
const DEFAULT_COLOR_NAMES = [];
const PALETTE_STORAGE_KEY = "blobb.palette.v1";
const THEME_STORAGE_KEY = "blobb.theme.v1";
const COLOR_MAP_HUE_STEPS = 18;
const COLOR_MAP_LIGHTNESS_STEPS = [94, 84, 74, 64, 54, 44, 34, 24, 14];

function mixWithWhiteChannel(channel, t) {
  return Math.round(channel + (255 - channel) * t);
}

function mixWithBlackChannel(channel, t) {
  return Math.round(channel * (1 - t));
}

function getStepStops(stepCount) {
  if (stepCount <= 0) {
    return [];
  }

  // Always use 20% increments towards white/black to match the target palette behavior.
  const stops = [0.2, 0.4, 0.6, 0.8];
  return stops.slice(0, stepCount);
}

function generateTints(hex, count) {
  if (!isValidHex(hex)) {
    return [];
  }

  // With 20% increments we can generate at most:
  // 4 darker + base + 4 lighter = 9 total.
  const safeCount = Math.max(2, Math.min(9, Number(count) || 5));
  const { r, g, b } = hexToRGB(hex);

  // Generate a scale around the base color:
  // darker steps (towards black) on the left, base in the middle, lighter steps (towards white) on the right.
  const leftSteps = Math.floor((safeCount - 1) / 2);
  const rightSteps = safeCount - 1 - leftSteps;
  const darkStops = getStepStops(leftSteps);
  const lightStops = getStepStops(rightSteps);

  const items = [];

  // Darkest first.
  for (let i = darkStops.length - 1; i >= 0; i--) {
    const t = darkStops[i];
    const shaded = rgbToHex({
      r: mixWithBlackChannel(r, t),
      g: mixWithBlackChannel(g, t),
      b: mixWithBlackChannel(b, t),
    });
    items.push({ label: `-${Math.round(t * 100)}%`, t: -t, hex: shaded });
  }

  items.push({ label: "Base", t: 0, hex });

  for (let i = 0; i < lightStops.length; i++) {
    const t = lightStops[i];
    const tinted = rgbToHex({
      r: mixWithWhiteChannel(r, t),
      g: mixWithWhiteChannel(g, t),
      b: mixWithWhiteChannel(b, t),
    });
    items.push({ label: `+${Math.round(t * 100)}%`, t, hex: tinted });
  }

  return items;
}

function slugifyVariableBase(input) {
  const raw = (input || "").toString().trim().toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug || "scale";
}

function getHueColorName(hue) {
  if (hue < 12 || hue >= 348) return "Red";
  if (hue < 24) return "Coral";
  if (hue < 42) return "Orange";
  if (hue < 58) return "Amber";
  if (hue < 72) return "Yellow";
  if (hue < 92) return "Lime";
  if (hue < 150) return "Green";
  if (hue < 178) return "Teal";
  if (hue < 196) return "Cyan";
  if (hue < 214) return "Sky";
  if (hue < 248) return "Blue";
  if (hue < 266) return "Indigo";
  if (hue < 286) return "Violet";
  if (hue < 316) return "Purple";
  if (hue < 336) return "Pink";
  return "Rose";
}

function getGeneratedColorName(hex) {
  if (!isValidHex(hex)) {
    return "Color";
  }

  const { h, s, l } = hexToHSL(hex);

  if (s <= 8) {
    if (l <= 10) return "Black";
    if (l >= 96) return "White";
    if (l <= 26) return "Dark Gray";
    if (l >= 82) return "Light Gray";
    return "Gray";
  }

  const baseName = getHueColorName(h);
  let tone = "";

  if (l <= 18) {
    tone = "Dark";
  } else if (l >= 88) {
    tone = "Pale";
  } else if (s <= 32) {
    tone = "Muted";
  } else if (l >= 72) {
    tone = "Soft";
  } else if (s >= 78 && l >= 42 && l <= 62) {
    tone = "Bright";
  } else if (l <= 34) {
    tone = "Deep";
  }

  return tone ? `${tone} ${baseName}` : baseName;
}

function formatCssColorValue(hex, format) {
  if (format === "rgb") {
    const { r, g, b } = hexToRGB(hex);
    return `rgb(${r} ${g} ${b})`;
  }

  if (format === "hsl") {
    const { h, s, l } = hexToHSL(hex);
    return `hsl(${h} ${s}% ${l}%)`;
  }

  return hex;
}

function getScaleTokenRows(scaleColors, scaleStepTokens, format) {
  return scaleColors.map((item, index) => ({
    token: scaleStepTokens[index] ?? index,
    value: formatCssColorValue(item.hex, format),
  }));
}

function getJsScaleName(scaleVarBase) {
  const camelName = scaleVarBase.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
  const safeName = camelName.replace(/[^a-zA-Z0-9_$]/g, "");

  if (!safeName) {
    return "colorScale";
  }

  return /^[a-zA-Z_$]/.test(safeName) ? `${safeName}Scale` : `color${safeName}Scale`;
}

function pushUint16(bytes, value) {
  bytes.push((value >> 8) & 0xff, value & 0xff);
}

function pushUint32(bytes, value) {
  bytes.push((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
}

function pushFloat32(bytes, value) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, false);
  bytes.push(...new Uint8Array(buffer));
}

function pushAscii(bytes, value) {
  for (let i = 0; i < value.length; i++) {
    bytes.push(value.charCodeAt(i) & 0xff);
  }
}

function pushUtf16BeString(bytes, value) {
  pushUint16(bytes, value.length + 1);
  for (let i = 0; i < value.length; i++) {
    pushUint16(bytes, value.charCodeAt(i));
  }
  pushUint16(bytes, 0);
}

function buildAdobeSwatchExchangeFile(scaleColors, scaleStepTokens, scaleVarBase) {
  const bytes = [];
  pushAscii(bytes, "ASEF");
  pushUint16(bytes, 1);
  pushUint16(bytes, 0);
  pushUint32(bytes, scaleColors.length);

  scaleColors.forEach((item, index) => {
    const token = scaleStepTokens[index] ?? index;
    const colorName = `${scaleVarBase}-${token}`;
    const { r, g, b } = hexToRGB(item.hex);
    const block = [];

    pushUtf16BeString(block, colorName);
    pushAscii(block, "RGB ");
    pushFloat32(block, r / 255);
    pushFloat32(block, g / 255);
    pushFloat32(block, b / 255);
    pushUint16(block, 0);

    pushUint16(bytes, 0x0001);
    pushUint32(bytes, block.length);
    bytes.push(...block);
  });

  return new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
}

function buildScaleDeveloperSnippet(scaleColors, scaleStepTokens, scaleVarBase, format, type) {
  if (!scaleColors.length) {
    return "";
  }

  const tokenRows = getScaleTokenRows(scaleColors, scaleStepTokens, format);

  if (type === "js") {
    const lines = [`export const ${getJsScaleName(scaleVarBase)} = {`];
    tokenRows.forEach(({ token, value }) => {
      lines.push(`  ${JSON.stringify(token)}: ${JSON.stringify(value)},`);
    });
    lines.push("};");

    return `${lines.join("\n")}\n`;
  }

  if (type === "json") {
    const tokens = tokenRows.reduce((acc, { token, value }) => {
      acc[token] = { value };
      return acc;
    }, {});

    return `${JSON.stringify({ [scaleVarBase]: tokens }, null, 2)}\n`;
  }

  const lines = [":root {"];
  tokenRows.forEach(({ token, value }) => {
    lines.push(`  --${scaleVarBase}-${token}: ${value};`);
  });
  lines.push("}");

  return `${lines.join("\n")}\n`;
}

function buildPaletteDeveloperSnippet(colors, tokens, paletteName, format, type) {
  if (!colors.length) {
    return "";
  }

  const rows = colors.map((hex, index) => ({
    token: tokens[index] ?? `color-${index + 1}`,
    value: formatCssColorValue(hex, format),
  }));

  if (type === "json") {
    const entries = rows.reduce((acc, { token, value }) => {
      acc[token] = { value };
      return acc;
    }, {});

    return `${JSON.stringify({ [paletteName]: entries }, null, 2)}\n`;
  }

  const lines = [":root {"];
  rows.forEach(({ token, value }) => {
    lines.push(`  --${token}: ${value};`);
  });
  lines.push("}");

  return `${lines.join("\n")}\n`;
}

function uniqueTokens(tokens) {
  const seen = new Map();
  return tokens.map((token, index) => {
    const base = token || `color-${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

function loadPaletteFromStorage() {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const colors = Array.isArray(parsed.colors) ? parsed.colors : null;
    const colorNames = Array.isArray(parsed.colorNames) ? parsed.colorNames : null;
    if (!colors || !colorNames || colors.length !== colorNames.length) {
      return null;
    }

    const normalizedColors = colors
      .map((c) => (typeof c === "string" ? c.trim().toLowerCase() : ""))
      .filter((c) => isValidHex(c))
      .slice(0, 10);
    const normalizedNames = colorNames.slice(0, normalizedColors.length).map((n) => (typeof n === "string" ? n : ""));

    return { colors: normalizedColors, colorNames: normalizedNames };
  } catch {
    return null;
  }
}

function savePaletteToStorage(colors, colorNames) {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ colors, colorNames }));
  } catch {
    // ignore (storage disabled/quota/private mode)
  }
}

function loadThemePreference() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // ignore (storage disabled/private mode)
  }

  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

// ===== APP =====
function App() {
  const initialPalette = loadPaletteFromStorage();
  const [route, setRoute] = useState(getRouteFromPath);
  const [theme, setTheme] = useState(loadThemePreference);
  const [colorInput, setColorInput] = useState("");
  const [colorNameInput, setColorNameInput] = useState("");
  const [compareMode, setCompareMode] = useState("manual");
  const [colors, setColors] = useState(() => initialPalette?.colors ?? DEFAULT_COLORS);
  const [colorNames, setColorNames] = useState(() => initialPalette?.colorNames ?? DEFAULT_COLOR_NAMES);
  const [selectedColors, setSelectedColors] = useState(() => {
    const loaded = initialPalette?.colors ?? DEFAULT_COLORS;
    return loaded.length >= 2 ? [loaded[0], loaded[1]] : loaded.length === 1 ? [loaded[0]] : [];
  });
  const [activeSelectedIndex, setActiveSelectedIndex] = useState(0);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [editColorInput, setEditColorInput] = useState("");
  const [editColorNameInput, setEditColorNameInput] = useState("");
  const [copiedColor, setCopiedColor] = useState("");
  const [showPassingOnly, setShowPassingOnly] = useState(false);
  const [paletteCompareView, setPaletteCompareView] = useState("grid");
  const [paletteSnippetType, setPaletteSnippetType] = useState("css");
  const [paletteCssFormat, setPaletteCssFormat] = useState("hex");
  const [showPaletteExportModal, setShowPaletteExportModal] = useState(false);
  const [showCompareMoreMenu, setShowCompareMoreMenu] = useState(false);
  const compareMoreMenuRef = useRef(null);
  const [activeScalePanel, setActiveScalePanel] = useState("");
  const [scaleSnippetType, setScaleSnippetType] = useState("css");
  const [scaleCssFormat, setScaleCssFormat] = useState("hex");
  const [scaleCompareView, setScaleCompareView] = useState("grid");
  const [showScalePassingOnly, setShowScalePassingOnly] = useState(false);
  const [activeScaleCompareColor, setActiveScaleCompareColor] = useState("");
  const [adjustingSelectedIndex, setAdjustingSelectedIndex] = useState(null);
  const [adjustingDraftColor, setAdjustingDraftColor] = useState("");
  const [showAdjustInfo, setShowAdjustInfo] = useState(false);
  const [activePanelHelp, setActivePanelHelp] = useState("");
  const colorClickTimeoutRef = useRef(null);
  const copiedColorTimeoutRef = useRef(null);

  let selectedContrast = null;
  const activePaletteColor = selectedColors[0];
  const activePaletteColorIndex = colors.findIndex((color) => color === activePaletteColor);
  const activePaletteColorName = activePaletteColorIndex >= 0 ? getColorName(activePaletteColorIndex) : "";
  const editingColor = editingColorIndex !== null ? colors[editingColorIndex] : "";
  const cleanedColorInput = normalizeHex(colorInput);
  const canAddColor = colors.length < 10 && isValidHex(cleanedColorInput);
  const cleanedEditColorInput = normalizeHex(editColorInput);
  const canSaveEditColor = isValidHex(cleanedEditColorInput);
  const canComparePalette = colors.length >= 2;
  const isPaletteEmpty = colors.length === 0;
  const scaleBaseColor = typeof activePaletteColor === "string" ? activePaletteColor : "";
  const canGenerateScale = isValidHex(scaleBaseColor);
  const scaleColors = canGenerateScale ? generateTints(scaleBaseColor, 9) : [];
  const scaleVarBase = slugifyVariableBase(activePaletteColorName || "blobb");
  const scaleStepTokens = [900, 800, 700, 600, 500, 400, 300, 200, 100];
  const paletteTokens = uniqueTokens(colors.map((_, index) => slugifyVariableBase(getColorName(index))));
  const paletteDeveloperSnippet = buildPaletteDeveloperSnippet(colors, paletteTokens, "palette", paletteCssFormat, paletteSnippetType);
  const scaleCompareActiveColor = scaleColors.some((item) => item.hex === activeScaleCompareColor) ? activeScaleCompareColor : scaleBaseColor;
  const scaleCompareActiveIndex = scaleColors.findIndex((item) => item.hex === scaleCompareActiveColor);
  const scaleCompareActiveToken = scaleStepTokens[scaleCompareActiveIndex] ?? scaleCompareActiveIndex;
  const scaleDeveloperSnippet = canGenerateScale
    ? buildScaleDeveloperSnippet(scaleColors, scaleStepTokens, scaleVarBase, scaleCssFormat, scaleSnippetType)
    : "";
  const adjustingOriginalColor = adjustingSelectedIndex !== null ? selectedColors[adjustingSelectedIndex] : "";
  const adjustingColor = isValidHex(adjustingDraftColor) ? adjustingDraftColor : adjustingOriginalColor;
  const adjustingOppositeIndex = adjustingSelectedIndex === 0 ? 1 : 0;
  const adjustingOppositeColor = adjustingSelectedIndex !== null ? selectedColors[adjustingOppositeIndex] : "";
  const adjustingColorName =
    adjustingSelectedIndex !== null && colors.includes(adjustingOriginalColor)
      ? getColorName(colors.indexOf(adjustingOriginalColor))
      : getGeneratedColorName(adjustingColor);
  const adjustingOppositeName =
    adjustingSelectedIndex !== null && colors.includes(adjustingOppositeColor)
      ? getColorName(colors.indexOf(adjustingOppositeColor))
      : getGeneratedColorName(adjustingOppositeColor);
  const canAdjustSelectedColor = isValidHex(adjustingColor) && isValidHex(adjustingOppositeColor);
  const adjustingHsl = canAdjustSelectedColor ? hexToHSL(adjustingColor) : null;
  const adjustingContrast = canAdjustSelectedColor ? getContrast(adjustingColor, adjustingOppositeColor) : null;
  const adjustingRole = adjustingSelectedIndex === 0 ? "Background" : "Text";
  const currentMapHueIndex = adjustingHsl !== null ? Math.round(adjustingHsl.h / (360 / COLOR_MAP_HUE_STEPS)) % COLOR_MAP_HUE_STEPS : -1;
  const currentMapLightness = adjustingHsl
    ? COLOR_MAP_LIGHTNESS_STEPS.reduce((closest, lightness) =>
        Math.abs(lightness - adjustingHsl.l) < Math.abs(closest - adjustingHsl.l) ? lightness : closest,
      )
    : null;

  useEffect(() => {
    savePaletteToStorage(colors, colorNames);
  }, [colors, colorNames]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore (storage disabled/quota/private mode)
    }
  }, [theme]);

  useEffect(() => {
    function closeIfOutside(event) {
      if (!showCompareMoreMenu) {
        return;
      }

      const node = compareMoreMenuRef.current;
      if (node && !node.contains(event.target)) {
        setShowCompareMoreMenu(false);
      }
    }

    window.addEventListener("pointerdown", closeIfOutside);
    return () => window.removeEventListener("pointerdown", closeIfOutside);
  }, [showCompareMoreMenu]);

  useEffect(() => {
    function syncRoute() {
      setRoute(getRouteFromPath());
    }

    window.addEventListener("popstate", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    const meta = PAGE_META[route] ?? PAGE_META.contrast;
    const canonical = document.querySelector('link[rel="canonical"]');

    document.title = meta.title;
    setMetaContent('meta[name="description"]', meta.description);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', meta.description);
    setMetaContent('meta[property="og:url"]', meta.canonical);
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', meta.description);

    if (canonical) {
      canonical.setAttribute("href", meta.canonical);
    }
  }, [route]);

  useEffect(() => {
    if (colors.length === 0) {
      if (selectedColors.length > 0) {
        setSelectedColors([]);
      }
      setActiveSelectedIndex(0);
      return;
    }

    const validSelectedColors = selectedColors.filter((color) => colors.includes(color));

    if (route === "scale") {
      const nextColor = validSelectedColors[0] || colors[0];
      if (selectedColors.length !== 1 || selectedColors[0] !== nextColor) {
        setSelectedColors([nextColor]);
      }
      setActiveSelectedIndex(0);
      return;
    }

    if (route === "contrast" && compareMode === "manual") {
      const nextSelectedColors = [...validSelectedColors];
      for (const color of colors) {
        if (nextSelectedColors.length >= Math.min(colors.length, 2)) {
          break;
        }
        if (!nextSelectedColors.includes(color)) {
          nextSelectedColors.push(color);
        }
      }

      if (nextSelectedColors.length !== selectedColors.length || nextSelectedColors.some((color, index) => color !== selectedColors[index])) {
        setSelectedColors(nextSelectedColors);
      }

      if (nextSelectedColors.length === 2 && activeSelectedIndex > 1) {
        setActiveSelectedIndex(1);
      }
    }
  }, [activeSelectedIndex, colors, compareMode, route, selectedColors]);

  useEffect(() => {
    return () => {
      if (colorClickTimeoutRef.current) {
        clearTimeout(colorClickTimeoutRef.current);
      }
      if (copiedColorTimeoutRef.current) {
        clearTimeout(copiedColorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("modal-open", editingColorIndex !== null || adjustingSelectedIndex !== null);

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [editingColorIndex, adjustingSelectedIndex]);

  if (canComparePalette && selectedColors.length === 2 && selectedColors.every(isValidHex)) {
    const contrast = getContrast(selectedColors[0], selectedColors[1]);
    const contrastProgress = Math.min((contrast / 7) * 100, 100);

    const passesLargeAA = contrast >= 3;
    const passesLargeAAA = contrast >= 4.5;

    const passesSmallAA = contrast >= 4.5;
    const passesSmallAAA = contrast >= 7;
    const passesGraphicsUI = contrast >= 3;

    const contrastElements = generateContrastStatus(contrast);
    const uiButtonText = contrast >= 7 ? "Looks excellent" : contrast >= 4.5 ? "Looks good" : contrast >= 3 ? "Almost there" : "Can you even read me?";

    selectedContrast = {
      colorA: selectedColors[0],
      colorB: selectedColors[1],
      contrast,
      contrastProgress,
      contrastElements,
      uiButtonText,
      passesLargeAA,
      passesLargeAAA,
      passesSmallAA,
      passesSmallAAA,
      passesGraphicsUI,
    };
  }

  function generateContrastStatus(contrast) {
    let contrastStatus;
    let contrastClass;
    let contrastIcon;

    if (contrast >= 7.1) {
      contrastStatus = "Great";
      contrastClass = "color-great";
      contrastIcon = "verified_user";
    } else if (contrast >= 4.5) {
      contrastStatus = "Good";
      contrastClass = "color-good";
      contrastIcon = "check";
    } else if (contrast >= 3.1) {
      contrastStatus = "Ok";
      contrastClass = "color-ok";
      contrastIcon = "info";
    } else {
      contrastStatus = "Poor";
      contrastClass = "color-poor";
      contrastIcon = "close";
    }

    return { contrastStatus, contrastClass, contrastIcon };
  }

  function selectedColor(color) {
    if (route === "scale") {
      setSelectedColors([color]);
      setActiveSelectedIndex(0);
      return;
    }

    if (!canComparePalette) {
      setSelectedColors([color]);
      return;
    }

    if (compareMode === "palette") {
      setSelectedColors([color]);
      return;
    }

    if (selectedColors.length === 0) {
      setSelectedColors([color]);
      setActiveSelectedIndex(1);
    } else if (selectedColors.length === 1) {
      setSelectedColors([...selectedColors, color]);
      setActiveSelectedIndex(1);
    } else if (selectedColors.length === 2) {
      setSelectedColors(selectedColors.map((selectedColor, index) => (index === activeSelectedIndex ? color : selectedColor)));
    }
  }

  function selectedOppositeColor(color) {
    if (compareMode !== "manual" || selectedColors.length !== 2) {
      selectedColor(color);
      return;
    }

    const oppositeSelectedIndex = activeSelectedIndex === 0 ? 1 : 0;
    setSelectedColors(selectedColors.map((selectedColor, index) => (index === oppositeSelectedIndex ? color : selectedColor)));
  }

  function handlePaletteColorClick(color) {
    if (colorClickTimeoutRef.current) {
      clearTimeout(colorClickTimeoutRef.current);
    }

    colorClickTimeoutRef.current = setTimeout(() => {
      selectedColor(color);
      colorClickTimeoutRef.current = null;
    }, 180);
  }

  function handlePaletteColorDoubleClick(color) {
    if (colorClickTimeoutRef.current) {
      clearTimeout(colorClickTimeoutRef.current);
      colorClickTimeoutRef.current = null;
    }

    selectedOppositeColor(color);
  }

  function changeCompareMode(mode) {
    setCompareMode(mode);

    if (!canComparePalette) {
      return;
    }

    if (mode === "palette") {
      if (selectedColors.length === 2) {
        setSelectedColors([selectedColors[0]]);
      }
      return;
    }

    if (mode === "manual" && selectedColors.length === 1) {
      const nextColor = colors.find((color) => color !== selectedColors[0]) || colors[0];
      setSelectedColors([selectedColors[0], nextColor]);
      setActiveSelectedIndex(1);
    }
  }

  function deleteColor(deleteFromIndex) {
    setColors(colors.filter((_, i) => i !== deleteFromIndex));
    setColorNames(colorNames.filter((_, i) => i !== deleteFromIndex));
    setSelectedColors(selectedColors.filter((color) => color !== colors[deleteFromIndex]));
    setEditingColorIndex(null);
    setEditColorInput("");
    setEditColorNameInput("");
  }

  function addColor() {
    const input = cleanedColorInput;
    if (!isValidHex(input)) {
      return;
    }
    if (colors.length >= 10) {
      return;
    }

    const nextColors = [...colors, input];

    setColors(nextColors);
    setColorNames([...colorNames, colorNameInput.trim()]);
    setSelectedColors((currentSelectedColors) => {
      const validSelectedColors = currentSelectedColors.filter((color) => nextColors.includes(color));

      if (compareMode === "palette") {
        return validSelectedColors.length > 0 ? validSelectedColors.slice(0, 1) : [input];
      }

      if (nextColors.length < 2) {
        return validSelectedColors.length > 0 ? validSelectedColors : [input];
      }

      const fallbackColors = nextColors.filter((color) => !validSelectedColors.includes(color));
      return [...validSelectedColors, ...fallbackColors].slice(0, 2);
    });
    setColorInput("");
    setColorNameInput("");
  }

  function startEditColor(index) {
    setEditingColorIndex(index);
    setEditColorInput(colors[index]);
    setEditColorNameInput(colorNames[index] || "");
  }

  function cancelEditColor() {
    setEditingColorIndex(null);
    setEditColorInput("");
    setEditColorNameInput("");
  }

  function saveEditColor(index) {
    if (!canSaveEditColor) {
      return;
    }

    const oldColor = colors[index];
    const newColor = cleanedEditColorInput;

    setColors(colors.map((color, i) => (i === index ? newColor : color)));
    setColorNames(colorNames.map((name, i) => (i === index ? editColorNameInput.trim() : name)));
    setSelectedColors(selectedColors.map((color) => (color === oldColor ? newColor : color)));
    setEditingColorIndex(null);
    setEditColorInput("");
    setEditColorNameInput("");
  }

  function getColorName(index) {
    return colorNames[index]?.trim() || getGeneratedColorName(colors[index]);
  }

  function updateSelectedColor(selectedIndex, newColor) {
    const cleanedNewColor = normalizeHex(newColor);
    if (!isValidHex(cleanedNewColor)) {
      return;
    }

    const oldColor = selectedColors[selectedIndex];

    setSelectedColors(selectedColors.map((color, index) => (index === selectedIndex ? cleanedNewColor : color)));
    setColors(colors.map((color) => (color === oldColor ? cleanedNewColor : color)));
  }

  function updateAdjustingDraftHsl(partialHsl) {
    if (!isValidHex(adjustingColor)) {
      return;
    }

    const hsl = hexToHSL(adjustingColor);
    const nextHsl = { ...hsl, ...partialHsl };
    const newColor = hslToHex(Number(nextHsl.h), Number(nextHsl.s), Number(nextHsl.l));

    setAdjustingDraftColor(newColor);
  }

  function openColorAdjuster(selectedIndex, event) {
    event?.stopPropagation();

    if (!selectedColors[selectedIndex] || selectedColors.length !== 2) {
      return;
    }

    setActiveSelectedIndex(selectedIndex);
    setAdjustingDraftColor(selectedColors[selectedIndex]);
    setAdjustingSelectedIndex(selectedIndex);
  }

  function closeColorAdjuster() {
    setAdjustingSelectedIndex(null);
    setAdjustingDraftColor("");
    setShowAdjustInfo(false);
  }

  function updateAdjustingDraftHex(value) {
    const cleanedValue = normalizeHex(value);

    if (!isValidHex(cleanedValue)) {
      return;
    }

    setAdjustingDraftColor(cleanedValue);
  }

  function saveColorAdjustment() {
    if (adjustingSelectedIndex === null || !isValidHex(adjustingColor)) {
      return;
    }

    updateSelectedColor(adjustingSelectedIndex, adjustingColor);
    closeColorAdjuster();
  }

  function swapAdjustmentTarget() {
    if (adjustingSelectedIndex === null || !isValidHex(adjustingOppositeColor)) {
      return;
    }

    const nextIndex = adjustingOppositeIndex;
    setActiveSelectedIndex(nextIndex);
    setAdjustingSelectedIndex(nextIndex);
    setAdjustingDraftColor(adjustingOppositeColor);
  }

  function swapSelectedColors() {
    if (selectedColors.length !== 2) {
      return;
    }

    setSelectedColors([selectedColors[1], selectedColors[0]]);
    setActiveSelectedIndex(activeSelectedIndex === 0 ? 1 : 0);
  }

  async function copyColor(color, event) {
    event?.stopPropagation();

    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
    } catch {
      setCopiedColor("");
      return;
    }

    if (copiedColorTimeoutRef.current) {
      clearTimeout(copiedColorTimeoutRef.current);
    }

    copiedColorTimeoutRef.current = setTimeout(() => {
      setCopiedColor("");
      copiedColorTimeoutRef.current = null;
    }, 1200);
  }

  async function copyDeveloperSnippet() {
    if (!scaleDeveloperSnippet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(scaleDeveloperSnippet);
      setCopiedColor("scale-css");
    } catch {
      setCopiedColor("");
      return;
    }

    if (copiedColorTimeoutRef.current) {
      clearTimeout(copiedColorTimeoutRef.current);
    }

    copiedColorTimeoutRef.current = setTimeout(() => {
      setCopiedColor("");
      copiedColorTimeoutRef.current = null;
    }, 1200);
  }

  function downloadScaleAse() {
    if (!canGenerateScale || scaleColors.length === 0) {
      return;
    }

    const blob = buildAdobeSwatchExchangeFile(scaleColors, scaleStepTokens, scaleVarBase);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${scaleVarBase}-scale.ase`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCopiedColor("scale-ase");

    if (copiedColorTimeoutRef.current) {
      clearTimeout(copiedColorTimeoutRef.current);
    }

    copiedColorTimeoutRef.current = setTimeout(() => {
      setCopiedColor("");
      copiedColorTimeoutRef.current = null;
    }, 1200);
  }

  async function copyPaletteSnippet() {
    if (!paletteDeveloperSnippet) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paletteDeveloperSnippet);
      setCopiedColor("palette-snippet");
    } catch {
      setCopiedColor("");
      return;
    }

    if (copiedColorTimeoutRef.current) {
      clearTimeout(copiedColorTimeoutRef.current);
    }

    copiedColorTimeoutRef.current = setTimeout(() => {
      setCopiedColor("");
      copiedColorTimeoutRef.current = null;
    }, 1200);
  }

  function downloadPaletteAse() {
    if (!colors.length) {
      return;
    }

    const paletteItems = colors.map((hex) => ({ hex }));
    const blob = buildAdobeSwatchExchangeFile(paletteItems, paletteTokens, "palette");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `blobb-palette.ase`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCopiedColor("palette-ase");

    if (copiedColorTimeoutRef.current) {
      clearTimeout(copiedColorTimeoutRef.current);
    }

    copiedColorTimeoutRef.current = setTimeout(() => {
      setCopiedColor("");
      copiedColorTimeoutRef.current = null;
    }, 1200);
  }

  function changeRoute(nextRoute, hash = "") {
    const nextMeta = PAGE_META[nextRoute] ?? PAGE_META.contrast;
    const nextPath = `${nextMeta.path}${hash}`;

    if (`${window.location.pathname}${window.location.hash}` !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setRoute(nextRoute);

    if (hash) {
      window.setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  function renderInfoButton(panel) {
    const hash = panel === "scale" ? "#scale-generator" : "#contrast-checker";

    return (
      <div className="info-popover-container">
        <button type="button" className="info-icon-button" onClick={() => changeRoute("helpFaq", hash)} aria-label="Read more in Help & FAQ">
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
          <span>Read more in Help & FAQ</span>
        </button>
      </div>
    );
  }

  function renderPanelHelp({ id, title, body, hash }) {
    const isOpen = activePanelHelp === id;

    return (
      <span className={`panel-help ${isOpen ? "panel-help-active" : ""}`}>
        <button
          type="button"
          className="panel-help-button"
          aria-label={`About ${title}`}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            setActivePanelHelp(isOpen ? "" : id);
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            help
          </span>
        </button>
        <span className="panel-help-popover" role="tooltip">
          <span className="panel-help-popover-header">
            <strong>{title}</strong>
            <button type="button" className="panel-help-close" aria-label={`Close ${title} help`} onClick={() => setActivePanelHelp("")}>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </span>
          <span>{body}</span>
          <button type="button" className="panel-help-link" onClick={() => changeRoute("helpFaq", hash)}>
            Read more in Help & FAQ
          </button>
        </span>
      </span>
    );
  }

  function renderCompareModeSelector(className = "") {
    return (
      <div className={`compare-mode-selector ${className}`} aria-label="Compare mode">
        <div className="compare-mode-selector-buttons">
          <button
            type="button"
            className={`compare-mode-option ${compareMode === "manual" ? "compare-mode-option-active" : ""}`}
            onClick={() => changeCompareMode("manual")}
            disabled={isPaletteEmpty}
          >
            Manual compare
          </button>
          <button
            type="button"
            className={`compare-mode-option ${compareMode === "palette" ? "compare-mode-option-active" : ""}`}
            onClick={() => changeCompareMode("palette")}
            disabled={isPaletteEmpty}
          >
            Palette compare
          </button>
          <button
            type="button"
            className="compare-mode-option compare-mode-export-option compare-mode-export-desktop"
            onClick={() => setShowPaletteExportModal(true)}
            disabled={!colors.length}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              download
            </span>
            Export palette
          </button>
        </div>
        <div className="compare-more-menu-shell" ref={compareMoreMenuRef}>
          <button
            type="button"
            className="compare-mode-option compare-mode-more-trigger"
            aria-label="More compare actions"
            aria-haspopup="menu"
            aria-expanded={showCompareMoreMenu}
            onClick={() => setShowCompareMoreMenu((current) => !current)}
            disabled={isPaletteEmpty}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              more_vert
            </span>
          </button>
          {showCompareMoreMenu && (
            <div className="compare-more-menu" role="menu" aria-label="Compare actions">
              <button
                type="button"
                role="menuitem"
                className="compare-more-menu-item"
                onClick={() => {
                  setShowCompareMoreMenu(false);
                  setShowPaletteExportModal(true);
                }}
                disabled={!colors.length}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  download
                </span>
                Export palette
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="navigation-container">
        <div className="navigation-content">
          <button type="button" className="logo-container" onClick={() => changeRoute("contrast")} aria-label="Go to Blobb home">
            <svg className="logo-svg" role="img" aria-label="Blobb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 556.85 102.64">
              <g>
                <path
                  fill="#fff"
                  d="M153.76,102.5V0h47.09C213.01,0,221.97,2.12,227.75,6.36c5.77,4.24,8.66,10.36,8.66,18.38,0,5.31-1.05,9.51-3.14,12.61-2.1,3.1-4.71,5.4-7.83,6.92-3.12,1.51-6.22,2.5-9.29,2.97l.21-.28c7.27,1.16,12.93,3.87,16.98,8.11,4.05,4.24,6.08,10.11,6.08,17.61,0,7.08-1.68,14.54-5.03,18.62-3.35,4.08-7.79,6.96-13.31,8.66-5.52,1.7-11.52,2.55-17.99,2.55h-49.33ZM178.98,38.36h19.91c4.1,0,7.2-.76,9.29-2.27,2.1-1.51,3.14-3.92,3.14-7.23,0-2.84-.89-5.14-2.65-6.88-1.77-1.75-4.99-2.62-9.64-2.62h-20.05v19ZM178.98,83.15h18.73c4.38,0,7.73-.55,10.06-1.64,2.33-1.09,3.94-2.59,4.82-4.47.89-1.89,1.33-5.86,1.33-8.14s-.49-4.44-1.47-6.32c-.98-1.89-2.71-3.38-5.2-4.47-2.49-1.1-6-1.64-10.52-1.64h-17.75v26.69Z"
                />
                <path
                  fill="#fff"
                  d="M273.17,102.64c-6.66,0-11.65-1.51-14.95-4.54-3.31-3.03-4.96-7.52-4.96-13.48V0h24.53v81.26c0,1.58.22,2.63.66,3.14.44.51,1.39.77,2.83.77h5.17v17.47h-13.28Z"
                />
                <path
                  fill="#fff"
                  d="M333.05,102.5c-7.83,0-14.72-1.68-20.68-5.03-5.97-3.35-10.61-8.01-13.94-13.98-3.33-5.96-5-12.83-5-20.61s1.66-14.71,5-20.65c3.33-5.94,7.98-10.59,13.94-13.94,5.96-3.35,12.85-5.03,20.68-5.03s14.72,1.68,20.68,5.03c5.96,3.35,10.62,8,13.98,13.94,3.35,5.94,5.03,12.82,5.03,20.65s-1.68,14.71-5.03,20.65c-3.36,5.94-8.02,10.59-14.01,13.94s-12.87,5.03-20.65,5.03ZM333.12,84.97c4.38,0,7.85-1.98,10.41-5.94,2.56-3.96,3.84-9.34,3.84-16.14s-1.28-12.18-3.84-16.14c-2.56-3.96-6.06-5.94-10.48-5.94s-7.85,1.98-10.41,5.94c-2.56,3.96-3.84,9.34-3.84,16.14s1.28,12.18,3.84,16.14c2.56,3.96,6.05,5.94,10.48,5.94Z"
                />
                <path
                  fill="#fff"
                  d="M433.32,102.5c-5.82,0-10.81-1.31-14.95-3.95-4.15-2.63-7.61-6.84-10.41-12.61h1.19v16.56h-23.27V0h24.45v40.04l-1.47-1.05c2.84-5.54,6.35-9.55,10.52-12.02,4.17-2.47,8.98-3.7,14.43-3.7,6.43,0,11.96,1.56,16.59,4.68,4.63,3.12,8.19,7.65,10.65,13.59s3.7,13.13,3.7,21.55-1.25,15.45-3.74,21.35c-2.49,5.89-6.09,10.38-10.8,13.45-4.71,3.07-10.34,4.61-16.91,4.61ZM424.23,84.34c4.56,0,8.16-1.95,10.8-5.84,2.63-3.89,3.95-9.21,3.95-15.97s-1.28-11.85-3.84-15.58c-2.56-3.73-6.15-5.59-10.76-5.59-2.93,0-5.55.8-7.86,2.41-2.31,1.61-4.12,4-5.45,7.16-1.33,3.17-1.99,7.13-1.99,11.88,0,7.04,1.44,12.38,4.33,16.04,2.89,3.66,6.5,5.49,10.83,5.49Z"
                />
                <path
                  fill="#fff"
                  d="M525.41,102.5c-5.82,0-10.81-1.31-14.95-3.95s-7.61-6.84-10.41-12.61h1.19v16.56h-23.27V0h24.45v40.04l-1.47-1.05c2.84-5.54,6.35-9.55,10.52-12.02,4.17-2.47,8.98-3.7,14.43-3.7,6.43,0,11.96,1.56,16.59,4.68,4.63,3.12,8.19,7.65,10.65,13.59,2.47,5.94,3.7,13.13,3.7,21.55s-1.25,15.45-3.74,21.35c-2.49,5.89-6.09,10.38-10.8,13.45-4.71,3.07-10.34,4.61-16.91,4.61ZM516.33,84.34c4.56,0,8.16-1.95,10.8-5.84s3.95-9.21,3.95-15.97-1.28-11.85-3.84-15.58c-2.56-3.73-6.15-5.59-10.76-5.59-2.93,0-5.55.8-7.86,2.41-2.31,1.61-4.12,4-5.45,7.16-1.33,3.17-1.99,7.13-1.99,11.88,0,7.04,1.44,12.38,4.33,16.04,2.89,3.66,6.5,5.49,10.83,5.49Z"
                />
              </g>
              <path
                fill="#fff"
                d="M42.07,68.34c-1.09,0-2.13-.22-3.08-.62-.95-.4-1.8-.98-2.51-1.69-.72-.72-1.29-1.57-1.69-2.51s-.62-1.99-.62-3.08v-26.26H7.9c-4.37,0-7.9,3.54-7.9,7.9v52.53c0,4.37,3.54,7.9,7.9,7.9h52.53c4.37,0,7.9-3.54,7.9-7.9v-26.26h-26.26Z"
              />
              <path
                fill="#aaa"
                d="M94.6,0h-52.53c-4.37,0-7.9,3.54-7.9,7.9v26.26h26.26c1.39,0,2.67.39,3.81,1.02.28.16.56.31.82.5,1.98,1.44,3.28,3.75,3.28,6.39v26.26h26.26c4.37,0,7.9-3.54,7.9-7.9V7.9c0-4.37-3.54-7.9-7.9-7.9Z"
              />
            </svg>
          </button>
          <div className="navigation-anchor-items" aria-label="Navigation">
            <div className="route-tabs route-tabs-nav" role="tablist" aria-label="Pages">
              <button
                type="button"
                role="tab"
                aria-selected={route === "helpFaq"}
                className={`route-tab ${route === "helpFaq" ? "route-tab-active" : ""}`}
                onClick={() => changeRoute("helpFaq")}
              >
                Help & FAQ
              </button>
            </div>
            <button
              type="button"
              className="theme-toggle-button"
              onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-pressed={theme === "dark"}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>
          </div>
        </div>
      </nav>
      <div className="tool-switcher-shell">
        <div className="tool-switcher-content">
          <div className="route-tabs tool-switcher" role="tablist" aria-label="Pages">
            <button
              type="button"
              role="tab"
              aria-selected={route === "contrast"}
              className={`route-tab ${route === "contrast" ? "route-tab-active" : ""}`}
              onClick={() => changeRoute("contrast")}
            >
              Contrast checker
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={route === "scale"}
              className={`route-tab ${route === "scale" ? "route-tab-active" : ""}`}
              onClick={() => changeRoute("scale")}
            >
              Scale generator
            </button>
          </div>
        </div>
      </div>
      <section className="section-width">
        <div className="content">
          {route === "contrast" ? (
            <div>
              <div className={`contrast-checker-section ${isPaletteEmpty ? "contrast-checker-section-palette-empty" : ""}`}>
                <header className="intro-section">
                  <div>
                    <div>
                      <h1>Check whether your colors or palette is readable</h1>
                      <p>
                        Compare foreground and background colors against{" "}
                        <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">
                          WCAG
                        </a>{" "}
                        contrast guidelines. Verify that text, icons, buttons, and other UI elements maintain sufficient contrast for readability and
                        accessibility.
                      </p>
                      {renderInfoButton("contrast")}
                    </div>
                  </div>
                </header>
                <div className={`top-grid ${compareMode === "palette" ? "top-grid-palette" : ""}`}>
                  <div className="color-palette-section">
                    <div className="color-palette-container">
                      <div className="palette-toolbar">
                        <div>
                          <div className="panel-heading-row">
                            <p className="card-heading">Your palette</p>
                            {renderPanelHelp({
                              id: "contrast-palette",
                              title: "Your palette",
                              body: "Add and manage the colors you want to test across the tools.",
                              hash: "#your-palette",
                            })}
                          </div>
                          <p className="palette-count">{colors.length}/10 colors</p>
                        </div>
                        <div className="add-color-control">
                          <input
                            className="color-name-input"
                            placeholder="Name color"
                            value={colorNameInput}
                            onChange={(e) => setColorNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addColor();
                              }
                            }}
                          />
                          <div className="hex-input-shell">
                            <span>#</span>
                            <input
                              placeholder="7c3aed"
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value.replace(/^#+/, ""))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addColor();
                                }
                              }}
                            />
                          </div>
                          <button className="add-color-button" onClick={addColor} disabled={!canAddColor}>
                            Add
                          </button>
                        </div>
                      </div>
                      <div className="added-colors-container">
                        {isPaletteEmpty && (
                          <div className="palette-empty-callout">
                            <span className="material-symbols-outlined">palette</span>
                            <p>Add two colors to compare.</p>
                          </div>
                        )}
                        {colors.map((color, index) => {
                          const isSelected = selectedColors.includes(color);
                          const isBackgroundColor = selectedColors[0] === color;
                          const isTextColor = selectedColors[1] === color;
                          return (
                            <div className={`palette-swatch-card ${isSelected ? "palette-swatch-card-selected" : ""}`} key={index}>
                              <p className="palette-color-name">{getColorName(index)}</p>
                              <div className="palette-preview-shell">
                                <div
                                  className={`color-preview ${isSelected ? "selected" : ""}`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handlePaletteColorClick(color)}
                                  onDoubleClick={() => handlePaletteColorDoubleClick(color)}
                                ></div>
                                {compareMode === "manual" && (isBackgroundColor || isTextColor) && (
                                  <div className="palette-swatch-tags">
                                    {isBackgroundColor && <span>Bg</span>}
                                    {isTextColor && <span>Text</span>}
                                  </div>
                                )}
                                <button className="edit-color-button" onClick={() => startEditColor(index)} aria-label={`Edit ${getColorName(index)} ${color}`}>
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  className="delete-color-button"
                                  onClick={() => deleteColor(index)}
                                  aria-label={`Delete ${getColorName(index)} ${color}`}
                                >
                                  <span className="material-symbols-outlined">close</span>
                                </button>
                              </div>
                              <button
                                className="copy-hex-button"
                                onClick={(event) => copyColor(color, event)}
                                aria-label={`Copy ${getColorName(index)} ${color}`}
                              >
                                <span>{color}</span>
                                <span className="material-symbols-outlined">{copiedColor === color ? "check" : "content_copy"}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {renderCompareModeSelector("compare-mode-selector-mobile")}
                  {compareMode === "manual" && (
                    <div className="compare-color-container">
                      <div className="compare-color-header">
                        <div className="panel-heading-row">
                          <p className="card-heading">Selected colors</p>
                          {renderPanelHelp({
                            id: "selected-colors",
                            title: "Selected colors",
                            body: "Choose which palette colors act as text and background in manual compare.",
                            hash: "#selected-colors",
                          })}
                        </div>
                        <button className="swap-color-button" onClick={swapSelectedColors} disabled={!selectedContrast}>
                          <span className="material-symbols-outlined">swap_horiz</span>
                          Swap
                        </button>
                      </div>
                      <div className="selected-slot-control">
                        <button className={activeSelectedIndex === 1 ? "selected-slot-active" : ""} onClick={() => setActiveSelectedIndex(1)}>
                          Text
                        </button>
                        <button className={activeSelectedIndex === 0 ? "selected-slot-active" : ""} onClick={() => setActiveSelectedIndex(0)}>
                          Background
                        </button>
                      </div>
                      {selectedContrast ? (
                        <div className="compare-color-controls">
                          {[
                            { label: "Text color", color: selectedContrast.colorB, selectedIndex: 1, className: "compare-color-b" },
                            { label: "Background color", color: selectedContrast.colorA, selectedIndex: 0, className: "compare-color-a" },
                          ].map((selectedColor) => (
                            <div
                              className={`compare-color-item ${activeSelectedIndex === selectedColor.selectedIndex ? "compare-color-item-active" : ""}`}
                              key={selectedColor.label}
                              onClick={() => setActiveSelectedIndex(selectedColor.selectedIndex)}
                            >
                              <div className="compare-color-title-row">
                                <p className="card-heading">{selectedColor.label}</p>
                                <span className="selected-chip" aria-hidden={activeSelectedIndex !== selectedColor.selectedIndex}>
                                  Selected
                                </span>
                              </div>
                              <div className="selected-color-body">
                                <div className={selectedColor.className} style={{ backgroundColor: selectedColor.color }}></div>
                                <div className="selected-color-edit-panel">
                                  <div className="selected-color-input-shell">
                                    <input
                                      key={selectedColor.color}
                                      defaultValue={selectedColor.color}
                                      onBlur={(e) => updateSelectedColor(selectedColor.selectedIndex, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          updateSelectedColor(selectedColor.selectedIndex, e.target.value);
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      aria-label={`${selectedColor.label} hex value`}
                                    />
                                    <button
                                      className="copy-selected-color-button"
                                      onClick={(event) => copyColor(selectedColor.color, event)}
                                      aria-label={`Copy ${selectedColor.color}`}
                                    >
                                      <span className="material-symbols-outlined">{copiedColor === selectedColor.color ? "check" : "content_copy"}</span>
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="tune-selected-color-button"
                                    onClick={(event) => openColorAdjuster(selectedColor.selectedIndex, event)}
                                    aria-label={`Tune ${selectedColor.label} with contrast map`}
                                  >
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                      tune
                                    </span>
                                    <span className="tune-button-label-full">Tune with contrast map</span>
                                    <span className="tune-button-label-short">Tune color</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-panel-state">
                          <p>{canComparePalette ? "No selection yet" : "Add two colors to compare."}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {renderCompareModeSelector("compare-mode-selector-desktop")}
                  {compareMode === "manual" && !selectedContrast && (
                    <div className="select-color-result-container">
                      <div className="quiet-empty-state">
                        <p>{canComparePalette ? "Select two colors from your palette." : "Add two colors to compare."}</p>
                      </div>
                    </div>
                  )}
                  {compareMode === "manual" && selectedContrast && (
                    <div className="select-color-result-container">
                      <div className="compare-color-section">
                        <div className="compare-color-text-container">
                          <div className="panel-heading-row contrast-heading-row">
                            <p className="compare-info-text card-heading">Contrast</p>
                            {renderPanelHelp({
                              id: "contrast-ratio",
                              title: "Contrast",
                              body: "Shows the WCAG ratio and whether the selected pair passes common text and UI thresholds.",
                              hash: "#manual-compare",
                            })}
                          </div>
                          <div className="contrast-ratio-container">
                            <h2 className="contrast-text">{selectedContrast.contrast.toFixed(1)} : 1</h2>
                            <span className={`contrast-text-status ${selectedContrast.contrastElements.contrastClass}`}>
                              <span className="material-symbols-outlined">{selectedContrast.contrastElements.contrastIcon}</span>
                              {selectedContrast.contrastElements.contrastStatus}
                            </span>
                          </div>
                          <div className="contrast-checker-container">
                            <div className="contrast-checker-group">
                              <div className="contrast-checker-text">
                                <h4>Large text</h4>
                                <p className={`contrast-check ${selectedContrast.passesLargeAA ? "success" : "error"}`}>
                                  {selectedContrast.passesLargeAA ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined">close</span>
                                  )}{" "}
                                  Level AA
                                </p>
                                <p className={`contrast-check ${selectedContrast.passesLargeAAA ? "success" : "error"}`}>
                                  {selectedContrast.passesLargeAAA ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined">close</span>
                                  )}{" "}
                                  Level AAA
                                </p>
                              </div>
                              <p className="usage-note">
                                {selectedContrast.passesLargeAAA
                                  ? "Strong choice for large headings and bold display text."
                                  : selectedContrast.passesLargeAA
                                    ? "Use for large headings and bold display text, but avoid for critical or long-form reading."
                                    : "Not recommended for headings or display text without adjusting one color."}
                              </p>
                            </div>
                            <div className="contrast-checker-group">
                              <div className="contrast-checker-text">
                                <h4>Small text</h4>
                                <p className={`contrast-check ${selectedContrast.passesSmallAA ? "success" : "error"}`}>
                                  {selectedContrast.passesSmallAA ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined">close</span>
                                  )}{" "}
                                  Level AA
                                </p>
                                <p className={`contrast-check ${selectedContrast.passesSmallAAA ? "success" : "error"}`}>
                                  {selectedContrast.passesSmallAAA ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined">close</span>
                                  )}{" "}
                                  Level AAA
                                </p>
                              </div>
                              <p className="usage-note">
                                {selectedContrast.passesSmallAAA
                                  ? "Strong choice for body copy, labels, forms, and small UI text."
                                  : selectedContrast.passesSmallAA
                                    ? "Use for body copy, labels, forms, and standard UI text, but avoid for small text that needs extra-high contrast."
                                    : "Avoid for body copy, labels, forms, and small UI text."}
                              </p>
                            </div>
                            <div className="contrast-checker-group">
                              <div className="contrast-checker-text contrast-checker-text-single">
                                <h4>Graphics & UI Elements</h4>
                                <p className={`contrast-check ${selectedContrast.passesGraphicsUI ? "success" : "error"}`}>
                                  {selectedContrast.passesGraphicsUI ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : (
                                    <span className="material-symbols-outlined">close</span>
                                  )}{" "}
                                  Level AA
                                </p>
                              </div>
                              <p className="usage-note">
                                {selectedContrast.passesGraphicsUI
                                  ? "Good for icons, control borders, focus states, and visual indicators."
                                  : "Avoid for icons, control states, focus indicators, and important graphics."}
                              </p>
                            </div>
                          </div>
                        </div>
                        <section className="preview-section">
                          <div className="panel-heading-row">
                            <p className="card-heading">Preview</p>
                            {renderPanelHelp({
                              id: "preview",
                              title: "Preview",
                              body: "Shows the selected pair in UI-like examples so the ratio is easier to judge visually.",
                              hash: "#manual-compare",
                            })}
                          </div>
                          <div
                            className="color-preview-container"
                            style={{
                              backgroundColor: selectedColors[0],
                              color: selectedColors[1],
                            }}
                          >
                            <div className="preview-topbar">
                              <span className="preview-status-pill">Live preview</span>
                            </div>
                            <div className="preview-hero-row">
                              <div>
                                <h3 className="preview-title">Large text, 24px medium</h3>
                                <p className="preview-text-24-medium">Large text, 24px medium</p>
                                <p className="preview-text-19-bold">Large text, 19px bold</p>
                              </div>
                              <div className="preview-metric">
                                <strong>{selectedContrast.contrast.toFixed(1)}</strong>
                                <span>contrast</span>
                              </div>
                            </div>
                            <div className="preview-content-grid">
                              <div className="preview-sample-block">
                                <h4>Small text</h4>
                                <p className="preview-text-16-medium">Small text, 16px medium weight</p>
                                <p className="preview-text-16-regular">Small text, 16px regular weight</p>
                                <p className="preview-text-14-regular">Caption text, 14px regular weight</p>
                              </div>
                              <div className="preview-sample-block preview-ui-sample">
                                <h4>Graphics & UI Elements</h4>
                                <div className="preview-progress-track">
                                  <div className="preview-progress-fill" style={{ width: `${selectedContrast.contrastProgress}%` }}></div>
                                </div>
                                <button
                                  style={{
                                    backgroundColor: selectedColors[1],
                                    color: selectedColors[0],
                                  }}
                                >
                                  {selectedContrast.uiButtonText}
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  )}

                  {compareMode === "palette" && (
                    <>
                      {(!canComparePalette || !activePaletteColor) && (
                        <div className="quiet-empty-state">
                          <span className="material-symbols-outlined">ads_click</span>
                          <p>{canComparePalette ? "Select a color from your palette to compare." : "Add two colors to compare."}</p>
                        </div>
                      )}
                      {canComparePalette && activePaletteColor && (
                        <div className="palette-compare-section">
                          <div className="palette-compare-intro scale-compare-intro">
                            <div>
                              <div className="panel-heading-row">
                                <p className="card-heading">Palette compare</p>
                                {renderPanelHelp({
                                  id: "palette-compare",
                                  title: "Palette compare",
                                  body: "Scans your palette against itself and highlights which pairs work for normal text.",
                                  hash: "#palette-compare",
                                })}
                              </div>
                              <p className="palette-compare-copy palette-compare-copy-grid">
                                {paletteCompareView === "list" ? (
                                  <>
                                    Compare{" "}
                                    <strong>
                                      {activePaletteColorName} ({activePaletteColor})
                                    </strong>{" "}
                                    against the rest of your palette as a simple list. Each item shows the contrast result for that pair (normal text).
                                  </>
                                ) : (
                                  <>
                                    Compare every color in your palette against every other color. The highlighted row and column show where{" "}
                                    <strong>
                                      {activePaletteColorName} ({activePaletteColor})
                                    </strong>{" "}
                                    works as either text or background.
                                  </>
                                )}
                              </p>
                              <p className="palette-compare-copy palette-compare-copy-list">
                                Compare{" "}
                                <strong>
                                  {activePaletteColorName} ({activePaletteColor})
                                </strong>{" "}
                                against the rest of your palette as a simple list. Each item shows the contrast result for that pair (normal text). Select another
                                swatch in your palette to change the active color.
                              </p>
                            </div>
                          </div>
                          <div className="palette-compare-tools">
                            <div className="palette-view-toggle" role="tablist" aria-label="Palette compare view">
                              <button
                                type="button"
                                role="tab"
                                aria-selected={paletteCompareView === "grid"}
                                className={`palette-view-option ${paletteCompareView === "grid" ? "palette-view-option-active" : ""}`}
                                onClick={() => setPaletteCompareView("grid")}
                              >
                                Grid
                              </button>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={paletteCompareView === "list"}
                                className={`palette-view-option ${paletteCompareView === "list" ? "palette-view-option-active" : ""}`}
                                onClick={() => setPaletteCompareView("list")}
                              >
                                List
                              </button>
                            </div>
                            <label className="palette-pass-switch">
                              <input type="checkbox" checked={showPassingOnly} onChange={(e) => setShowPassingOnly(e.target.checked)} />
                              <span className="switch-track" aria-hidden="true">
                                <span className="switch-thumb"></span>
                              </span>
                              <span>Focus passing pairs</span>
                            </label>
                          </div>
                          <div
                            className={`palette-compare-container ${showPassingOnly ? "palette-focus-mode" : ""} ${
                              paletteCompareView === "list" ? "palette-compare-view-hidden" : ""
                            }`}
                          >
                            <div className="palette-header-row" style={{ gridTemplateColumns: `repeat(${colors.length}, 1fr)` }}>
                              {colors.map((color, index) => {
                                const isActiveColor = color === activePaletteColor;
                                return (
                                  <div
                                    className={`palette-color-label palette-color-label-top ${isActiveColor ? "palette-color-label-active" : ""}`}
                                    key={index}
                                    onClick={() => selectedColor(color)}
                                  >
                                    <div className="palette-background" style={{ backgroundColor: color }}></div>
                                    <div className="palette-label-text">
                                      <p className="palette-label-name">{getColorName(index)}</p>
                                      <p className="palette-label-hex">{color}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="palette-sidebar-column">
                              {colors.map((color, index) => {
                                const isActiveColor = color === activePaletteColor;
                                return (
                                  <div
                                    className={`palette-color-label palette-color-label-side ${isActiveColor ? "palette-color-label-active" : ""}`}
                                    key={index}
                                    onClick={() => selectedColor(color)}
                                  >
                                    <div className="palette-background" style={{ backgroundColor: color }}></div>
                                    <div className="palette-label-text">
                                      <p className="palette-label-name">{getColorName(index)}</p>
                                      <p className="palette-label-hex">{color}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="palette-main-grid" style={{ gridTemplateColumns: `repeat(${colors.length}, 1fr)` }}>
                              {colors.map((backgroundColor, backgroundIndex) =>
                                colors.map((textColor, textIndex) => {
                                  const contrast = getContrast(backgroundColor, textColor);
                                  const passes = contrast >= 4.5;
                                  const sameColor = backgroundColor === textColor;
                                  const isActiveResult = backgroundColor === activePaletteColor || textColor === activePaletteColor;
                                  const isFilteredOut = showPassingOnly && !passes && !sameColor;

                                  return (
                                    <div
                                      className={`palette-result-cell ${sameColor ? "palette-result-same" : passes ? "palette-result-pass" : "palette-result-fail"} ${
                                        isActiveResult ? "palette-result-active" : "palette-result-muted"
                                      } ${isFilteredOut ? "palette-result-filtered" : ""}`}
                                      key={`${backgroundIndex}-${textIndex}`}
                                      onClick={() => selectedColor(backgroundColor)}
                                    >
                                      <span className="material-symbols-outlined">{passes ? "check" : "close"}</span>
                                      <strong>{sameColor ? "Same" : passes ? "Pass" : "Fail"}</strong>
                                      <small>{contrast.toFixed(1)} : 1</small>
                                    </div>
                                  );
                                }),
                              )}
                            </div>
                          </div>
                          <div
                            className={`palette-compare-mobile-list ${showPassingOnly ? "palette-focus-mode" : ""} ${
                              paletteCompareView === "grid" ? "palette-compare-view-hidden" : "palette-compare-view-active"
                            }`}
                          >
                            {colors.map((color, index) => {
                              const contrast = getContrast(activePaletteColor, color);
                              const passes = contrast >= 4.5;
                              const sameColor = activePaletteColor === color;
                              const isFilteredOut = showPassingOnly && !passes && !sameColor;

                              if (isFilteredOut) {
                                return null;
                              }

                              return (
                                <div
                                  className={`palette-mobile-pair palette-mobile-pair-static ${sameColor ? "palette-mobile-pair-same" : passes ? "palette-mobile-pair-pass" : "palette-mobile-pair-fail"}`}
                                  key={`${activePaletteColor}-${color}-${index}`}
                                >
                                  <div className="palette-mobile-pair-colors">
                                    <span style={{ backgroundColor: activePaletteColor }}></span>
                                    <span style={{ backgroundColor: color }}></span>
                                  </div>
                                  <div className="palette-mobile-pair-text">
                                    <strong>{sameColor ? activePaletteColorName : `${activePaletteColorName} + ${getColorName(index)}`}</strong>
                                    <small>
                                      {activePaletteColor} / {color}
                                    </small>
                                  </div>
                                  <div className="palette-mobile-pair-result">
                                    <span className="material-symbols-outlined">{sameColor || !passes ? "close" : "check"}</span>
                                    <strong>{sameColor ? "Same" : passes ? "Pass" : "Fail"}</strong>
                                    <small>{contrast.toFixed(1)} : 1</small>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : route === "scale" ? (
            <div className="scale-generator-page">
              <header className="intro-section">
                <div>
                  <div>
                    <h1>Generate a clean scale from one color</h1>
                    <p>
                      Select a color from your palette to generate darker and lighter UI steps around it. Create related shades for surfaces, borders, hover
                      states, selected states, and readable color combinations that stay visually consistent.
                    </p>
                    {renderInfoButton("scale")}
                  </div>
                </div>
              </header>
              <div className="scale-page-layout">
                <div className="scale-page-top-row">
                  <div className="color-palette-section">
                    <div className="color-palette-container">
                      <div className="palette-toolbar">
                        <div>
                          <div className="panel-heading-row">
                            <p className="card-heading">Your palette</p>
                            {renderPanelHelp({
                              id: "scale-palette",
                              title: "Your palette",
                              body: "Select the base color you want to turn into a scale.",
                              hash: "#your-palette",
                            })}
                          </div>
                          <p className="palette-count">{colors.length}/10 colors</p>
                        </div>
                        <div className="add-color-control">
                          <input
                            className="color-name-input"
                            placeholder="Name color"
                            value={colorNameInput}
                            onChange={(e) => setColorNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addColor();
                              }
                            }}
                          />
                          <div className="hex-input-shell">
                            <span>#</span>
                            <input
                              placeholder="7c3aed"
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value.replace(/^#+/, ""))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addColor();
                                }
                              }}
                            />
                          </div>
                          <button className="add-color-button" onClick={addColor} disabled={!canAddColor}>
                            Add
                          </button>
                        </div>
                      </div>
                      <div className="added-colors-container">
                        {isPaletteEmpty && (
                          <div className="palette-empty-callout">
                            <span className="material-symbols-outlined">palette</span>
                            <p>Add one colors to genereate scale.</p>
                          </div>
                        )}
                        {colors.map((color, index) => {
                          const isSelected = selectedColors.includes(color);
                          return (
                            <div className={`palette-swatch-card ${isSelected ? "palette-swatch-card-selected" : ""}`} key={index}>
                              <p className="palette-color-name">{getColorName(index)}</p>
                              <div className="palette-preview-shell">
                                <div
                                  className={`color-preview ${isSelected ? "selected" : ""}`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handlePaletteColorClick(color)}
                                ></div>
                                {isSelected && (
                                  <div className="palette-swatch-tags" aria-hidden="true">
                                    <span>Base</span>
                                  </div>
                                )}
                                <button className="edit-color-button" onClick={() => startEditColor(index)} aria-label={`Edit ${getColorName(index)} ${color}`}>
                                  <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button
                                  className="delete-color-button"
                                  onClick={() => deleteColor(index)}
                                  aria-label={`Delete ${getColorName(index)} ${color}`}
                                >
                                  <span className="material-symbols-outlined">close</span>
                                </button>
                              </div>
                              <button
                                className="copy-hex-button"
                                onClick={(event) => copyColor(color, event)}
                                aria-label={`Copy ${getColorName(index)} ${color}`}
                              >
                                <span>{color}</span>
                                <span className="material-symbols-outlined">{copiedColor === color ? "check" : "content_copy"}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="scale-page-top-empty" aria-hidden="true"></div>
                </div>

                <section
                  className={`scale-generator-panel scale-page-scale-row ${isPaletteEmpty ? "scale-generator-panel-palette-empty" : ""}`}
                  aria-label="Scale generator"
                >
                  <div className="scale-generator-header">
                    <div>
                      <div className="panel-heading-row">
                        <p className="card-heading">Generated scale</p>
                        {renderPanelHelp({
                          id: "scale",
                          title: "Generated scale",
                          body: "Generates lighter and darker steps from one selected base color.",
                          hash: "#scale-generator",
                        })}
                      </div>
                      <p className="scale-generator-subtitle">
                        {canGenerateScale ? (
                          <>
                            Build lighter and darker steps from {activePaletteColorName || "the selected color"}{" "}
                            <span className="mono">({scaleBaseColor})</span>. Use the steps for surfaces, borders, hover states, and readable pairings.
                          </>
                        ) : (
                          "Select a color in your palette to generate its scale."
                        )}
                      </p>
                    </div>
                  </div>

                  {canGenerateScale ? (
                    <>
                      <div className="scale-swatch-grid">
                        {scaleColors.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className="scale-swatch-tile"
                            style={{ backgroundColor: item.hex, color: getReadableTextColor(item.hex) }}
                            onClick={(e) => copyColor(item.hex, e)}
                          >
                            <span className="scale-swatch-label">{item.label}</span>
                            <span className="scale-swatch-hex">{item.hex}</span>
                            <span className="material-symbols-outlined" aria-hidden="true">
                              {copiedColor === item.hex ? "check" : "content_copy"}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="scale-panel-switch" role="tablist" aria-label="Scale tools">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeScalePanel === "compare"}
                          className={`scale-panel-switch-button ${activeScalePanel === "compare" ? "scale-panel-switch-button-active" : ""}`}
                          onClick={() => setActiveScalePanel((current) => (current === "compare" ? "" : "compare"))}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            contrast
                          </span>
                          Compare scale
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={activeScalePanel === "export"}
                          className={`scale-panel-switch-button ${activeScalePanel === "export" ? "scale-panel-switch-button-active" : ""}`}
                          onClick={() => setActiveScalePanel((current) => (current === "export" ? "" : "export"))}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            code
                          </span>
                          Export scale
                        </button>
                      </div>
                      {activeScalePanel === "compare" && (
                        <div className="palette-compare-section scale-compare-section" aria-label="Scale contrast comparison">
                          <div className="palette-compare-intro scale-compare-intro">
                            <div>
                              <p className="card-heading scale-contrast-heading">Scale contrast</p>
                              <p className="scale-contrast-copy">
                                Compare the generated scale steps against each other to find readable text and background pairs. Pairs marked pass meet the
                                normal text threshold.
                              </p>
                            </div>
                          </div>
                          <div className="palette-compare-tools">
                            <div className="palette-view-toggle" role="tablist" aria-label="Scale compare view">
                              <button
                                type="button"
                                role="tab"
                                aria-selected={scaleCompareView === "grid"}
                                className={`palette-view-option ${scaleCompareView === "grid" ? "palette-view-option-active" : ""}`}
                                onClick={() => setScaleCompareView("grid")}
                              >
                                Grid
                              </button>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={scaleCompareView === "list"}
                                className={`palette-view-option ${scaleCompareView === "list" ? "palette-view-option-active" : ""}`}
                                onClick={() => setScaleCompareView("list")}
                              >
                                List
                              </button>
                            </div>
                            <label className="palette-pass-switch">
                              <input type="checkbox" checked={showScalePassingOnly} onChange={(e) => setShowScalePassingOnly(e.target.checked)} />
                              <span className="switch-track" aria-hidden="true">
                                <span className="switch-thumb"></span>
                              </span>
                              <span>Focus passing pairs</span>
                            </label>
                          </div>
                          <div
                            className={`palette-compare-container ${showScalePassingOnly ? "palette-focus-mode" : ""} ${
                              scaleCompareView === "list" ? "palette-compare-view-hidden" : ""
                            }`}
                          >
                            <div className="palette-header-row" style={{ gridTemplateColumns: `repeat(${scaleColors.length}, 1fr)` }}>
                              {scaleColors.map((item, index) => {
                                const isActiveColor = item.hex === scaleCompareActiveColor;
                                return (
                                  <div
                                    className={`palette-color-label palette-color-label-top ${isActiveColor ? "palette-color-label-active" : ""}`}
                                    key={`scale-top-${item.hex}-${index}`}
                                    onClick={() => setActiveScaleCompareColor(item.hex)}
                                  >
                                    <div className="palette-background" style={{ backgroundColor: item.hex }}></div>
                                    <div className="palette-label-text">
                                      <p className="palette-label-name">{scaleStepTokens[index] ?? index}</p>
                                      <p className="palette-label-hex">{item.hex}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="palette-sidebar-column">
                              {scaleColors.map((item, index) => {
                                const isActiveColor = item.hex === scaleCompareActiveColor;
                                return (
                                  <div
                                    className={`palette-color-label palette-color-label-side ${isActiveColor ? "palette-color-label-active" : ""}`}
                                    key={`scale-side-${item.hex}-${index}`}
                                    onClick={() => setActiveScaleCompareColor(item.hex)}
                                  >
                                    <div className="palette-background" style={{ backgroundColor: item.hex }}></div>
                                    <div className="palette-label-text">
                                      <p className="palette-label-name">{scaleStepTokens[index] ?? index}</p>
                                      <p className="palette-label-hex">{item.hex}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="palette-main-grid" style={{ gridTemplateColumns: `repeat(${scaleColors.length}, 1fr)` }}>
                              {scaleColors.map((backgroundItem, backgroundIndex) =>
                                scaleColors.map((textItem, textIndex) => {
                                  const contrast = getContrast(backgroundItem.hex, textItem.hex);
                                  const passes = contrast >= 4.5;
                                  const sameColor = backgroundItem.hex === textItem.hex;
                                  const isActiveResult = backgroundItem.hex === scaleCompareActiveColor || textItem.hex === scaleCompareActiveColor;
                                  const isFilteredOut = showScalePassingOnly && !passes && !sameColor;

                                  return (
                                    <div
                                      className={`palette-result-cell ${sameColor ? "palette-result-same" : passes ? "palette-result-pass" : "palette-result-fail"} ${
                                        isActiveResult ? "palette-result-active" : "palette-result-muted"
                                      } ${isFilteredOut ? "palette-result-filtered" : ""}`}
                                      key={`scale-result-${backgroundIndex}-${textIndex}`}
                                      onClick={() => setActiveScaleCompareColor(backgroundItem.hex)}
                                    >
                                      <span className="material-symbols-outlined">{passes ? "check" : "close"}</span>
                                      <strong>{sameColor ? "Same" : passes ? "Pass" : "Fail"}</strong>
                                      <small>{contrast.toFixed(1)} : 1</small>
                                    </div>
                                  );
                                }),
                              )}
                            </div>
                          </div>
                          <div
                            className={`palette-compare-mobile-list ${showScalePassingOnly ? "palette-focus-mode" : ""} ${
                              scaleCompareView === "grid" ? "palette-compare-view-hidden" : "palette-compare-view-active"
                            }`}
                          >
                            <p className="scale-compare-list-title">Select active scale color</p>
                            <div className="scale-compare-list-selector" aria-label="Select active scale color">
                              {scaleColors.map((item, index) => {
                                const isSelected = item.hex === scaleCompareActiveColor;
                                return (
                                  <button
                                    key={`scale-list-select-${item.hex}-${index}`}
                                    type="button"
                                    className={`scale-compare-list-swatch ${isSelected ? "scale-compare-list-swatch-selected" : ""}`}
                                    onClick={() => setActiveScaleCompareColor(item.hex)}
                                    aria-pressed={isSelected}
                                  >
                                    <span className="scale-compare-list-swatch-chip" style={{ backgroundColor: item.hex }} aria-hidden="true"></span>
                                    <span className="scale-compare-list-swatch-label">{scaleStepTokens[index] ?? index}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {scaleColors.map((item, index) => {
                              const contrast = getContrast(scaleCompareActiveColor, item.hex);
                              const passes = contrast >= 4.5;
                              const sameColor = scaleCompareActiveColor === item.hex;
                              const isFilteredOut = showScalePassingOnly && !passes && !sameColor;

                              if (isFilteredOut) {
                                return null;
                              }

                                  return (
                                    <div
                                      className={`palette-mobile-pair palette-mobile-pair-static ${sameColor ? "palette-mobile-pair-same" : passes ? "palette-mobile-pair-pass" : "palette-mobile-pair-fail"}`}
                                      key={`scale-mobile-${scaleCompareActiveColor}-${item.hex}-${index}`}
                                    >
                                      <div className="palette-mobile-pair-colors">
                                        <span style={{ backgroundColor: scaleCompareActiveColor }}></span>
                                        <span style={{ backgroundColor: item.hex }}></span>
                                      </div>
                                      <div className="palette-mobile-pair-text">
                                        <strong>{sameColor ? scaleCompareActiveToken : `${scaleCompareActiveToken} + ${scaleStepTokens[index] ?? index}`}</strong>
                                        <small>
                                          {scaleCompareActiveColor} / {item.hex}
                                    </small>
                                  </div>
                                  <div className="palette-mobile-pair-result">
                                    <span className="material-symbols-outlined">{sameColor || !passes ? "close" : "check"}</span>
                                    <strong>{sameColor ? "Same" : passes ? "Pass" : "Fail"}</strong>
                                    <small>{contrast.toFixed(1)} : 1</small>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {activeScalePanel === "export" && (
                        <div className="scale-css-preview">
                          <div className="scale-css-preview-header">
                            <div>
                              <p className="card-heading">Developer export</p>
                              <p>Copy the scale as CSS variables, a JS object, or JSON tokens.</p>
                            </div>
                            <div className="scale-css-controls">
                              <div className="scale-css-format-selector" aria-label="Developer export type">
                                {["css", "js", "json"].map((type) => (
                                  <button
                                    key={type}
                                    type="button"
                                    className={`scale-css-format-option ${scaleSnippetType === type ? "scale-css-format-option-active" : ""}`}
                                    onClick={() => setScaleSnippetType(type)}
                                    aria-pressed={scaleSnippetType === type}
                                  >
                                    {type.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                              <div className="scale-css-format-selector" aria-label="Color value format">
                                {["hex", "rgb", "hsl"].map((format) => (
                                  <button
                                    key={format}
                                    type="button"
                                    className={`scale-css-format-option ${scaleCssFormat === format ? "scale-css-format-option-active" : ""}`}
                                    onClick={() => setScaleCssFormat(format)}
                                    aria-pressed={scaleCssFormat === format}
                                  >
                                    {format.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                              <button type="button" className="scale-action-button" onClick={downloadScaleAse} disabled={!canGenerateScale}>
                                <span className="material-symbols-outlined" aria-hidden="true">
                                  {copiedColor === "scale-ase" ? "check" : "download"}
                                </span>
                                Download ASE
                              </button>
                            </div>
                          </div>
                          <div className="scale-code-window">
                            <button type="button" className="scale-code-copy-button" onClick={copyDeveloperSnippet}>
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {copiedColor === "scale-css" ? "check" : "content_copy"}
                              </span>
                              Copy snippet
                            </button>
                            <pre className="scale-css-code">
                              <code>{scaleDeveloperSnippet}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-panel-state">
                      <span className="material-symbols-outlined">palette</span>
                      <p>Select a color to generate a scale.</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <FaqPage />
          )}
        </div>
      </section>
      {canAdjustSelectedColor && (
        <div className="edit-color-overlay" role="dialog" aria-modal="true" aria-labelledby="contrast-adjust-title" onClick={closeColorAdjuster}>
          <div className="edit-color-modal contrast-adjust-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-color-modal-header">
              <div>
                <div className="contrast-adjust-title-row">
                  <p className="card-heading" id="contrast-adjust-title">
                    Tune {adjustingRole.toLowerCase()} color
                  </p>
                  <button
                    type="button"
                    className="contrast-adjust-help-button"
                    aria-label="Show color tuning help"
                    aria-expanded={showAdjustInfo}
                    onClick={() => setShowAdjustInfo((current) => !current)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      help
                    </span>
                  </button>
                </div>
                <p>
                  Find colors that pass against {adjustingOppositeName} <span className="mono">({adjustingOppositeColor})</span>.
                </p>
              </div>
              <button className="edit-color-modal-close" onClick={closeColorAdjuster} aria-label="Close color adjustment dialog">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {showAdjustInfo && (
              <div className="contrast-adjust-help-panel">
                <p>
                  The map tests possible colors against the opposite selected color. Click a cell to preview it, adjust HSL if needed, then save when the
                  contrast and color feel right.
                </p>
              </div>
            )}
            <div className="contrast-adjust-layout">
              <div className="contrast-adjust-controls">
                <div
                  className="contrast-adjust-preview"
                  style={{
                    backgroundColor: adjustingSelectedIndex === 0 ? adjustingColor : adjustingOppositeColor,
                    color: adjustingSelectedIndex === 1 ? adjustingColor : adjustingOppositeColor,
                  }}
                >
                  <strong>Readable text</strong>
                  <span>
                    {adjustingContrast.toFixed(2)} : 1 {adjustingContrast >= 4.5 ? "Pass" : "Fail"}
                  </span>
                </div>
                <div className="contrast-adjust-color-row">
                  <div>
                    <span>Draft</span>
                    <strong>
                      {adjustingColorName} ({adjustingColor})
                    </strong>
                  </div>
                  <div>
                    <span>Against</span>
                    <strong>
                      {adjustingOppositeName} ({adjustingOppositeColor})
                    </strong>
                  </div>
                </div>
                <button type="button" className="contrast-adjust-swap-button" onClick={swapAdjustmentTarget}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    swap_horiz
                  </span>
                  Tune {adjustingSelectedIndex === 0 ? "text" : "background"} instead
                </button>
                <label className="edit-color-modal-field">
                  Hex value
                  <div className="hex-input-shell contrast-adjust-hex-shell">
                    <span>#</span>
                    <input
                      key={`adjust-${adjustingColor}`}
                      defaultValue={adjustingColor.replace(/^#/, "")}
                      onBlur={(e) => updateAdjustingDraftHex(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateAdjustingDraftHex(e.target.value);
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </div>
                </label>
                <label className="contrast-adjust-slider">
                  <span>
                    Hue <strong>{adjustingHsl.h}</strong>
                  </span>
                  <input
                    className="hue-slider"
                    type="range"
                    min="0"
                    max="359"
                    value={adjustingHsl.h}
                    onChange={(e) => updateAdjustingDraftHsl({ h: e.target.value })}
                  />
                </label>
                <label className="contrast-adjust-slider">
                  <span>
                    Saturation <strong>{adjustingHsl.s}%</strong>
                  </span>
                  <input
                    className="contrast-adjust-range"
                    type="range"
                    min="0"
                    max="100"
                    value={adjustingHsl.s}
                    onChange={(e) => updateAdjustingDraftHsl({ s: e.target.value })}
                  />
                </label>
                <label className="contrast-adjust-slider">
                  <span>
                    Lightness <strong>{adjustingHsl.l}%</strong>
                  </span>
                  <input
                    className="contrast-adjust-range"
                    type="range"
                    min="0"
                    max="100"
                    value={adjustingHsl.l}
                    onChange={(e) => updateAdjustingDraftHsl({ l: e.target.value })}
                  />
                </label>
              </div>
              <div className="contrast-map-panel">
                <div className="contrast-map-header">
                  <div>
                    <p className="card-heading">Passing color map</p>
                    <p>Hue runs left to right. Lightness runs from light to dark.</p>
                  </div>
                  <div className="contrast-map-legend" aria-label="Contrast map legend">
                    <span>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        check
                      </span>
                      Pass
                    </span>
                    <span>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        close
                      </span>
                      Fail
                    </span>
                  </div>
                </div>
                <div className="contrast-map-grid" style={{ "--contrast-map-columns": COLOR_MAP_HUE_STEPS }}>
                  {COLOR_MAP_LIGHTNESS_STEPS.map((lightness) =>
                    Array.from({ length: COLOR_MAP_HUE_STEPS }, (_, hueIndex) => {
                      const hue = Math.round((360 / COLOR_MAP_HUE_STEPS) * hueIndex);
                      const candidate = hslToHex(hue, adjustingHsl.s, lightness);
                      const contrast = getContrast(candidate, adjustingOppositeColor);
                      const passes = contrast >= 4.5;
                      const isCurrent = hueIndex === currentMapHueIndex && lightness === currentMapLightness;

                      return (
                        <button
                          type="button"
                          className={`contrast-map-cell ${passes ? "contrast-map-cell-pass" : "contrast-map-cell-fail"} ${
                            isCurrent ? "contrast-map-cell-current" : ""
                          }`}
                          key={`${lightness}-${hue}`}
                          style={{ backgroundColor: candidate, color: getReadableTextColor(candidate) }}
                          onClick={() => setAdjustingDraftColor(candidate)}
                          aria-label={`${candidate}, ${contrast.toFixed(1)} to 1, ${passes ? "passes" : "fails"}`}
                          title={`${candidate} - ${contrast.toFixed(1)}:1`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {passes ? "check" : "close"}
                          </span>
                        </button>
                      );
                    }),
                  )}
                </div>
                <div className="passing-candidates-panel">
                  <div>
                    <p className="card-heading">Passing candidates</p>
                    <p>Tap a larger swatch to preview a passing option.</p>
                  </div>
                  <div className="passing-candidates-grid">
                    {COLOR_MAP_LIGHTNESS_STEPS.flatMap((lightness) =>
                      Array.from({ length: COLOR_MAP_HUE_STEPS }, (_, hueIndex) => {
                        const hue = Math.round((360 / COLOR_MAP_HUE_STEPS) * hueIndex);
                        const candidate = hslToHex(hue, adjustingHsl.s, lightness);
                        const contrast = getContrast(candidate, adjustingOppositeColor);

                        return { candidate, contrast };
                      }),
                    )
                      .filter(({ contrast }) => contrast >= 4.5)
                      .sort((a, b) => Math.abs(getContrast(adjustingColor, a.candidate) - 1) - Math.abs(getContrast(adjustingColor, b.candidate) - 1))
                      .slice(0, 12)
                      .map(({ candidate, contrast }) => (
                        <button
                          type="button"
                          className={`passing-candidate-swatch ${candidate === adjustingColor ? "passing-candidate-swatch-active" : ""}`}
                          key={candidate}
                          style={{ backgroundColor: candidate, color: getReadableTextColor(candidate) }}
                          onClick={() => setAdjustingDraftColor(candidate)}
                        >
                          <strong>{candidate}</strong>
                          <span>{contrast.toFixed(1)} : 1</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="contrast-adjust-actions">
              <button type="button" className="edit-color-action-button edit-color-action-primary" onClick={saveColorAdjustment}>
                <span className="material-symbols-outlined">check</span>
                Save color change
              </button>
              <button type="button" className="edit-color-action-button edit-color-action-secondary" onClick={closeColorAdjuster}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {editingColorIndex !== null && (
        <div className="edit-color-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-color-title" onClick={cancelEditColor}>
          <div className="edit-color-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-color-modal-header">
              <div>
                <p className="card-heading" id="edit-color-title">
                  Edit color
                </p>
                <p>{editingColor}</p>
              </div>
              <button className="edit-color-modal-close" onClick={cancelEditColor} aria-label="Close edit color dialog">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="edit-color-modal-preview" style={{ backgroundColor: canSaveEditColor ? cleanedEditColorInput : editingColor }}></div>
            <label className="edit-color-modal-field">
              Color name
              <input
                className="edit-color-name-input"
                placeholder="Color name"
                value={editColorNameInput}
                onChange={(e) => setEditColorNameInput(e.target.value)}
                autoFocus
              />
            </label>
            <label className="edit-color-modal-field">
              Hex value
              <input className="edit-color-input" value={editColorInput} onChange={(e) => setEditColorInput(e.target.value)} />
            </label>
            <div className="edit-color-actions">
              <button
                className="edit-color-action-button edit-color-action-primary"
                onClick={() => saveEditColor(editingColorIndex)}
                disabled={!canSaveEditColor}
              >
                <span className="material-symbols-outlined">check</span>
                Save
              </button>
              <button className="edit-color-action-button edit-color-action-secondary" onClick={cancelEditColor}>
                <span className="material-symbols-outlined">close</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showPaletteExportModal && (
        <div
          className="edit-color-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="palette-export-title"
          onClick={() => setShowPaletteExportModal(false)}
        >
          <div className="edit-color-modal palette-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="edit-color-modal-header">
              <div>
                <p className="card-heading" id="palette-export-title">
                  Export palette
                </p>
                <p>Copy tokens for developers or export a swatch file for design tools.</p>
              </div>
              <button
                className="edit-color-modal-close"
                onClick={() => setShowPaletteExportModal(false)}
                aria-label="Close palette export dialog"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="palette-export-modal-body">
              <div className="scale-css-controls palette-export-controls-row">
                <div className="scale-css-format-selector" aria-label="Export type">
                  {["css", "json"].map((type) => (
                    <button
                      key={`palette-type-modal-${type}`}
                      type="button"
                      className={`scale-css-format-option ${paletteSnippetType === type ? "scale-css-format-option-active" : ""}`}
                      onClick={() => setPaletteSnippetType(type)}
                      aria-pressed={paletteSnippetType === type}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="scale-css-format-selector" aria-label="Color value format">
                  {["hex", "rgb", "hsl"].map((format) => (
                    <button
                      key={`palette-format-modal-${format}`}
                      type="button"
                      className={`scale-css-format-option ${paletteCssFormat === format ? "scale-css-format-option-active" : ""}`}
                      onClick={() => setPaletteCssFormat(format)}
                      aria-pressed={paletteCssFormat === format}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button type="button" className="scale-action-button" onClick={downloadPaletteAse} disabled={!colors.length}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {copiedColor === "palette-ase" ? "check" : "download"}
                  </span>
                  Download ASE
                </button>
              </div>
              <div className="scale-code-window">
                <button type="button" className="scale-code-copy-button" onClick={copyPaletteSnippet} disabled={!colors.length}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {copiedColor === "palette-snippet" ? "check" : "content_copy"}
                  </span>
                  Copy snippet
                </button>
                <pre className="scale-css-code">
                  <code>{paletteDeveloperSnippet}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <svg className="footer-logo-svg" role="img" aria-label="Blobb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 556.85 102.64">
              <g>
                <path
                  fill="#fff"
                  d="M153.76,102.5V0h47.09C213.01,0,221.97,2.12,227.75,6.36c5.77,4.24,8.66,10.36,8.66,18.38,0,5.31-1.05,9.51-3.14,12.61-2.1,3.1-4.71,5.4-7.83,6.92-3.12,1.51-6.22,2.5-9.29,2.97l.21-.28c7.27,1.16,12.93,3.87,16.98,8.11,4.05,4.24,6.08,10.11,6.08,17.61,0,7.08-1.68,14.54-5.03,18.62-3.35,4.08-7.79,6.96-13.31,8.66-5.52,1.7-11.52,2.55-17.99,2.55h-49.33ZM178.98,38.36h19.91c4.1,0,7.2-.76,9.29-2.27,2.1-1.51,3.14-3.92,3.14-7.23,0-2.84-.89-5.14-2.65-6.88-1.77-1.75-4.99-2.62-9.64-2.62h-20.05v19ZM178.98,83.15h18.73c4.38,0,7.73-.55,10.06-1.64,2.33-1.09,3.94-2.59,4.82-4.47.89-1.89,1.33-5.86,1.33-8.14s-.49-4.44-1.47-6.32c-.98-1.89-2.71-3.38-5.2-4.47-2.49-1.1-6-1.64-10.52-1.64h-17.75v26.69Z"
                />
                <path
                  fill="#fff"
                  d="M273.17,102.64c-6.66,0-11.65-1.51-14.95-4.54-3.31-3.03-4.96-7.52-4.96-13.48V0h24.53v81.26c0,1.58.22,2.63.66,3.14.44.51,1.39.77,2.83.77h5.17v17.47h-13.28Z"
                />
                <path
                  fill="#fff"
                  d="M333.05,102.5c-7.83,0-14.72-1.68-20.68-5.03-5.97-3.35-10.61-8.01-13.94-13.98-3.33-5.96-5-12.83-5-20.61s1.66-14.71,5-20.65c3.33-5.94,7.98-10.59,13.94-13.94,5.96-3.35,12.85-5.03,20.68-5.03s14.72,1.68,20.68,5.03c5.96,3.35,10.62,8,13.98,13.94,3.35,5.94,5.03,12.82,5.03,20.65s-1.68,14.71-5.03,20.65c-3.36,5.94-8.02,10.59-14.01,13.94s-12.87,5.03-20.65,5.03ZM333.12,84.97c4.38,0,7.85-1.98,10.41-5.94,2.56-3.96,3.84-9.34,3.84-16.14s-1.28-12.18-3.84-16.14c-2.56-3.96-6.06-5.94-10.48-5.94s-7.85,1.98-10.41,5.94c-2.56,3.96-3.84,9.34-3.84,16.14s1.28,12.18,3.84,16.14c2.56,3.96,6.05,5.94,10.48,5.94Z"
                />
                <path
                  fill="#fff"
                  d="M433.32,102.5c-5.82,0-10.81-1.31-14.95-3.95-4.15-2.63-7.61-6.84-10.41-12.61h1.19v16.56h-23.27V0h24.45v40.04l-1.47-1.05c2.84-5.54,6.35-9.55,10.52-12.02,4.17-2.47,8.98-3.7,14.43-3.7,6.43,0,11.96,1.56,16.59,4.68,4.63,3.12,8.19,7.65,10.65,13.59s3.7,13.13,3.7,21.55-1.25,15.45-3.74,21.35c-2.49,5.89-6.09,10.38-10.8,13.45-4.71,3.07-10.34,4.61-16.91,4.61ZM424.23,84.34c4.56,0,8.16-1.95,10.8-5.84,2.63-3.89,3.95-9.21,3.95-15.97s-1.28-11.85-3.84-15.58c-2.56-3.73-6.15-5.59-10.76-5.59-2.93,0-5.55.8-7.86,2.41-2.31,1.61-4.12,4-5.45,7.16-1.33,3.17-1.99,7.13-1.99,11.88,0,7.04,1.44,12.38,4.33,16.04,2.89,3.66,6.5,5.49,10.83,5.49Z"
                />
                <path
                  fill="#fff"
                  d="M525.41,102.5c-5.82,0-10.81-1.31-14.95-3.95s-7.61-6.84-10.41-12.61h1.19v16.56h-23.27V0h24.45v40.04l-1.47-1.05c2.84-5.54,6.35-9.55,10.52-12.02,4.17-2.47,8.98-3.7,14.43-3.7,6.43,0,11.96,1.56,16.59,4.68,4.63,3.12,8.19,7.65,10.65,13.59,2.47,5.94,3.7,13.13,3.7,21.55s-1.25,15.45-3.74,21.35c-2.49,5.89-6.09,10.38-10.8,13.45-4.71,3.07-10.34,4.61-16.91,4.61ZM516.33,84.34c4.56,0,8.16-1.95,10.8-5.84s3.95-9.21,3.95-15.97-1.28-11.85-3.84-15.58c-2.56-3.73-6.15-5.59-10.76-5.59-2.93,0-5.55.8-7.86,2.41-2.31,1.61-4.12,4-5.45,7.16-1.33,3.17-1.99,7.13-1.99,11.88,0,7.04,1.44,12.38,4.33,16.04,2.89,3.66,6.5,5.49,10.83,5.49Z"
                />
              </g>
              <path
                fill="#fff"
                d="M42.07,68.34c-1.09,0-2.13-.22-3.08-.62-.95-.4-1.8-.98-2.51-1.69-.72-.72-1.29-1.57-1.69-2.51s-.62-1.99-.62-3.08v-26.26H7.9c-4.37,0-7.9,3.54-7.9,7.9v52.53c0,4.37,3.54,7.9,7.9,7.9h52.53c4.37,0,7.9-3.54,7.9-7.9v-26.26h-26.26Z"
              />
              <path
                fill="#aaa"
                d="M94.6,0h-52.53c-4.37,0-7.9,3.54-7.9,7.9v26.26h26.26c1.39,0,2.67.39,3.81,1.02.28.16.56.31.82.5,1.98,1.44,3.28,3.75,3.28,6.39v26.26h26.26c4.37,0,7.9-3.54,7.9-7.9V7.9c0-4.37-3.54-7.9-7.9-7.9Z"
              />
            </svg>
            <p>Palette-first tools for generating color scales and checking WCAG contrast.</p>
          </div>
          <div className="footer-links" aria-label="Footer links">
            <a className="github-button footer-github-button" href="https://github.com/Bompilez/Blobb" target="_blank" rel="noopener noreferrer">
              <span className="sr-only">View on GitHub</span>
              <svg className="github-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .5C5.73.5.75 5.6.75 12c0 5.1 3.29 9.43 7.86 10.96.58.12.79-.26.79-.58 0-.29-.01-1.06-.02-2.08-3.2.71-3.88-1.59-3.88-1.59-.53-1.37-1.3-1.73-1.3-1.73-1.06-.74.08-.73.08-.73 1.17.08 1.78 1.23 1.78 1.23 1.04 1.82 2.73 1.29 3.4.99.11-.77.41-1.29.74-1.59-2.55-.3-5.23-1.31-5.23-5.82 0-1.29.45-2.35 1.19-3.18-.12-.3-.52-1.52.11-3.16 0 0 .97-.32 3.18 1.21.92-.26 1.9-.38 2.88-.38.98 0 1.96.13 2.88.38 2.2-1.53 3.17-1.21 3.17-1.21.63 1.64.23 2.86.11 3.16.74.83 1.19 1.89 1.19 3.18 0 4.52-2.69 5.52-5.25 5.81.42.37.79 1.1.79 2.22 0 1.6-.02 2.9-.02 3.29 0 .32.21.7.8.58 4.56-1.54 7.85-5.86 7.85-10.96C23.25 5.6 18.27.5 12 .5Z"
                />
              </svg>
            </a>
          </div>
        </div>
      </footer>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
