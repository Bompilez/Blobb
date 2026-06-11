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

export const PAGE_META_BY_LANGUAGE = {
  en: PAGE_META,
  no: {
    contrast: {
      title: "WCAG kontrastverktøy",
      description:
        "Sjekk fargekontrast i paletten din. Sammenlign tekst og bakgrunn, test palettkombinasjoner og forhåndsvis lesbare UI-resultater mot WCAG-krav.",
      canonical: "https://blobb.net/no",
      path: "/no",
    },
    scale: {
      title: "Generer fargeskala | UI-palettverktøy",
      description: "Generer lyse og mørke skalasteg fra én basefarge, sammenlign kontrastpar og eksporter skalaen som tokens.",
      canonical: "https://blobb.net/no/scale-generator",
      path: "/no/scale-generator",
    },
    helpFaq: {
      title: "Hjelp og FAQ | Blobb fargeverktøy",
      description: "Guider for paletter, kontrastsjekk, skalaer og eksport, pluss korte svar på vanlige spørsmål om WCAG-kontrast.",
      canonical: "https://blobb.net/no/Help&FAQ",
      path: "/no/Help&FAQ",
    },
  },
};

const HEX_PAIR_PATTERN = /^\/(?:no\/)?contrast\/([0-9a-fA-F]{3}|[0-9a-fA-F]{6})-vs-([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\/?$/;

const CORE_CONTRAST_PAIRS = [
  ["#000000", "#ffffff"],
  ["#ffffff", "#000000"],
  ["#111827", "#ffffff"],
  ["#ffffff", "#111827"],
  ["#1f2937", "#ededf9"],
  ["#ededf9", "#1f2937"],
  ["#484884", "#ffffff"],
  ["#5e5aa3", "#e9f6d5"],
  ["#7c3aed", "#ffffff"],
  ["#ffffff", "#7c3aed"],
  ["#2563eb", "#ffffff"],
  ["#ffffff", "#2563eb"],
  ["#dc2626", "#ffffff"],
  ["#ffffff", "#dc2626"],
  ["#16a34a", "#ffffff"],
  ["#ffffff", "#16a34a"],
  ["#f97316", "#111827"],
  ["#111827", "#f97316"],
  ["#facc15", "#111827"],
  ["#111827", "#facc15"],
  ["#ec4899", "#ffffff"],
  ["#ffffff", "#ec4899"],
  ["#06b6d4", "#111827"],
  ["#111827", "#06b6d4"],
  ["#f9fafb", "#374151"],
  ["#374151", "#f9fafb"],
  ["#e5e7eb", "#111827"],
  ["#111827", "#e5e7eb"],
  ["#0f172a", "#f8fafc"],
  ["#f8fafc", "#0f172a"],
  ["#18181b", "#fafafa"],
  ["#fafafa", "#18181b"],
];

const SEO_BASE_COLORS = [
  "#000000",
  "#ffffff",
  "#111827",
  "#1f2937",
  "#374151",
  "#4b5563",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
  "#e5e7eb",
  "#f3f4f6",
  "#f9fafb",
  "#0f172a",
  "#1e293b",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
  "#f1f5f9",
  "#f8fafc",
  "#18181b",
  "#27272a",
  "#3f3f46",
  "#71717a",
  "#a1a1aa",
  "#d4d4d8",
  "#e4e4e7",
  "#f4f4f5",
  "#fafafa",
  "#ef4444",
  "#dc2626",
  "#b91c1c",
  "#f87171",
  "#fee2e2",
  "#f97316",
  "#ea580c",
  "#c2410c",
  "#fb923c",
  "#ffedd5",
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#fbbf24",
  "#fef3c7",
  "#eab308",
  "#ca8a04",
  "#a16207",
  "#facc15",
  "#fef9c3",
  "#84cc16",
  "#65a30d",
  "#4d7c0f",
  "#a3e635",
  "#ecfccb",
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#4ade80",
  "#dcfce7",
  "#10b981",
  "#059669",
  "#047857",
  "#34d399",
  "#d1fae5",
  "#14b8a6",
  "#0d9488",
  "#0f766e",
  "#2dd4bf",
  "#ccfbf1",
  "#06b6d4",
  "#0891b2",
  "#0e7490",
  "#22d3ee",
  "#cffafe",
  "#0ea5e9",
  "#0284c7",
  "#0369a1",
  "#38bdf8",
  "#e0f2fe",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#60a5fa",
  "#dbeafe",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#818cf8",
  "#e0e7ff",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#a78bfa",
  "#ede9fe",
  "#a855f7",
  "#9333ea",
  "#7e22ce",
  "#c084fc",
  "#f3e8ff",
  "#d946ef",
  "#c026d3",
  "#a21caf",
  "#e879f9",
  "#fae8ff",
  "#ec4899",
  "#db2777",
  "#be185d",
  "#f472b6",
  "#fce7f3",
  "#f43f5e",
  "#e11d48",
  "#be123c",
  "#fb7185",
  "#ffe4e6",
  "#484884",
  "#5e5aa3",
  "#ededf9",
  "#e9f6d5",
  "#ffefcc",
];

const SEO_TEXT_COLORS = ["#ffffff", "#000000", "#111827", "#1f2937", "#374151", "#f9fafb", "#fafafa"];

function createSeoContrastPairs(limit = 500) {
  const pairs = [];
  const seen = new Set();

  function addPair(backgroundColor, textColor) {
    if (backgroundColor === textColor) {
      return;
    }

    const key = `${backgroundColor}-${textColor}`;
    if (seen.has(key) || pairs.length >= limit) {
      return;
    }

    seen.add(key);
    pairs.push([backgroundColor, textColor]);
  }

  CORE_CONTRAST_PAIRS.forEach(([backgroundColor, textColor]) => addPair(backgroundColor, textColor));

  SEO_TEXT_COLORS.forEach((textColor) => {
    SEO_BASE_COLORS.forEach((color) => {
      addPair(color, textColor);
      addPair(textColor, color);
    });
  });

  return pairs;
}

function expandShortHex(hex) {
  if (hex.length !== 3) {
    return hex;
  }

  return hex
    .split("")
    .map((char) => `${char}${char}`)
    .join("");
}

export const SEO_CONTRAST_PAIRS = createSeoContrastPairs(500);

export function buildContrastPairPath(backgroundColor, textColor, language = "en") {
  const background = backgroundColor.replace(/^#/, "").toLowerCase();
  const text = textColor.replace(/^#/, "").toLowerCase();
  const prefix = language === "no" ? "/no" : "";

  return `${prefix}/contrast/${background}-vs-${text}`;
}

function getLanguageFromPath(pathname) {
  return pathname === "/no" || pathname.startsWith("/no/") ? "no" : "en";
}

function getUnprefixedPath(pathname) {
  if (pathname === "/no") {
    return "/";
  }

  return pathname.startsWith("/no/") ? pathname.slice(3) : pathname;
}

export function parseContrastPairFromPath(pathname) {
  const match = pathname.match(HEX_PAIR_PATTERN);

  if (!match) {
    return null;
  }

  return {
    backgroundColor: `#${expandShortHex(match[1].toLowerCase())}`,
    textColor: `#${expandShortHex(match[2].toLowerCase())}`,
  };
}

export function getMetaForRoute(route, contrastPair = null, language = "en") {
  const metaByRoute = PAGE_META_BY_LANGUAGE[language] ?? PAGE_META_BY_LANGUAGE.en;

  if (route === "contrast" && contrastPair) {
    const { backgroundColor, textColor } = contrastPair;
    const path = buildContrastPairPath(backgroundColor, textColor, language);
    const title =
      language === "no"
        ? `Fungerer ${textColor} på ${backgroundColor}? Kontrastsjekk`
        : `Does ${textColor} Work on ${backgroundColor}? Color Contrast Checker`;
    const description =
      language === "no"
        ? `Sjekk om ${textColor} tekst fungerer på ${backgroundColor} bakgrunn. Se WCAG-kontrastforhold, AA- og AAA-resultater og UI-forhåndsvisning.`
        : `Check whether ${textColor} text works on a ${backgroundColor} background. See the WCAG contrast ratio, AA and AAA pass/fail results, and a live UI preview.`;

    return {
      title,
      description,
      canonical: `https://blobb.net${path}`,
      path,
      alternates: {
        en: `https://blobb.net${buildContrastPairPath(backgroundColor, textColor, "en")}`,
        no: `https://blobb.net${buildContrastPairPath(backgroundColor, textColor, "no")}`,
      },
    };
  }

  const meta = metaByRoute[route] ?? metaByRoute.contrast;
  const enMeta = PAGE_META_BY_LANGUAGE.en[route] ?? PAGE_META_BY_LANGUAGE.en.contrast;
  const noMeta = PAGE_META_BY_LANGUAGE.no[route] ?? PAGE_META_BY_LANGUAGE.no.contrast;

  return {
    ...meta,
    alternates: {
      en: enMeta.canonical,
      no: noMeta.canonical,
    },
  };
}

export function getRouteFromPath() {
  if (typeof window === "undefined") {
    return "contrast";
  }

  const pathname = getUnprefixedPath(window.location.pathname);

  if (parseContrastPairFromPath(window.location.pathname)) {
    return "contrast";
  }

  if (pathname === PAGE_META.scale.path) {
    return "scale";
  }

  if (pathname === PAGE_META.helpFaq.path || pathname === "/faq") {
    return "helpFaq";
  }

  return "contrast";
}

export function getRouteStateFromPath() {
  if (typeof window === "undefined") {
    return { route: "contrast", contrastPair: null };
  }

  return {
    route: getRouteFromPath(),
    contrastPair: parseContrastPairFromPath(window.location.pathname),
    language: getLanguageFromPath(window.location.pathname),
  };
}

export function setMetaContent(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", value);
  }
}
