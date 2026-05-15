import { useEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import "./App.css";

const DEFAULT_COLORS = [];
const DEFAULT_COLOR_NAMES = [];

// ===== UTIL FUNCTIONS =====
function isValidHex(input) {
  const hex = input.startsWith("#") ? input.slice(1) : input;

  if (hex.length !== 3 && hex.length !== 6) {
    return false;
  }

  const split = hex.toLowerCase().split("");
  const allowedCharacters = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

  for (let i = 0; i < split.length; i++) {
    if (!allowedCharacters.includes(split[i])) {
      return false;
    }
  }

  return true;
}

function normalizeHex(input) {
  const cleanedInput = input.trim().toLowerCase();
  return cleanedInput.startsWith("#") ? cleanedInput : `#${cleanedInput}`;
}

function hexToRGB(color) {
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

  const decimalValueR = parseInt(r, 16);
  const decimalValueG = parseInt(g, 16);
  const decimalValueB = parseInt(b, 16);

  return { r: decimalValueR, g: decimalValueG, b: decimalValueB };
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

  const red = transform(r);
  const green = transform(g);
  const blue = transform(b);

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function getContrast(colorA, colorB) {
  const rgbA = hexToRGB(colorA);
  const rgbB = hexToRGB(colorB);

  const lumA = getLuminance(rgbA);
  const lumB = getLuminance(rgbB);

  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

function getReadableTextColor(hex) {
  if (!isValidHex(hex)) {
    return "#111827";
  }

  const lum = getLuminance(hexToRGB(hex));
  return lum > 0.45 ? "#111827" : "#ffffff";
}

function rgbToHex(rgb) {
  function toHex(channel) {
    return channel.toString(16).padStart(2, "0");
  }

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

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
  const rightSteps = (safeCount - 1) - leftSteps;
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

function hexToHSL(color) {
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

function hslToHex(hue, saturation, lightness) {
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

// ===== APP =====
function App() {
  const [route, setRoute] = useState("contrast");
  const [colorInput, setColorInput] = useState("");
  const [colorNameInput, setColorNameInput] = useState("");
  const [compareMode, setCompareMode] = useState("manual");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [colorNames, setColorNames] = useState(DEFAULT_COLOR_NAMES);
  const [selectedColors, setSelectedColors] = useState(DEFAULT_COLORS.slice(0, 2));
  const [activeSelectedIndex, setActiveSelectedIndex] = useState(0);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [editColorInput, setEditColorInput] = useState("");
  const [editColorNameInput, setEditColorNameInput] = useState("");
  const [copiedColor, setCopiedColor] = useState("");
  const [showPassingOnly, setShowPassingOnly] = useState(false);
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
    document.body.classList.toggle("modal-open", editingColorIndex !== null);

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [editingColorIndex]);

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
    return colorNames[index]?.trim() || `Color ${index + 1}`;
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

  function updateSelectedColorHue(selectedIndex, hue) {
    const selectedColor = selectedColors[selectedIndex];
    const hsl = hexToHSL(selectedColor);
    const newColor = hslToHex(Number(hue), hsl.s, hsl.l);

    updateSelectedColor(selectedIndex, newColor);
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
	          <div className="logo-container">
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
	          </div>
	          <div className="navigation-anchor-items" aria-label="Navigation">
              <div className="route-tabs" role="tablist" aria-label="Pages">
                <button
                  type="button"
                  role="tab"
                  aria-selected={route === "contrast"}
                  className={`route-tab ${route === "contrast" ? "route-tab-active" : ""}`}
                  onClick={() => setRoute("contrast")}
                >
                  Contrast checker
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={route === "scale"}
                  className={`route-tab ${route === "scale" ? "route-tab-active" : ""}`}
                  onClick={() => setRoute("scale")}
                >
                  Scale generator
                </button>
              </div>
            </div>
	        </div>
	      </nav>
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
                  </div>
                </div>
              </header>
              <div className={`top-grid ${compareMode === "palette" ? "top-grid-palette" : ""}`}>
                <div className="color-palette-section">
                  <div className="color-palette-container">
                    <div className="palette-toolbar">
                      <div>
                        <p className="card-heading">Your palette</p>
                        <p className="palette-count">{colors.length}/10 colors</p>
                      </div>
                      <div className="add-color-control">
                        <input
                          className="color-name-input"
                          placeholder="Color name"
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
                              <button className="delete-color-button" onClick={() => deleteColor(index)} aria-label={`Delete ${getColorName(index)} ${color}`}>
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                            <button className="copy-hex-button" onClick={(event) => copyColor(color, event)} aria-label={`Copy ${getColorName(index)} ${color}`}>
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
                      <p className="card-heading">Selected colors</p>
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
                        ].map((selectedColor) => {
                          const hue = hexToHSL(selectedColor.color).h;

                          return (
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
                                  <label>
                                    Hue
                                    <input
                                      className="hue-slider"
                                      type="range"
                                      min="0"
                                      max="359"
                                      value={hue}
                                      onChange={(e) => updateSelectedColorHue(selectedColor.selectedIndex, e.target.value)}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                        <p className="compare-info-text card-heading">Contrast</p>
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
                              {selectedContrast.passesLargeAA
                                ? "Can be used for large headings and bold display text."
                                : "Avoid for large text unless one of the colors is adjusted."}
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
                              {selectedContrast.passesSmallAA
                                ? "Can be used for body copy, labels, and smaller interface text."
                                : "Avoid for body copy, labels, form text, and small UI text."}
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
                                ? "Can be used for icons, button boundaries, controls, and visual indicators."
                                : "Avoid for icons, button states, focus indicators, and important graphics."}
                            </p>
                          </div>
                        </div>
                      </div>
                      <section className="preview-section">
                        <p className="card-heading">Preview</p>
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
                              <h3 className="preview-title">Design system card</h3>
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
                        <div className="palette-compare-intro">
                          <div>
                            <p className="card-heading">Palette compare</p>
                            <p>
                              Compare every color in your palette against every other color. The highlighted row and column show where{" "}
                              <strong>
                                {activePaletteColorName} ({activePaletteColor})
                              </strong>{" "}
                              works as either text or background.
                            </p>
                          </div>
                          <div className="palette-compare-legend" aria-label="Palette compare legend">
                            <span>
                              <span className="legend-dot legend-dot-pass"></span>
                              Pass 4.5:1
                            </span>
                            <span>
                              <span className="legend-dot legend-dot-fail"></span>
                              Fail
                            </span>
                          </div>
                        </div>
                        <div className="palette-compare-tools">
                          <label className="palette-pass-switch">
                            <input type="checkbox" checked={showPassingOnly} onChange={(e) => setShowPassingOnly(e.target.checked)} />
                            <span className="switch-track" aria-hidden="true">
                              <span className="switch-thumb"></span>
                            </span>
                            <span>Focus passing pairs</span>
                          </label>
                        </div>
                        <div className={`palette-compare-container ${showPassingOnly ? "palette-focus-mode" : ""}`}>
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
                        <div className={`palette-compare-mobile-list ${showPassingOnly ? "palette-focus-mode" : ""}`}>
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
          ) : (
          <div className="scale-generator-page">
            <header className="intro-section">
              <div>
                <div>
                  <h1>Generate a clean scale from one color</h1>
                  <p>Select a color from your palette to generate darker and lighter steps around it.</p>
                </div>
              </div>
            </header>
            <div className="top-grid">
              <div className="color-palette-section">
                <div className="color-palette-container">
                  <div className="palette-toolbar">
                    <div>
                      <p className="card-heading">Your palette</p>
                      <p className="palette-count">{colors.length}/10 colors</p>
                    </div>
                    <div className="add-color-control">
                      <input
                        className="color-name-input"
                        placeholder="Color name"
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
                            <button className="delete-color-button" onClick={() => deleteColor(index)} aria-label={`Delete ${getColorName(index)} ${color}`}>
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                          <button className="copy-hex-button" onClick={(event) => copyColor(color, event)} aria-label={`Copy ${getColorName(index)} ${color}`}>
                            <span>{color}</span>
                            <span className="material-symbols-outlined">{copiedColor === color ? "check" : "content_copy"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <section className="scale-generator-panel" aria-label="Scale generator">
                <div className="scale-generator-header">
                  <div>
                    <p className="card-heading">Scale</p>
                    <p className="scale-generator-subtitle">
                      {canGenerateScale ? (
                        <>
                          Scale around <span className="mono">{scaleBaseColor}</span>. Click any step to copy.
                        </>
                      ) : (
                        "Select a color in your palette to generate its scale."
                      )}
                    </p>
                  </div>
                </div>

                {canGenerateScale ? (
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
                ) : (
                  <div className="empty-panel-state">
                    <span className="material-symbols-outlined">palette</span>
                    <p>Select a color to generate a scale.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
          )}
        </div>
      </section>
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
              <button className="edit-color-action-button" onClick={() => saveEditColor(editingColorIndex)} disabled={!canSaveEditColor}>
                <span className="material-symbols-outlined">check</span>
                Save
              </button>
              <button className="edit-color-action-button" onClick={cancelEditColor}>
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
