export const PAGE_META = {
  contrast: {
    title: "Contrast Palette Checker | WCAG Color Contrast Tool",
    description:
      "Check color contrast across your palette. Compare text and background pairs, scan palette combinations, and preview readable UI results against WCAG thresholds.",
    canonical: "https://blobb.net/",
    path: "/",
  },
  scale: {
    title: "Color Scale Generator | UI Palette Tool",
    description: "Generate light-to-dark scale steps from one base color, then compare contrast pairs and export the scale as tokens.",
    canonical: "https://blobb.net/scale-generator",
    path: "/scale-generator",
  },
  helpFaq: {
    title: "Help & FAQ | Blobb Color Tools",
    description:
      "Guides for palettes, contrast checking, scales, and exports, plus quick answers to common WCAG contrast questions.",
    canonical: "https://blobb.net/Help&FAQ",
    path: "/Help&FAQ",
  },
};

export function getRouteFromPath() {
  if (typeof window === "undefined") {
    return "contrast";
  }

  if (window.location.pathname === PAGE_META.scale.path) {
    return "scale";
  }

  if (window.location.pathname === PAGE_META.helpFaq.path || window.location.pathname === "/faq") {
    return "helpFaq";
  }

  return "contrast";
}

export function setMetaContent(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", value);
  }
}
