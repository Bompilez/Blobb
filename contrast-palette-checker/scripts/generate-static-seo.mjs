import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getContrast } from "../src/lib/colorUtils.js";
import { buildContrastPairPath, SEO_CONTRAST_PAIRS, getMetaForRoute, PAGE_META_BY_LANGUAGE } from "../src/lib/routeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const siteUrl = "https://blobb.net";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function setTagContent(html, selector, content) {
  const escapedContent = escapeHtml(content);

  if (selector === "title") {
    return html.replace(/<title>.*?<\/title>/s, `<title>${escapedContent}</title>`);
  }

  const patterns = {
    description: /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    ogUrl: /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    ogTitle: /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    ogDescription: /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    twitterTitle: /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    twitterDescription: /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    canonical: /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
  };

  const replacements = {
    description: `<meta name="description" content="${escapedContent}" />`,
    ogUrl: `<meta property="og:url" content="${escapedContent}" />`,
    ogTitle: `<meta property="og:title" content="${escapedContent}" />`,
    ogDescription: `<meta property="og:description" content="${escapedContent}" />`,
    twitterTitle: `<meta name="twitter:title" content="${escapedContent}" />`,
    twitterDescription: `<meta name="twitter:description" content="${escapedContent}" />`,
    canonical: `<link rel="canonical" href="${escapedContent}" />`,
  };

  return html.replace(patterns[selector], replacements[selector]);
}

function setHtmlLang(html, language) {
  return html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${escapeHtml(language)}"`);
}

function setAlternateLinks(html, alternates) {
  return html
    .replace(/<link\s+rel="alternate"\s+hreflang="en"\s+href="[^"]*"\s*\/?>/i, `<link rel="alternate" hreflang="en" href="${escapeHtml(alternates.en)}" />`)
    .replace(/<link\s+rel="alternate"\s+hreflang="no"\s+href="[^"]*"\s*\/?>/i, `<link rel="alternate" hreflang="no" href="${escapeHtml(alternates.no)}" />`)
    .replace(
      /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates.en)}" />`,
    );
}

function injectRootContent(html, content) {
  const rootElement = '<div id="root"></div>';

  if (!html.includes(rootElement)) {
    throw new Error("Unable to inject static SEO content: root element not found in dist/index.html");
  }

  return html.replace(rootElement, `<div id="root">${content}</div>`);
}

function getContrastStatus(contrast, language = "en") {
  if (language === "no") {
    if (contrast >= 7) {
      return "består WCAG AAA for normal tekst";
    }

    if (contrast >= 4.5) {
      return "består WCAG AA for normal tekst";
    }

    if (contrast >= 3) {
      return "består WCAG AA for stor tekst og UI-grafikk, men feiler for normal tekst";
    }

    return "feiler vanlige WCAG-kontrastkrav for tekst";
  }

  if (contrast >= 7) {
    return "passes WCAG AAA for normal text";
  }

  if (contrast >= 4.5) {
    return "passes WCAG AA for normal text";
  }

  if (contrast >= 3) {
    return "passes WCAG AA for large text and UI graphics, but fails normal text";
  }

  return "fails common WCAG contrast thresholds for text";
}

function buildStaticSummary({ backgroundColor, textColor }, language = "en") {
  const contrast = getContrast(backgroundColor, textColor);
  const status = getContrastStatus(contrast, language);

  if (language === "no") {
    return `
      <main id="static-seo-content" style="font-family: system-ui, sans-serif; max-width: 760px; margin: 48px auto; padding: 0 24px; line-height: 1.6;">
        <p style="font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #555;">Svar på fargekontrast</p>
        <h1>Fungerer ${escapeHtml(textColor)} på ${escapeHtml(backgroundColor)}?</h1>
        <p>
          ${escapeHtml(textColor)} tekst på ${escapeHtml(backgroundColor)} bakgrunn har kontrastforhold
          <strong>${contrast.toFixed(2)}:1</strong>, så den <strong>${escapeHtml(status)}</strong>.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; min-height: 160px;">
          <div style="background: ${escapeHtml(backgroundColor)}; color: ${escapeHtml(textColor)}; padding: 24px;">
            <strong>Eksempeltekst</strong>
            <p>Lesbar UI-forhåndsvisning</p>
          </div>
          <div style="background: ${escapeHtml(textColor)}; color: ${escapeHtml(backgroundColor)}; padding: 24px;">
            <strong>Omvendt par</strong>
            <p>Sjekk begge retninger i Blobb.</p>
          </div>
        </div>
        <p>Åpne denne siden med JavaScript aktivert for å redigere fargene, justere paret og sammenligne det mot en hel palett.</p>
      </main>`;
  }

  return `
    <main id="static-seo-content" style="font-family: system-ui, sans-serif; max-width: 760px; margin: 48px auto; padding: 0 24px; line-height: 1.6;">
      <p style="font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #555;">Color contrast answer</p>
      <h1>Does ${escapeHtml(textColor)} work on ${escapeHtml(backgroundColor)}?</h1>
      <p>
        ${escapeHtml(textColor)} text on a ${escapeHtml(backgroundColor)} background has a contrast ratio of
        <strong>${contrast.toFixed(2)}:1</strong>, so it <strong>${escapeHtml(status)}</strong>.
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; min-height: 160px;">
        <div style="background: ${escapeHtml(backgroundColor)}; color: ${escapeHtml(textColor)}; padding: 24px;">
          <strong>Sample text</strong>
          <p>Readable UI preview</p>
        </div>
        <div style="background: ${escapeHtml(textColor)}; color: ${escapeHtml(backgroundColor)}; padding: 24px;">
          <strong>Reversed pair</strong>
          <p>Check both directions in Blobb.</p>
        </div>
      </div>
      <p>Open this page with JavaScript enabled to edit the colors, tune the pair, and compare it against a full palette.</p>
    </main>`;
}

