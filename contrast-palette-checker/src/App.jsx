import { useEffect, useRef, useState } from "react";
import "./App.css";

const DEFAULT_COLORS = ["#000000", "#FFFFFF", "#1D4ED8", "#0F766E", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#F472B6", "#111827"];
const DEFAULT_COLOR_NAMES = ["Black", "White", "Blue", "Teal", "Green", "Amber", "Red", "Violet", "Pink", "Gray"];

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

function rgbToHex(rgb) {
  function toHex(channel) {
    return channel.toString(16).padStart(2, "0");
  }

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
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
  const [colorInput, setColorInput] = useState("");
  const [colorNameInput, setColorNameInput] = useState("");
  const [compareMode, setCompareMode] = useState("manual");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [colorNames, setColorNames] = useState(DEFAULT_COLOR_NAMES);
  const [selectedColors, setSelectedColors] = useState([DEFAULT_COLORS[0], DEFAULT_COLORS[1]]);
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
  const cleanedColorInput = normalizeHex(colorInput);
  const canAddColor = colors.length < 10 && isValidHex(cleanedColorInput);
  const cleanedEditColorInput = normalizeHex(editColorInput);
  const canSaveEditColor = isValidHex(cleanedEditColorInput);
  const canComparePalette = colors.length >= 2;

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

  if (canComparePalette && selectedColors.length === 2) {
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

    setColors([...colors, input]);
    setColorNames([...colorNames, colorNameInput.trim()]);
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

  return (
    <>
      <nav className="navigation-container">
        <div className="navigation-content">
          <div className="logo-container">
            <span className="logo">Blobb.net</span>
          </div>
          <div className="navigation-anchor-items"></div>
        </div>
      </nav>
      <section className="section-width">
        <div className="content">
          <div>
            <div className="contrast-checker-section">
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
                      {colors.map((color, index) => {
                        const isSelected = selectedColors.includes(color);
                        const isEditing = editingColorIndex === index;
                        const isBackgroundColor = selectedColors[0] === color;
                        const isTextColor = selectedColors[1] === color;
                        return (
                          <div className={`palette-swatch-card ${isSelected ? "palette-swatch-card-selected" : ""}`} key={index}>
                            {isEditing ? (
                              <>
                                <input
                                  className="edit-color-name-input"
                                  placeholder="Color name"
                                  value={editColorNameInput}
                                  onChange={(e) => setEditColorNameInput(e.target.value)}
                                  autoFocus
                                />
                                <div className="color-preview" style={{ backgroundColor: canSaveEditColor ? cleanedEditColorInput : color }}></div>
                                <input className="edit-color-input" value={editColorInput} onChange={(e) => setEditColorInput(e.target.value)} />
                                <div className="edit-color-actions">
                                  <button className="edit-color-action-button" onClick={() => saveEditColor(index)} disabled={!canSaveEditColor}>
                                    <span className="material-symbols-outlined">check</span>
                                  </button>
                                  <button className="edit-color-action-button" onClick={cancelEditColor}>
                                    <span className="material-symbols-outlined">close</span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
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
                                  <button
                                    className="edit-color-button"
                                    onClick={() => startEditColor(index)}
                                    aria-label={`Edit ${getColorName(index)} ${color}`}
                                  >
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
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
                <div className="compare-mode-selector">
                  <div
                    className={`compare-mode-option ${compareMode === "manual" ? "compare-mode-option-active" : ""}`}
                    onClick={() => changeCompareMode("manual")}
                  >
                    <a>Manual compare</a>
                  </div>
                  <div
                    className={`compare-mode-option ${compareMode === "palette" ? "compare-mode-option-active" : ""}`}
                    onClick={() => changeCompareMode("palette")}
                  >
                    <a>Palette compare</a>
                  </div>
                </div>
                {compareMode === "manual" && !selectedContrast && (
                  <div className="select-color-result-container">
                    <div className="quiet-empty-state">
                      <span className="material-symbols-outlined">ads_click</span>
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
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">Blobb.net</span>
            <p>Quick contrast checks for palettes, UI colors, and readable interfaces.</p>
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
    </>
  );
}

export default App;
