const posthogKey = import.meta.env.VITE_POSTHOG_KEY || "phc_nhwX9GgdedGoixZWZwGghUZSLLjYCkbJZ22SUqLKNftD";
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-HMZ96EEJWD";
const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID || "AW-18205772271";

let posthogClient = null;
let posthogReady = false;
let posthogInitPromise = null;
let posthogAllowed = false;
let googleAnalyticsReady = false;
let googleAnalyticsInitPromise = null;
let googleAnalyticsAllowed = false;

const googleEventNames = {
  "Palette Created": "palette_created",
  "Contrast Checked": "contrast_checked",
  "Scale Generated": "scale_generated",
  "Export Clicked": "export_clicked",
  "FAQ Visited": "faq_visited",
};

export async function initPostHog() {
  if (!posthogKey || posthogReady) {
    return;
  }

  if (posthogInitPromise) {
    return posthogInitPromise;
  }

  posthogInitPromise = loadPostHog();
  return posthogInitPromise;
}

async function loadPostHog() {
  const { default: posthog } = await import("posthog-js");

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    person_profiles: "identified_only",
  });

  posthogClient = posthog;
  posthogReady = true;

  if (posthogAllowed) {
    posthogClient.opt_in_capturing?.();
  } else {
    posthogClient.opt_out_capturing?.();
  }
}

export function isPostHogReady() {
  return posthogReady;
}

export function setPostHogConsent(isAllowed) {
  posthogAllowed = isAllowed;

  if (!posthogReady) {
    return;
  }

  if (isAllowed) {
    posthogClient.opt_in_capturing?.();
  } else {
    posthogClient.opt_out_capturing?.();
  }
}

export function capturePostHogEvent(eventName, properties = {}) {
  if (!posthogReady || !posthogAllowed) {
    return;
  }

  posthogClient.capture(eventName, properties);
}

export async function initGoogleAnalytics() {
  if ((!gaMeasurementId && !googleAdsId) || googleAnalyticsReady) {
    return;
  }

  if (googleAnalyticsInitPromise) {
    return googleAnalyticsInitPromise;
  }

  googleAnalyticsInitPromise = loadGoogleAnalytics();
  return googleAnalyticsInitPromise;
}

async function loadGoogleAnalytics() {
  await loadGoogleTagScript(gaMeasurementId || googleAdsId);

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("js", new Date());
  window.gtag("consent", "default", {
    ad_storage: googleAnalyticsAllowed ? "granted" : "denied",
    ad_user_data: googleAnalyticsAllowed ? "granted" : "denied",
    ad_personalization: googleAnalyticsAllowed ? "granted" : "denied",
    analytics_storage: googleAnalyticsAllowed ? "granted" : "denied",
  });

  if (gaMeasurementId) {
    window.gtag("config", gaMeasurementId, { send_page_view: false });
  }

  if (googleAdsId) {
    window.gtag("config", googleAdsId);
  }

  googleAnalyticsReady = true;
}

function loadGoogleTagScript(tagId) {
  if (document.querySelector(`script[data-blobb-google-tag="${tagId}"]`)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
    script.dataset.blobbGoogleTag = tagId;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

export function setGoogleAnalyticsConsent(isAllowed) {
  googleAnalyticsAllowed = isAllowed;

  if (!googleAnalyticsReady || !window.gtag) {
    return;
  }

  window.gtag("consent", "update", {
    ad_storage: isAllowed ? "granted" : "denied",
    ad_user_data: isAllowed ? "granted" : "denied",
    ad_personalization: isAllowed ? "granted" : "denied",
    analytics_storage: isAllowed ? "granted" : "denied",
  });
}

export function captureGoogleAnalyticsEvent(eventName, properties = {}) {
  if (!googleAnalyticsReady || !googleAnalyticsAllowed || !window.gtag) {
    return;
  }

  window.gtag("event", googleEventNames[eventName] || toGoogleEventName(eventName), normalizeGoogleAnalyticsProperties(properties));
}

export function captureGoogleAnalyticsPageView(properties = {}) {
  if (!googleAnalyticsReady || !googleAnalyticsAllowed || !window.gtag || !gaMeasurementId) {
    return;
  }

  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
    ...normalizeGoogleAnalyticsProperties(properties),
  });
}

function toGoogleEventName(eventName) {
  const fallbackName = eventName
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return /^[a-z]/.test(fallbackName) ? fallbackName.slice(0, 40) : `event_${fallbackName}`.slice(0, 40);
}

function normalizeGoogleAnalyticsProperties(properties) {
  return Object.entries(properties).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    const normalizedKey = key
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 40);

    acc[normalizedKey] = typeof value === "boolean" ? String(value) : value;
    return acc;
  }, {});
}