function applyMeta(template, meta, language) {
  let html = setHtmlLang(template, language);
  html = setTagContent(html, "title", meta.title);
  html = setTagContent(html, "description", meta.description);
  html = setTagContent(html, "canonical", meta.canonical);
  html = setTagContent(html, "ogUrl", meta.canonical);
  html = setTagContent(html, "ogTitle", meta.title);
  html = setTagContent(html, "ogDescription", meta.description);
  html = setTagContent(html, "twitterTitle", meta.title);
  html = setTagContent(html, "twitterDescription", meta.description);
  html = setAlternateLinks(html, meta.alternates);

  return html;
}

function buildLandingPage(template, route, language) {
  const meta = getMetaForRoute(route, null, language);

  return applyMeta(template, meta, language);
}

function buildContrastPage(template, contrastPair, language) {
  const meta = getMetaForRoute("contrast", contrastPair, language);
  const staticSummary = buildStaticSummary(contrastPair, language);

  return injectRootContent(applyMeta(template, meta, language), staticSummary);
}

function buildSitemap() {
  const urls = [
    PAGE_META_BY_LANGUAGE.en.contrast.canonical,
    PAGE_META_BY_LANGUAGE.en.scale.canonical,
    PAGE_META_BY_LANGUAGE.en.helpFaq.canonical,
    PAGE_META_BY_LANGUAGE.no.contrast.canonical,
    PAGE_META_BY_LANGUAGE.no.scale.canonical,
    PAGE_META_BY_LANGUAGE.no.helpFaq.canonical,
    ...SEO_CONTRAST_PAIRS.flatMap(([backgroundColor, textColor]) => [
      `${siteUrl}${buildContrastPairPath(backgroundColor, textColor, "en")}`,
      `${siteUrl}${buildContrastPairPath(backgroundColor, textColor, "no")}`,
    ]),
  ];

  const uniqueUrls = [...new Set(urls)];
  const entries = uniqueUrls.map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");

  await Promise.all(
    [
      ["scale", "en"],
      ["helpFaq", "en"],
      ["contrast", "no"],
      ["scale", "no"],
      ["helpFaq", "no"],
    ].map(async ([route, language]) => {
      const meta = getMetaForRoute(route, null, language);
      const outputDir = path.join(distDir, meta.path.replace(/^\//, ""));
      const html = buildLandingPage(template, route, language);

      await mkdir(outputDir, { recursive: true });
      await writeFile(path.join(outputDir, "index.html"), html);
    }),
  );

  await Promise.all(
    [
      ...SEO_CONTRAST_PAIRS.map(async ([backgroundColor, textColor]) => {
        const routePath = buildContrastPairPath(backgroundColor, textColor, "en");
        const outputDir = path.join(distDir, routePath.replace(/^\//, ""));
        const html = buildContrastPage(template, { backgroundColor, textColor }, "en");

        await mkdir(outputDir, { recursive: true });
        await writeFile(path.join(outputDir, "index.html"), html);
      }),
      ...SEO_CONTRAST_PAIRS.map(async ([backgroundColor, textColor]) => {
        const routePath = buildContrastPairPath(backgroundColor, textColor, "no");
        const outputDir = path.join(distDir, routePath.replace(/^\//, ""));
        const html = buildContrastPage(template, { backgroundColor, textColor }, "no");

        await mkdir(outputDir, { recursive: true });
        await writeFile(path.join(outputDir, "index.html"), html);
      }),
    ],
  );

  const sitemap = buildSitemap();
  await writeFile(path.join(distDir, "sitemap.xml"), sitemap);
  await writeFile(path.join(rootDir, "public", "sitemap.xml"), sitemap);

  console.log(`Generated ${SEO_CONTRAST_PAIRS.length * 2} localized static contrast pages and sitemap.xml`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
