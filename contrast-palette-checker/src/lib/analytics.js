const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com";

let posthogClient = null;
let posthogReady = false;
let posthogInitPromise = null;
let posthogAllowed = false;

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
