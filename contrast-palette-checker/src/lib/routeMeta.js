export const PAGE_META = {
  contrast: {
    title: "Blobb.net Contrast Palette Checker | WCAG Color Contrast Tool",
    description:
      "Check color contrast for UI palettes against WCAG contrast thresholds. Compare foreground and background colors, scan palettes, and preview readable interface combinations.",
    canonical: "https://blobb.net/",
    path: "/",
  },
  scale: {
    title: "Blobb.net Color Scale Generator | UI Palette Tool",
    description: "Generate lighter and darker color steps from one base color, then use the palette for UI states and contrast checks.",
    canonical: "https://blobb.net/scale-generator",
    path: "/scale-generator",
  },
  faq: {
    title: "Blobb.net FAQ | Color Contrast and Palette Help",
    description:
      "Answers about checking colors from your own palette, WCAG contrast ratios, readable UI combinations, and generating lighter and darker color scales.",
    canonical: "https://blobb.net/faq",
    path: "/faq",
  },
};

export function getRouteFromPath() {
  if (typeof window === "undefined") {
    return "contrast";
  }

  if (window.location.pathname === PAGE_META.scale.path) {
    return "scale";
  }

  if (window.location.pathname === PAGE_META.faq.path) {
    return "faq";
  }

  return "contrast";
}

export function setMetaContent(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", value);
  }
}
