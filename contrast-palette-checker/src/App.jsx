import { useEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { getContrast, getReadableTextColor, hexToHSL, hexToRGB, hslToHex, isValidHex, normalizeHex, rgbToHex } from "./lib/colorUtils";
import { getRouteFromPath, PAGE_META, setMetaContent } from "./lib/routeMeta";
import FaqPage from "./pages/FaqPage";
import "./App.css";

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
    const cleanedNewColor = newColor.trim().toLowerCase();
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
        <button type="button" className="info-icon-button" onClick={() => changeRoute("faq", hash)}>
          <span className="material-symbols-outlined" aria-hidden="true">
            help
          </span>
          <span>How this tool works</span>
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
          <button type="button" className="panel-help-link" onClick={() => changeRoute("faq", hash)}>
            Read more in FAQ
          </button>
        </span>
      </span>
    );
  }

  function renderCompareModeSelector(className = "") {
    return (
      <div className={`compare-mode-selector ${className}`} aria-label="Compare mode">
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
      </div>
    );
  }

  return (
    <>
      <nav className="navigation-container">
        <div className="navigation-content">
          <button type="button" className="logo-container" onClick={() => changeRoute("contrast")} aria-label="Go to Blobb home">
            <svg className="logo-svg" role="img" aria-label="Blobb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 678.78 128.01">
              <g>
                <path
                  fill="#fff"
                  d="M176.06,127.84V0h58.73C249.95,0,261.13,2.65,268.34,7.93c7.2,5.29,10.8,12.93,10.8,22.92,0,6.62-1.31,11.87-3.92,15.73-2.61,3.87-5.87,6.74-9.76,8.63-3.89,1.89-7.76,3.12-11.59,3.7l.26-.35c9.06,1.45,16.12,4.82,21.18,10.11,5.05,5.29,7.58,12.61,7.58,21.96,0,8.83-2.09,18.14-6.28,23.22-4.18,5.09-9.72,8.69-16.6,10.81-6.88,2.12-14.36,3.18-22.44,3.18h-61.52ZM207.51,47.84h24.84c5.11,0,8.98-.94,11.59-2.83,2.61-1.89,3.92-4.89,3.92-9.02,0-3.54-1.1-6.41-3.31-8.58-2.21-2.18-6.22-3.27-12.03-3.27h-25.01v23.7ZM207.51,103.7h23.35c5.46,0,9.64-.68,12.55-2.05,2.9-1.36,4.91-3.22,6.01-5.58,1.1-2.35,1.66-7.31,1.66-10.15s-.61-5.53-1.83-7.88c-1.22-2.36-3.38-4.21-6.49-5.58-3.11-1.37-7.48-2.05-13.12-2.05h-22.13v33.29Z"
                />
                <path
                  fill="#fff"
                  d="M324.98,128.01c-8.31,0-14.53-1.89-18.65-5.67-4.12-3.77-6.19-9.38-6.19-16.82V0h30.59v101.35c0,1.97.28,3.28.83,3.92.55.64,1.73.96,3.53.96h6.45v21.79h-16.56Z"
                />
                <path
                  fill="#fff"
                  d="M399.66,127.84c-9.76,0-18.36-2.09-25.79-6.27-7.44-4.18-13.24-9.99-17.39-17.43-4.16-7.43-6.23-16-6.23-25.71s2.08-18.34,6.23-25.75c4.15-7.41,9.95-13.2,17.39-17.39,7.43-4.18,16.03-6.28,25.79-6.28s18.36,2.09,25.79,6.28c7.44,4.18,13.25,9.98,17.43,17.39,4.18,7.41,6.27,15.99,6.27,25.75s-2.09,18.34-6.27,25.75c-4.19,7.41-10.01,13.2-17.47,17.39s-16.05,6.27-25.75,6.27ZM399.75,105.97c5.46,0,9.79-2.47,12.98-7.41,3.2-4.94,4.79-11.65,4.79-20.13s-1.6-15.19-4.79-20.13c-3.19-4.94-7.55-7.41-13.07-7.41s-9.79,2.47-12.98,7.41c-3.2,4.94-4.79,11.65-4.79,20.13s1.6,15.19,4.79,20.13c3.19,4.94,7.55,7.41,13.07,7.41Z"
                />
                <path
                  fill="#fff"
                  d="M524.71,127.84c-7.26,0-13.48-1.64-18.65-4.92-5.17-3.28-9.5-8.53-12.98-15.73h1.48v20.65h-29.02V0h30.5v49.93l-1.83-1.31c3.55-6.91,7.92-11.91,13.12-14.99,5.2-3.08,11.2-4.62,18-4.62,8.01,0,14.91,1.95,20.7,5.84,5.78,3.89,10.21,9.54,13.29,16.95,3.08,7.41,4.62,16.37,4.62,26.88s-1.55,19.27-4.66,26.62c-3.11,7.35-7.6,12.94-13.46,16.77-5.87,3.83-12.9,5.75-21.09,5.75ZM513.38,105.18c5.69,0,10.18-2.43,13.46-7.28,3.28-4.85,4.92-11.49,4.92-19.91s-1.6-14.78-4.79-19.43c-3.19-4.65-7.67-6.97-13.42-6.97-3.66,0-6.93,1-9.8,3.01-2.88,2-5.14,4.98-6.8,8.93-1.66,3.95-2.49,8.89-2.49,14.81,0,8.77,1.8,15.44,5.4,20,3.6,4.56,8.1,6.84,13.51,6.84Z"
                />
                <path
                  fill="#fff"
                  d="M639.57,127.84c-7.26,0-13.48-1.64-18.65-4.92-5.17-3.28-9.5-8.53-12.98-15.73h1.48v20.65h-29.02V0h30.5v49.93l-1.83-1.31c3.55-6.91,7.92-11.91,13.12-14.99,5.2-3.08,11.2-4.62,18-4.62,8.01,0,14.91,1.95,20.7,5.84,5.78,3.89,10.21,9.54,13.29,16.95,3.08,7.41,4.62,16.37,4.62,26.88s-1.55,19.27-4.66,26.62c-3.11,7.35-7.6,12.94-13.46,16.77-5.87,3.83-12.9,5.75-21.09,5.75ZM628.24,105.18c5.69,0,10.18-2.43,13.46-7.28,3.28-4.85,4.92-11.49,4.92-19.91s-1.6-14.78-4.79-19.43c-3.19-4.65-7.67-6.97-13.42-6.97-3.66,0-6.93,1-9.8,3.01-2.88,2-5.14,4.98-6.8,8.93-1.66,3.95-2.49,8.89-2.49,14.81,0,8.77,1.8,15.44,5.4,20,3.6,4.56,8.1,6.84,13.51,6.84Z"
                />
              </g>
              <g>
                <path
                  fill="#fff"
                  d="M85.23,85.23h-32.75c-2.04,0-3.94-.62-5.51-1.68-2.62-1.77-4.35-4.77-4.35-8.18v-32.75H9.86c-5.44,0-9.86,4.41-9.86,9.86v65.51c0,5.44,4.41,9.86,9.86,9.86h65.51c5.44,0,9.86-4.41,9.86-9.86v-32.75h0Z"
                />
                <path
                  fill="#c6c6c6"
                  d="M117.98,0H52.47c-5.44,0-9.86,4.41-9.86,9.86v32.75h32.75c1.73,0,3.33.48,4.75,1.27.35.19.7.39,1.02.63,2.47,1.79,4.09,4.68,4.09,7.96v32.75h32.75c5.44,0,9.86-4.41,9.86-9.86V9.86c0-5.44-4.41-9.86-9.86-9.86Z"
                />
                <path
                  fill="#5f5f5f"
                  d="M46.96,83.54c1.57,1.06,3.47,1.68,5.51,1.68h32.75v-32.75c0-3.28-1.62-6.17-4.09-7.96-.32-.23-.67-.43-1.02-.63-1.41-.78-3.02-1.27-4.75-1.27h-32.75v32.75c0,3.4,1.72,6.4,4.35,8.18Z"
                />
              </g>
            </svg>
          </button>
          <div className="navigation-anchor-items" aria-label="Navigation">
            <div className="route-tabs route-tabs-nav" role="tablist" aria-label="Pages">
              <button
                type="button"
                role="tab"
                aria-selected={route === "faq"}
                className={`route-tab ${route === "faq" ? "route-tab-active" : ""}`}
                onClick={() => changeRoute("faq")}
              >
                FAQ
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
                                Compare every color in your palette against every other color. The highlighted row and column show where{" "}
                                <strong>
                                  {activePaletteColorName} ({activePaletteColor})
                                </strong>{" "}
                                works as either text or background.
                              </p>
                              <p className="palette-compare-copy palette-compare-copy-list">
                                Compare{" "}
                                <strong>
                                  {activePaletteColorName} ({activePaletteColor})
                                </strong>{" "}
                                against the rest of your palette. Each row shows whether that pair works for normal text.
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
                                  const isFilteredOut = showPassingOnly && !passes;

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
                              const isFilteredOut = showPassingOnly && !passes;

                              if (isFilteredOut) {
                                return null;
                              }

                              return (
                                <button
                                  className={`palette-mobile-pair ${sameColor ? "palette-mobile-pair-same" : passes ? "palette-mobile-pair-pass" : "palette-mobile-pair-fail"}`}
                                  key={`${activePaletteColor}-${color}-${index}`}
                                  onClick={() => selectedColor(color)}
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
                                </button>
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
                            <span className="material-symbols-outlined">add_circle</span>
                            <p>Add your first color here.</p>
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
                          Export colors
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
                                  const isFilteredOut = showScalePassingOnly && !passes;

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
                            {scaleColors.map((item, index) => {
                              const contrast = getContrast(scaleCompareActiveColor, item.hex);
                              const passes = contrast >= 4.5;
                              const sameColor = scaleCompareActiveColor === item.hex;
                              const isFilteredOut = showScalePassingOnly && !passes;

                              if (isFilteredOut) {
                                return null;
                              }

                              return (
                                <button
                                  className={`palette-mobile-pair ${sameColor ? "palette-mobile-pair-same" : passes ? "palette-mobile-pair-pass" : "palette-mobile-pair-fail"}`}
                                  key={`scale-mobile-${scaleCompareActiveColor}-${item.hex}-${index}`}
                                  onClick={() => setActiveScaleCompareColor(item.hex)}
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
                                </button>
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
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <svg className="footer-logo-svg" role="img" aria-label="Blobb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 678.78 128.01">
              <g>
                <path
                  fill="#fff"
                  d="M176.06,127.84V0h58.73C249.95,0,261.13,2.65,268.34,7.93c7.2,5.29,10.8,12.93,10.8,22.92,0,6.62-1.31,11.87-3.92,15.73-2.61,3.87-5.87,6.74-9.76,8.63-3.89,1.89-7.76,3.12-11.59,3.7l.26-.35c9.06,1.45,16.12,4.82,21.18,10.11,5.05,5.29,7.58,12.61,7.58,21.96,0,8.83-2.09,18.14-6.28,23.22-4.18,5.09-9.72,8.69-16.6,10.81-6.88,2.12-14.36,3.18-22.44,3.18h-61.52ZM207.51,47.84h24.84c5.11,0,8.98-.94,11.59-2.83,2.61-1.89,3.92-4.89,3.92-9.02,0-3.54-1.1-6.41-3.31-8.58-2.21-2.18-6.22-3.27-12.03-3.27h-25.01v23.7ZM207.51,103.7h23.35c5.46,0,9.64-.68,12.55-2.05,2.9-1.36,4.91-3.22,6.01-5.58,1.1-2.35,1.66-7.31,1.66-10.15s-.61-5.53-1.83-7.88c-1.22-2.36-3.38-4.21-6.49-5.58-3.11-1.37-7.48-2.05-13.12-2.05h-22.13v33.29Z"
                />
                <path
                  fill="#fff"
                  d="M324.98,128.01c-8.31,0-14.53-1.89-18.65-5.67-4.12-3.77-6.19-9.38-6.19-16.82V0h30.59v101.35c0,1.97.28,3.28.83,3.92.55.64,1.73.96,3.53.96h6.45v21.79h-16.56Z"
                />
                <path
                  fill="#fff"
                  d="M399.66,127.84c-9.76,0-18.36-2.09-25.79-6.27-7.44-4.18-13.24-9.99-17.39-17.43-4.16-7.43-6.23-16-6.23-25.71s2.08-18.34,6.23-25.75c4.15-7.41,9.95-13.2,17.39-17.39,7.43-4.18,16.03-6.28,25.79-6.28s18.36,2.09,25.79,6.28c7.44,4.18,13.25,9.98,17.43,17.39,4.18,7.41,6.27,15.99,6.27,25.75s-2.09,18.34-6.27,25.75c-4.19,7.41-10.01,13.2-17.47,17.39s-16.05,6.27-25.75,6.27ZM399.75,105.97c5.46,0,9.79-2.47,12.98-7.41,3.2-4.94,4.79-11.65,4.79-20.13s-1.6-15.19-4.79-20.13c-3.19-4.94-7.55-7.41-13.07-7.41s-9.79,2.47-12.98,7.41c-3.2,4.94-4.79,11.65-4.79,20.13s1.6,15.19,4.79,20.13c3.19,4.94,7.55,7.41,13.07,7.41Z"
                />
                <path
                  fill="#fff"
                  d="M524.71,127.84c-7.26,0-13.48-1.64-18.65-4.92-5.17-3.28-9.5-8.53-12.98-15.73h1.48v20.65h-29.02V0h30.5v49.93l-1.83-1.31c3.55-6.91,7.92-11.91,13.12-14.99,5.2-3.08,11.2-4.62,18-4.62,8.01,0,14.91,1.95,20.7,5.84,5.78,3.89,10.21,9.54,13.29,16.95,3.08,7.41,4.62,16.37,4.62,26.88s-1.55,19.27-4.66,26.62c-3.11,7.35-7.6,12.94-13.46,16.77-5.87,3.83-12.9,5.75-21.09,5.75ZM513.38,105.18c5.69,0,10.18-2.43,13.46-7.28,3.28-4.85,4.92-11.49,4.92-19.91s-1.6-14.78-4.79-19.43c-3.19-4.65-7.67-6.97-13.42-6.97-3.66,0-6.93,1-9.8,3.01-2.88,2-5.14,4.98-6.8,8.93-1.66,3.95-2.49,8.89-2.49,14.81,0,8.77,1.8,15.44,5.4,20,3.6,4.56,8.1,6.84,13.51,6.84Z"
                />
                <path
                  fill="#fff"
                  d="M639.57,127.84c-7.26,0-13.48-1.64-18.65-4.92-5.17-3.28-9.5-8.53-12.98-15.73h1.48v20.65h-29.02V0h30.5v49.93l-1.83-1.31c3.55-6.91,7.92-11.91,13.12-14.99,5.2-3.08,11.2-4.62,18-4.62,8.01,0,14.91,1.95,20.7,5.84,5.78,3.89,10.21,9.54,13.29,16.95,3.08,7.41,4.62,16.37,4.62,26.88s-1.55,19.27-4.66,26.62c-3.11,7.35-7.6,12.94-13.46,16.77-5.87,3.83-12.9,5.75-21.09,5.75ZM628.24,105.18c5.69,0,10.18-2.43,13.46-7.28,3.28-4.85,4.92-11.49,4.92-19.91s-1.6-14.78-4.79-19.43c-3.19-4.65-7.67-6.97-13.42-6.97-3.66,0-6.93,1-9.8,3.01-2.88,2-5.14,4.98-6.8,8.93-1.66,3.95-2.49,8.89-2.49,14.81,0,8.77,1.8,15.44,5.4,20,3.6,4.56,8.1,6.84,13.51,6.84Z"
                />
              </g>
              <g>
                <path
                  fill="#fff"
                  d="M85.23,85.23h-32.75c-2.04,0-3.94-.62-5.51-1.68-2.62-1.77-4.35-4.77-4.35-8.18v-32.75H9.86c-5.44,0-9.86,4.41-9.86,9.86v65.51c0,5.44,4.41,9.86,9.86,9.86h65.51c5.44,0,9.86-4.41,9.86-9.86v-32.75h0Z"
                />
                <path
                  fill="#c6c6c6"
                  d="M117.98,0H52.47c-5.44,0-9.86,4.41-9.86,9.86v32.75h32.75c1.73,0,3.33.48,4.75,1.27.35.19.7.39,1.02.63,2.47,1.79,4.09,4.68,4.09,7.96v32.75h32.75c5.44,0,9.86-4.41,9.86-9.86V9.86c0-5.44-4.41-9.86-9.86-9.86Z"
                />
                <path
                  fill="#5f5f5f"
                  d="M46.96,83.54c1.57,1.06,3.47,1.68,5.51,1.68h32.75v-32.75c0-3.28-1.62-6.17-4.09-7.96-.32-.23-.67-.43-1.02-.63-1.41-.78-3.02-1.27-4.75-1.27h-32.75v32.75c0,3.4,1.72,6.4,4.35,8.18Z"
                />
              </g>
            </svg>
            <p>Palette-first tools for generating color scales and checking WCAG contrast.</p>
          </div>
          <div className="footer-links" aria-label="Footer links">
            <a className="github-button footer-github-button" href="https://github.com/Bompilez/Blobb" target="_blank" rel="noopener noreferrer">
              View on GitHub
              <span className="material-symbols-outlined" aria-hidden="true">
                open_in_new
              </span>
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
