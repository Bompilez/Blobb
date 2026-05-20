const SITE_ORIGIN = "https://blobb.net";

export const DEFAULT_LOCALE = "en";

export const LOCALES = {
  en: {
    label: "English",
    shortLabel: "EN",
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_US",
  },
  nb: {
    label: "Norsk",
    shortLabel: "NO",
    htmlLang: "nb",
    hreflang: "nb",
    ogLocale: "nb_NO",
  },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALES);

export const ROUTES = {
  contrast: {
    paths: {
      en: "/",
      nb: "/no/",
    },
  },
  scale: {
    paths: {
      en: "/scale-generator",
      nb: "/no/skalagenerator",
    },
  },
  helpFaq: {
    paths: {
      en: "/help",
      nb: "/no/hjelp",
    },
  },
};

export const LEGACY_PATHS = {
  "/Help&FAQ": { route: "helpFaq", locale: "en" },
  "/faq": { route: "helpFaq", locale: "en" },
};

export const PAGE_META = {
  contrast: {
    en: {
      title: "Contrast Palette Checker | WCAG Color Contrast Tool",
      description:
        "Check color contrast across your palette. Compare text and background pairs, scan palette combinations, and preview readable UI results against WCAG thresholds.",
    },
    nb: {
      title: "Kontrastsjekker for fargepaletter | WCAG-verktøy",
      description:
        "Sjekk fargekontrast i paletten din. Sammenlign tekst og bakgrunn, test palettkombinasjoner og se lesbare UI-resultater mot WCAG-krav.",
    },
  },
  scale: {
    en: {
      title: "Color Scale Generator | UI Palette Tool",
      description: "Generate light-to-dark scale steps from one base color, then compare contrast pairs and export the scale as tokens.",
    },
    nb: {
      title: "Fargeskalagenerator | Verktøy for UI-paletter",
      description: "Lag lyse og mørke skalatrinn fra en basefarge, sammenlign kontrastpar og eksporter skalaen som tokens.",
    },
  },
  helpFaq: {
    en: {
      title: "Help & FAQ | Blobb Color Tools",
      description:
        "Guides for palettes, contrast checking, scales, and exports, plus quick answers to common WCAG contrast questions.",
    },
    nb: {
      title: "Hjelp og FAQ | Blobb fargeverktøy",
      description: "Guider for paletter, kontrastsjekk, skalaer og eksport, pluss korte svar på vanlige spørsmål om WCAG-kontrast.",
    },
  },
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

export function getPathForRoute(route, locale = DEFAULT_LOCALE) {
  return ROUTES[route]?.paths[locale] ?? ROUTES.contrast.paths[DEFAULT_LOCALE];
}

export function getCanonicalUrl(route, locale = DEFAULT_LOCALE) {
  return `${SITE_ORIGIN}${getPathForRoute(route, locale)}`;
}

export function getPageMeta(route, locale = DEFAULT_LOCALE) {
  const safeRoute = PAGE_META[route] ? route : "contrast";
  const safeLocale = PAGE_META[safeRoute][locale] ? locale : DEFAULT_LOCALE;
  const localeConfig = LOCALES[safeLocale] ?? LOCALES[DEFAULT_LOCALE];

  return {
    ...PAGE_META[safeRoute][safeLocale],
    canonical: getCanonicalUrl(safeRoute, safeLocale),
    path: getPathForRoute(safeRoute, safeLocale),
    htmlLang: localeConfig.htmlLang,
    ogLocale: localeConfig.ogLocale,
  };
}

export function getRouteInfoFromPath(pathname = typeof window !== "undefined" ? window.location.pathname : "/") {
  const normalizedPath = normalizePath(pathname);

  if (LEGACY_PATHS[normalizedPath]) {
    return LEGACY_PATHS[normalizedPath];
  }

  for (const [route, config] of Object.entries(ROUTES)) {
    for (const locale of SUPPORTED_LOCALES) {
      if (normalizePath(config.paths[locale]) === normalizedPath) {
        return { route, locale };
      }
    }
  }

  return { route: "contrast", locale: DEFAULT_LOCALE };
}

export function getAlternateLinks(route) {
  const safeRoute = ROUTES[route] ? route : "contrast";
  const alternates = SUPPORTED_LOCALES.map((locale) => ({
    hreflang: LOCALES[locale].hreflang,
    href: getCanonicalUrl(safeRoute, locale),
  }));

  return [...alternates, { hreflang: "x-default", href: getCanonicalUrl(safeRoute, DEFAULT_LOCALE) }];
}

export function syncAlternateLinks(route) {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove());

  getAlternateLinks(route).forEach((alternate) => {
    const element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", alternate.hreflang);
    element.setAttribute("href", alternate.href);
    element.setAttribute("data-i18n-alternate", "true");
    document.head.appendChild(element);
  });
}

export function setMetaContent(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", value);
  }
}
