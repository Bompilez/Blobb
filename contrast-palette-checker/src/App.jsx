import { useEffect, useRef, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import BrandMark from "./components/BrandMark";
import { DEFAULT_COLOR_NAMES, DEFAULT_COLORS, MAX_PALETTE_COLORS } from "./lib/paletteConstants";
import { getContrast, hexToHSL, hslToHex, isValidHex, normalizeHex } from "./lib/colorUtils";
import { getColorScale, getReadableTextColor, getScaleCssVariables, getScaleName } from "./lib/scaleUtils";
import { CONTRAST_PAGE_META, getRouteFromPath, SCALE_PAGE_META, setMetaContent } from "./lib/routeMeta";
import "./App.css";

// ===== APP =====
function App() {
  const [route, setRoute] = useState(getRouteFromPath);
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
  const canGenerateScale = Boolean(activePaletteColor) && isValidHex(activePaletteColor);
  const scaleColors = canGenerateScale ? getColorScale(activePaletteColor) : [];
  const scaleName = getScaleName(activePaletteColorName);
  const editingColor = editingColorIndex !== null ? colors[editingColorIndex] : "";
  const cleanedColorInput = normalizeHex(colorInput);
  const canAddColor = colors.length < MAX_PALETTE_COLORS && isValidHex(cleanedColorInput);
  const cleanedEditColorInput = normalizeHex(editColorInput);
  const canSaveEditColor = isValidHex(cleanedEditColorInput);
  const canComparePalette = colors.length >= 2;
  const isPaletteEmpty = colors.length === 0;

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
    function syncRoute() {
      setRoute(getRouteFromPath());
    }

    window.addEventListener("popstate", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  useEffect(() => {
    const meta = route === "scale" ? SCALE_PAGE_META : CONTRAST_PAGE_META;
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
    if (colors.length >= MAX_PALETTE_COLORS) {
      return;
    }

    const nextColors = [...colors, input];

    setColors(nextColors);
    setColorNames([...colorNames, colorNameInput.trim()]);
    if (route === "scale") {
      setActiveSelectedIndex(0);
    }
    setSelectedColors((currentSelectedColors) => {
      const validSelectedColors = currentSelectedColors.filter((color) => nextColors.includes(color));

      if (route === "scale") {
        return [input];
      }

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

  function navigateTo(nextRoute) {
    const path = nextRoute === "scale" ? "/scale-generator" : "/";

    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setRoute(nextRoute);
    window.scrollTo({ top: 0 });
  }

  async function copyText(text, copiedKey, event) {
    event?.stopPropagation();

    try {
      await navigator.clipboard.writeText(text);
      setCopiedColor(copiedKey);
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

  async function copyColor(color, event) {
    await copyText(color, color, event);
  }

  async function copyScaleCss(event) {
    if (!canGenerateScale) {
      return;
    }

    await copyText(getScaleCssVariables(scaleColors, scaleName), "scale-css", event);
  }

  async function copyDatasetColor(event) {
    const color = event.currentTarget.dataset.color;

    if (!color) {
      return;
    }

    await copyColor(color, event);
  }

  function useScaleInContrastChecker() {
    if (!canGenerateScale) {
      return;
    }

    setColors(scaleColors.map((color) => color.hex));
    setColorNames(scaleColors.map((color) => `${scaleName} ${color.step}`));
    setSelectedColors([scaleColors[9].hex, scaleColors[0].hex]);
    setActiveSelectedIndex(1);
    setCompareMode("manual");
    navigateTo("contrast");
  }

  function selectScaleBaseColor(color) {
    setSelectedColors([color]);
    setActiveSelectedIndex(0);
  }

  function renderPaletteSection(mode = "contrast") {
    const isScaleMode = mode === "scale";

    return (
      <div className={`color-palette-section ${isScaleMode ? "scale-palette-section" : ""}`}>
        <div className="color-palette-container">
          <div className="palette-toolbar">
            <div>
              <p className="card-heading">Your palette</p>
              <p className="palette-count">
                {colors.length}/{MAX_PALETTE_COLORS} colors
              </p>
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
          {isScaleMode && <p className="palette-helper-text">Select a color here to generate its light-to-dark scale.</p>}
          <div className="added-colors-container">
            {isPaletteEmpty && (
              <div className="palette-empty-callout">
                <span className="material-symbols-outlined">add_circle</span>
                <p>Add your first color here.</p>
              </div>
            )}
            {colors.map((color, index) => {
              const isSelected = isScaleMode ? activePaletteColor === color : selectedColors.includes(color);
              const isBackgroundColor = selectedColors[0] === color;
              const isTextColor = selectedColors[1] === color;
              const handleClick = isScaleMode ? () => selectScaleBaseColor(color) : () => handlePaletteColorClick(color);
              const handleDoubleClick = isScaleMode ? () => selectScaleBaseColor(color) : () => handlePaletteColorDoubleClick(color);

              return (
                <div className={`palette-swatch-card ${isSelected ? "palette-swatch-card-selected" : ""}`} key={index}>
                  <p className="palette-color-name">{getColorName(index)}</p>
                  <div className="palette-preview-shell">
                    <div
                      className={`color-preview ${isSelected ? "selected" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={handleClick}
                      onDoubleClick={handleDoubleClick}
                    ></div>
                    {isScaleMode && isSelected && (
                      <div className="palette-swatch-tags">
                        <span>Base</span>
                      </div>
                    )}
                    {!isScaleMode && compareMode === "manual" && (isBackgroundColor || isTextColor) && (
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
    );
  }

  function renderScaleGeneratorPage() {
    return (
      <div className={`scale-generator-section ${isPaletteEmpty ? "scale-generator-section-palette-empty" : ""}`}>
        <header className="intro-section">
          <div>
            <h1>Generate a clean color scale from one color</h1>
            <p>Turn a base color into a light-to-dark UI scale for backgrounds, borders, hover states, and readable interface palettes.</p>
          </div>
        </header>
        <div className="scale-generator-layout">
          {renderPaletteSection("scale")}
          <section className="scale-output-panel" aria-disabled={isPaletteEmpty}>
            <div className="scale-panel-header full-width">
              <div>
                <p className="card-heading">{canGenerateScale ? `${scaleName} scale` : "Generated scale"}</p>
                <p className="scale-panel-subtitle">
                  {canGenerateScale
                    ? `${activePaletteColor} is the 500 step. Generated from the selected palette color.`
                    : "Select or add a palette color to generate a scale."}
                </p>
              </div>
              <span className="scale-method-pill">OKLCH</span>
            </div>
            <div className="scale-actions scale-output-actions">
              <button className="scale-action-button" onClick={copyScaleCss} disabled={!canGenerateScale}>
                <span className="material-symbols-outlined">{copiedColor === "scale-css" ? "check" : "content_copy"}</span>
                Copy CSS variables
              </button>
              <button className="scale-action-button scale-action-primary" onClick={useScaleInContrastChecker} disabled={!canGenerateScale}>
                <span className="material-symbols-outlined">palette</span>
                Use scale in contrast checker
              </button>
            </div>
            {canGenerateScale ? (
              <div className="scale-swatch-list">
                {scaleColors.map((color) => (
                  <button
                    className="scale-swatch-row"
                    key={color.step}
                    data-color={color.hex}
                    style={{ backgroundColor: color.hex, color: getReadableTextColor(color.hex) }}
                    onClick={copyDatasetColor}
                  >
                    <span className="scale-swatch-name">
                      {scaleName} {color.step}
                    </span>
                    <span className="scale-swatch-hex">{color.hex}</span>
                    <span className="material-symbols-outlined">{copiedColor === color.hex ? "check" : "content_copy"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-panel-state">
                <span className="material-symbols-outlined">palette</span>
                <p>Add a color above, then select it to generate a light-to-dark scale.</p>
              </div>
            )}
          </section>
        </div>
      </div>
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
          <div className="logo-container">
            <BrandMark />
            <span className="logo">Blobb</span>
          </div>
          <div className="navigation-anchor-items">
            <button className={`navigation-link ${route === "contrast" ? "navigation-link-active" : ""}`} onClick={() => navigateTo("contrast")}>
              Contrast Checker
            </button>
            <button className={`navigation-link ${route === "scale" ? "navigation-link-active" : ""}`} onClick={() => navigateTo("scale")}>
              Scale Generator
            </button>
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
                  {renderPaletteSection("contrast")}
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
          ) : (
            renderScaleGeneratorPage()
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
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
