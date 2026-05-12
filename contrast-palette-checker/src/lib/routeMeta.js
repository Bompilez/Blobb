export const CONTRAST_PAGE_META = {
  title: "Blobb.net Contrast Palette Checker | WCAG Color Contrast Tool",
  description:
    "Check color contrast for UI palettes against WCAG guidelines. Compare foreground and background colors, scan full palettes, and preview readable interface combinations.",
  canonical: "https://blobb.net/",
};

export const SCALE_PAGE_META = {
  title: "Blobb.net Color Scale Generator | UI Palette Tool",
  description: "Generate a light-to-dark UI color scale from one base color, then copy CSS variables or use the palette for contrast checks.",
  canonical: "https://blobb.net/scale-generator",
};

export function getRouteFromPath() {
  if (typeof window !== "undefined" && window.location.pathname === "/scale-generator") {
    return "scale";
  }

  return "contrast";
}

export function setMetaContent(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute("content", value);
  }
}
