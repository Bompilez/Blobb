import { DEFAULT_LOCALE } from "../lib/routeMeta";

const SHARED_INDEX_ORDER = [
  "common-questions",
  "your-palette",
  "selected-colors",
  "manual-compare",
  "palette-compare",
  "inspect-color",
  "scale-generator",
  "export-scale",
  "export-palette",
];

const INDEX_NUMBER_BY_ID = SHARED_INDEX_ORDER.reduce((numbers, id, index) => {
  numbers[id] = String(index + 1).padStart(2, "0");
  return numbers;
}, {});

const FAQ_CONTENT = {
  en: {
    introTitle: "Help & FAQ",
    introBody:
      "Explore how the Blobb color tools work, how to use them together, and find quick answers to common questions about WCAG contrast and accessibility.",
    toolIndexTitle: "Tool index",
    toolIndexBody: "Jump to quick answers or follow the workflow from palette setup through scale export.",
    toolIndexAria: "Tool guide index",
    toolLinksAria: "Tool guide links",
    commonQuestionsTitle: "Common questions",
    faqAria: "Frequently asked questions",
    quickAnswersTitle: "Quick answers",
    quickAnswersBody: "Short answers about Blobb, WCAG, and contrast ratios.",
    whySummary: "Why and how to use it",
    visualLabels: {
      text: "Text",
      background: "Background",
      draftColor: "Draft color",
      pass: "Pass",
    },
    indexGroups: [
      {
        title: "COMMON QUESTIONS",
        links: ["common-questions"],
      },
      {
        id: "palette-setup",
        title: "Palette setup",
        links: ["your-palette", "selected-colors"],
      },
      {
        id: "contrast-checking",
        title: "Contrast checking",
        links: ["manual-compare", "palette-compare", "inspect-color"],
      },
      {
        id: "scales-and-exports",
        title: "Scales and exports",
        links: ["scale-generator", "export-scale", "export-palette"],
      },
    ],
    guideGroups: [
      {
        id: "palette-setup",
        title: "Palette setup",
        links: ["your-palette", "selected-colors"],
      },
      {
        id: "contrast-checking",
        title: "Contrast checking",
        links: ["manual-compare", "palette-compare", "inspect-color"],
      },
      {
        id: "scales-and-exports",
        title: "Scales and exports",
        links: ["scale-generator", "export-scale", "export-palette"],
      },
    ],
    guides: [
      {
        id: "your-palette",
        title: "Your palette",
        summary: "Add up to 10 colors, name them, edit them, and use them as the shared source for the contrast checker and scale generator.",
        why: "Starting with your real palette keeps the checks close to actual design work. Instead of testing random pairs, you can see whether the colors you already plan to use can support text, UI states, and components.",
        steps: ["Add a color name and hex value.", "Click a swatch to select it.", "Double-click a swatch in manual compare to update the opposite slot."],
        visual: "palette",
      },
      {
        id: "selected-colors",
        title: "Selected colors",
        summary: "Manual compare uses two selected colors: one for text and one for background. The result panel updates as you change either color.",
        why: "A color pair has direction. Dark text on a pale background is not the same decision as pale text on a dark background, so Blobb keeps text and background as separate slots.",
        steps: [
          "Use Text and Background tabs to choose the active slot.",
          "Swap the two colors when you want to test the opposite relationship.",
          "Open Tune with contrast map to find safer alternatives.",
        ],
        visual: "selected",
      },
      {
        id: "inspect-color",
        title: "Inspect color map",
        summary: "The Tune with contrast map window helps you adjust one selected color while checking it against the opposite text or background color.",
        why: "Small HSL changes can turn a failing pair into a passing pair. The map makes those safe areas visible so you can adjust with intent instead of nudging values blindly.",
        steps: [
          "Open Tune with contrast map from Text color or Background color.",
          "The map shows possible colors: hue runs left to right, and lightness runs from light at the top to dark at the bottom.",
          "Checkmarks mean the candidate passes 4.5:1 against the opposite color. X marks mean it fails for normal text.",
          "The purple outline shows the closest position to your current draft color.",
          "Click a cell or adjust HSL to preview a draft. Nothing changes in the checker until you click Save color change.",
        ],
        visual: "inspect",
      },
      {
        id: "manual-compare",
        title: "Manual compare",
        summary: "Use manual compare when you want to inspect one foreground and background pair in detail.",
        why: "Manual compare is best when you are deciding whether one exact pairing can be used for body text, large text, icons, borders, focus states, or components.",
        steps: ["Pick two colors from your palette.", "Read the WCAG ratio and pass/fail checks.", "Use the preview examples to see how the pair behaves in UI."],
        visual: "manual",
      },
      {
        id: "palette-compare",
        title: "Palette compare",
        summary: "Scan your whole palette against itself to see which pairs pass for normal text.",
        why: "Palette compare helps you spot reusable combinations quickly. It is useful for building token rules like which colors can sit on brand surfaces or which accents need dark text.",
        steps: [
          "Choose a focus color.",
          "Switch between grid and list views.",
          "Turn on Focus passing pairs to reduce noise while keeping the focus color axis visible.",
        ],
        visual: "matrix",
      },
      {
        id: "scale-generator",
        title: "Scale generator",
        summary: "Generate lighter and darker steps from one selected color, then test the scale without replacing your palette.",
        why: "A scale gives one color more jobs. Lighter and darker steps can become surfaces, borders, hover states, active states, and readable pairings while still feeling related.",
        steps: [
          "Select a base color from your palette.",
          "Copy any generated step or export the full scale for developers.",
          "Use Compare scale to scan the generated colors against each other. In list view, pick the active scale color from the selector row above the list.",
        ],
        visual: "scale",
      },
      {
        id: "export-scale",
        title: "Export scale",
        summary: "Export a generated scale as CSS variables, a JS object, JSON tokens, or an Adobe Swatch Exchange (ASE) file.",
        why: "Once the scale works, export turns the decision into something reusable. Designers can import swatches, and developers can paste tokens directly into a project.",
        steps: ["Open Export scale.", "Choose CSS, JS, or JSON.", "Choose HEX, RGB, or HSL values, then copy the snippet or download ASE."],
        visual: "code",
      },
      {
        id: "export-palette",
        title: "Export palette",
        summary: "Export your palette as CSS variables, JSON tokens, or an Adobe Swatch Exchange (ASE) file.",
        why: "Export makes it easy to bring your palette into design tools and codebases, and to keep naming consistent across teams.",
        steps: [
          "Open Export palette from the contrast checker header (next to Manual compare / Palette compare).",
          "On mobile, open the three-dot menu in compare to find Export palette.",
          "Choose CSS or JSON, pick HEX/RGB/HSL, then copy the snippet or download ASE.",
        ],
        visual: "code",
      },
    ],
    faqItems: [
      {
        question: "What is Blobb for?",
        answer:
          "Blobb is a palette-first contrast tool for designers and developers. Add the colors you already work with, then check which combinations are readable and what they can safely be used for in a UI.",
      },
      {
        question: "Why start with a palette?",
        answer:
          "Real interface work usually starts with brand colors, design tokens, or an existing style guide. Testing the palette as a system helps you find useful pairings instead of judging isolated colors with no design context.",
      },
      {
        question: "What is WCAG and why should I care?",
        answer: (
          <>
            WCAG stands for Web Content Accessibility Guidelines. Contrast checks help make interfaces easier to use for more people, including users with low
            vision, color vision deficiencies, tired eyes, bright sunlight, or poor screens. Read more in the{" "}
            <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">
              official WCAG overview
            </a>
            .
          </>
        ),
      },
      {
        question: "What contrast ratio should I aim for?",
        answer:
          "For normal text, aim for at least 4.5:1. For large text and non-text UI elements like icons, controls, and focus indicators, aim for at least 3:1. AAA text targets are stricter.",
      },
      {
        question: "Does Blobb check full WCAG compliance?",
        answer:
          "No. Blobb checks color contrast ratios and common WCAG 2.2 contrast thresholds. Full accessibility also includes keyboard behavior, labels, focus order, semantics, zoom, motion, and assistive technology support.",
      },
      {
        question: "What is the scale generator doing?",
        answer:
          "It creates lighter and darker steps from a selected base color so you can keep the same visual style across the UI. Those steps can be used for backgrounds, borders, hover states, selected states, and palette testing.",
      },
      {
        question: "Why can a nice color fail contrast?",
        answer:
          "Contrast depends on the relationship between two colors, not whether one color looks good alone. A soft color can work well with dark text but fail with white text, or the other way around.",
      },
    ],
  },
  nb: {
    introTitle: "Hjelp og FAQ",
    introBody:
      "Se hvordan Blobb sine fargeverktøy fungerer, hvordan du bruker dem sammen, og få korte svar på vanlige spørsmål om WCAG-kontrast og tilgjengelighet.",
    toolIndexTitle: "Verktøyindeks",
    toolIndexBody: "Gå til korte svar eller følg arbeidsflyten fra palettoppsett til eksport av skala.",
    toolIndexAria: "Indeks for verktøyguider",
    toolLinksAria: "Lenker til verktøyguider",
    commonQuestionsTitle: "Vanlige spørsmål",
    faqAria: "Ofte stilte spørsmål",
    quickAnswersTitle: "Korte svar",
    quickAnswersBody: "Korte svar om Blobb, WCAG og kontrastforhold.",
    whySummary: "Hvorfor og hvordan du bruker det",
    visualLabels: {
      text: "Tekst",
      background: "Bakgrunn",
      draftColor: "Utkastfarge",
      pass: "Består",
    },
    indexGroups: [
      {
        title: "VANLIGE SPØRSMÅL",
        links: ["common-questions"],
      },
      {
        id: "palette-setup",
        title: "Palettoppsett",
        links: ["your-palette", "selected-colors"],
      },
      {
        id: "contrast-checking",
        title: "Kontrastsjekk",
        links: ["manual-compare", "palette-compare", "inspect-color"],
      },
      {
        id: "scales-and-exports",
        title: "Skalaer og eksport",
        links: ["scale-generator", "export-scale", "export-palette"],
      },
    ],
    guideGroups: [
      {
        id: "palette-setup",
        title: "Palettoppsett",
        links: ["your-palette", "selected-colors"],
      },
      {
        id: "contrast-checking",
        title: "Kontrastsjekk",
        links: ["manual-compare", "palette-compare", "inspect-color"],
      },
      {
        id: "scales-and-exports",
        title: "Skalaer og eksport",
        links: ["scale-generator", "export-scale", "export-palette"],
      },
    ],
    guides: [
      {
        id: "your-palette",
        title: "Din palett",
        summary: "Legg til opptil 10 farger, gi dem navn, rediger dem og bruk dem som felles grunnlag for kontrastsjekkeren og skalageneratoren.",
        why: "Når du starter med den faktiske paletten din, blir sjekkene nærmere reelt designarbeid. I stedet for å teste tilfeldige par ser du om fargene du allerede vil bruke, kan bære tekst, UI-tilstander og komponenter.",
        steps: ["Legg til fargenavn og hex-verdi.", "Klikk på en fargeprøve for å velge den.", "Dobbeltklikk på en farge i manuell sammenligning for å oppdatere motsatt felt."],
        visual: "palette",
      },
      {
        id: "selected-colors",
        title: "Valgte farger",
        summary: "Manuell sammenligning bruker to valgte farger: én for tekst og én for bakgrunn. Resultatpanelet oppdateres når du endrer en av dem.",
        why: "Et fargepar har retning. Mørk tekst på lys bakgrunn er ikke samme beslutning som lys tekst på mørk bakgrunn, derfor holder Blobb tekst og bakgrunn i egne felt.",
        steps: [
          "Bruk fanene Tekst og Bakgrunn for å velge aktivt felt.",
          "Bytt de to fargene når du vil teste motsatt forhold.",
          "Åpne Juster med kontrastkart for å finne tryggere alternativer.",
        ],
        visual: "selected",
      },
      {
        id: "inspect-color",
        title: "Kontrastkart",
        summary: "Vinduet Juster med kontrastkart hjelper deg å endre én valgt farge mens den testes mot motsatt tekst- eller bakgrunnsfarge.",
        why: "Små HSL-endringer kan gjøre et par som feiler til et par som består. Kartet gjør trygge områder synlige, slik at du justerer med intensjon i stedet for å gjette.",
        steps: [
          "Åpne Juster med kontrastkart fra Tekstfarge eller Bakgrunnsfarge.",
          "Kartet viser mulige farger: hue går fra venstre til høyre, og lyshet går fra lys øverst til mørk nederst.",
          "Haker betyr at kandidaten består 4.5:1 mot motsatt farge. Kryss betyr at den feiler for normal tekst.",
          "Den lilla rammen viser nærmeste posisjon til utkastfargen din.",
          "Klikk på en celle eller juster HSL for å forhåndsvise et utkast. Ingenting endres i sjekkeren før du klikker Lagre fargeendring.",
        ],
        visual: "inspect",
      },
      {
        id: "manual-compare",
        title: "Manuell sammenligning",
        summary: "Bruk manuell sammenligning når du vil undersøke ett konkret forgrunns- og bakgrunnspar.",
        why: "Manuell sammenligning passer best når du vurderer om ett eksakt par kan brukes til brødtekst, stor tekst, ikoner, kanter, fokusmarkeringer eller komponenter.",
        steps: ["Velg to farger fra paletten.", "Les WCAG-forholdet og resultatene for bestått/feilet.", "Bruk forhåndsvisningen for å se hvordan paret oppfører seg i et UI."],
        visual: "manual",
      },
      {
        id: "palette-compare",
        title: "Palettsammenligning",
        summary: "Skann hele paletten mot seg selv for å se hvilke par som består for normal tekst.",
        why: "Palettsammenligning hjelper deg å finne gjenbrukbare kombinasjoner raskt. Det er nyttig når du lager token-regler, for eksempel hvilke farger som kan ligge på brand-flater eller hvilke aksenter som trenger mørk tekst.",
        steps: [
          "Velg en fokusfarge.",
          "Bytt mellom rutenett- og listevisning.",
          "Slå på Fokuser på par som består for å redusere støy mens fokusfargeaksen fortsatt er synlig.",
        ],
        visual: "matrix",
      },
      {
        id: "scale-generator",
        title: "Skalagenerator",
        summary: "Lag lysere og mørkere trinn fra én valgt farge, og test skalaen uten å erstatte paletten.",
        why: "En skala gir én farge flere oppgaver. Lysere og mørkere trinn kan bli flater, kanter, hover-tilstander, aktive tilstander og lesbare par som fortsatt føles beslektet.",
        steps: [
          "Velg en basefarge fra paletten.",
          "Kopier et generert trinn eller eksporter hele skalaen for utviklere.",
          "Bruk Sammenlign skala for å skanne de genererte fargene mot hverandre. I listevisning velger du aktiv skalafarge fra velgeraden over listen.",
        ],
        visual: "scale",
      },
      {
        id: "export-scale",
        title: "Eksporter skala",
        summary: "Eksporter en generert skala som CSS-variabler, et JS-objekt, JSON-tokens eller en Adobe Swatch Exchange-fil (ASE).",
        why: "Når skalaen fungerer, gjør eksport beslutningen gjenbrukbar. Designere kan importere fargeprøver, og utviklere kan lime tokens rett inn i et prosjekt.",
        steps: ["Åpne Eksporter skala.", "Velg CSS, JS eller JSON.", "Velg HEX-, RGB- eller HSL-verdier, og kopier koden eller last ned ASE."],
        visual: "code",
      },
      {
        id: "export-palette",
        title: "Eksporter palett",
        summary: "Eksporter paletten som CSS-variabler, JSON-tokens eller en Adobe Swatch Exchange-fil (ASE).",
        why: "Eksport gjør det enkelt å ta paletten inn i designverktøy og kodebaser, og å holde navn konsekvente på tvers av team.",
        steps: [
          "Åpne Eksporter palett fra kontrastsjekkerens toppfelt, ved siden av Manuell sammenligning og Palettsammenligning.",
          "På mobil åpner du menyen med tre prikker i sammenligningen for å finne Eksporter palett.",
          "Velg CSS eller JSON, velg HEX/RGB/HSL, og kopier koden eller last ned ASE.",
        ],
        visual: "code",
      },
    ],
    faqItems: [
      {
        question: "Hva brukes Blobb til?",
        answer:
          "Blobb er et palettbasert kontrastverktøy for designere og utviklere. Legg inn fargene du allerede jobber med, og sjekk hvilke kombinasjoner som er lesbare og trygge å bruke i et UI.",
      },
      {
        question: "Hvorfor starte med en palett?",
        answer:
          "Reelt grensesnittarbeid starter ofte med brand-farger, designtokens eller en eksisterende stilguide. Når du tester paletten som et system, finner du nyttige kombinasjoner i stedet for å vurdere isolerte farger uten designkontekst.",
      },
      {
        question: "Hva er WCAG, og hvorfor bør jeg bry meg?",
        answer: (
          <>
            WCAG står for Web Content Accessibility Guidelines. Kontrastsjekker gjør grensesnitt enklere å bruke for flere, blant annet personer med nedsatt syn,
            fargesynsvansker, slitne øyne, sterkt sollys eller dårlige skjermer. Les mer i{" "}
            <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">
              den offisielle WCAG-oversikten
            </a>
            .
          </>
        ),
      },
      {
        question: "Hvilket kontrastforhold bør jeg sikte mot?",
        answer:
          "For normal tekst bør du sikte mot minst 4.5:1. For stor tekst og ikke-tekstlige UI-elementer som ikoner, kontroller og fokusmarkeringer bør du sikte mot minst 3:1. AAA-krav for tekst er strengere.",
      },
      {
        question: "Sjekker Blobb full WCAG-etterlevelse?",
        answer:
          "Nei. Blobb sjekker fargekontrast og vanlige WCAG 2.2-terskler for kontrast. Full tilgjengelighet handler også om tastaturnavigasjon, etiketter, fokusrekkefølge, semantikk, zoom, bevegelse og støtte for hjelpeteknologi.",
      },
      {
        question: "Hva gjør skalageneratoren?",
        answer:
          "Den lager lysere og mørkere trinn fra en valgt basefarge, slik at du kan beholde samme visuelle stil gjennom UI-et. Trinnene kan brukes til bakgrunner, kanter, hover-tilstander, valgte tilstander og palettesting.",
      },
      {
        question: "Hvorfor kan en fin farge feile kontrast?",
        answer:
          "Kontrast handler om forholdet mellom to farger, ikke om én farge ser bra ut alene. En myk farge kan fungere godt med mørk tekst, men feile med hvit tekst, eller motsatt.",
      },
    ],
  },
};

function getContent(locale) {
  return FAQ_CONTENT[locale] ?? FAQ_CONTENT[DEFAULT_LOCALE];
}

function getGuideMap(guides) {
  return guides.reduce((guidesById, guide) => {
    guidesById[guide.id] = guide;
    return guidesById;
  }, {});
}

function ToolVisual({ labels, type }) {
  return (
    <div className={`tool-visual tool-visual-${type}`} aria-hidden="true">
      {type === "palette" && (
        <>
          <span style={{ backgroundColor: "#5e5aa3" }}></span>
          <span style={{ backgroundColor: "#e9f6d5" }}></span>
          <span style={{ backgroundColor: "#ffefcc" }}></span>
          <span style={{ backgroundColor: "#1f2937" }}></span>
        </>
      )}
      {type === "selected" && (
        <>
          <div className="tool-visual-selected-card">
            <span>{labels.text}</span>
            <strong>#1f2937</strong>
          </div>
          <div className="tool-visual-selected-card">
            <span>{labels.background}</span>
            <strong>#ededf9</strong>
          </div>
        </>
      )}
      {type === "manual" && (
        <>
          <div className="tool-visual-preview">Aa</div>
          <div className="tool-visual-meter">
            <strong>8.3:1</strong>
            <span>{labels.pass}</span>
          </div>
        </>
      )}
      {type === "inspect" && (
        <>
          <div className="tool-visual-inspect-preview">
            <strong>Aa</strong>
            <span>{labels.draftColor}</span>
          </div>
          <div className="tool-visual-inspect-map">
            {Array.from({ length: 36 }, (_, index) => (
              <span
                className={
                  index === 16
                    ? "tool-visual-current tool-visual-pass"
                    : index % 3 === 0 || index > 26
                      ? "tool-visual-pass"
                      : "tool-visual-fail"
                }
                key={index}
              >
                {index === 16 || index % 3 === 0 || index > 26 ? "check" : "close"}
              </span>
            ))}
          </div>
        </>
      )}
      {type === "matrix" && (
        <>
          {Array.from({ length: 16 }, (_, index) => (
            <span className={index % 4 === 0 || index % 5 === 0 ? "tool-visual-pass" : "tool-visual-fail"} key={index}></span>
          ))}
        </>
      )}
      {type === "scale" && (
        <>
          {["#23213a", "#4b4882", "#5e5aa3", "#9e9bca", "#dfdef0"].map((color) => (
            <span style={{ backgroundColor: color }} key={color}></span>
          ))}
        </>
      )}
      {type === "code" && (
        <pre>
          <code>{`:root {\n  --violet-500: #5e5aa3;\n}`}</code>
        </pre>
      )}
    </div>
  );
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  window.history.replaceState({}, "", `#${sectionId}`);
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function FaqPage({ locale = DEFAULT_LOCALE }) {
  const content = getContent(locale);
  const guideById = getGuideMap(content.guides);
  const indexLinks = {
    ...guideById,
    "common-questions": {
      title: content.quickAnswersTitle,
    },
  };

  return (
    <div className="faq-page">
      <header className="intro-section faq-intro-section">
        <div>
          <div>
            <h1>{content.introTitle}</h1>
            <p>{content.introBody}</p>
          </div>
        </div>
      </header>

      <section className="tool-guide-index" aria-label={content.toolIndexAria}>
        <div>
          <p className="card-heading">{content.toolIndexTitle}</p>
          <p>{content.toolIndexBody}</p>
        </div>
        <nav className="tool-guide-link-groups" aria-label={content.toolLinksAria}>
          {content.indexGroups.map((group) => (
            <div className="tool-guide-link-group" key={group.title}>
              <p>{group.title}</p>
              <div className="tool-guide-links">
                {group.links.map((guideId) => (
                  <a
                    href={`#${guideId}`}
                    key={guideId}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(guideId);
                    }}
                  >
                    <span>{INDEX_NUMBER_BY_ID[guideId] ?? "00"}</span>
                    <strong>{indexLinks[guideId].title}</strong>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </section>

      <section className="tool-guide-section" id="common-questions" aria-labelledby="common-questions-title">
        <div className="tool-guide-section-heading">
          <p className="card-heading" id="common-questions-title">
            {content.commonQuestionsTitle}
          </p>
        </div>
        <div className="faq-layout faq-layout-compact" aria-label={content.faqAria}>
          <div className="faq-section-intro">
            <h3 className="card-heading tool-guide-card-heading">
              <span>{INDEX_NUMBER_BY_ID["common-questions"] ?? "01"}</span>
              {content.quickAnswersTitle}
            </h3>
            <p>{content.quickAnswersBody}</p>
          </div>
          <div className="faq-list">
            {content.faqItems.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="tool-guide-list" aria-label={content.toolLinksAria}>
        {content.guideGroups.map((group) => (
          <section className="tool-guide-section" aria-labelledby={`${group.id}-title`} key={group.id}>
            <div className="tool-guide-section-heading">
              <p className="card-heading" id={`${group.id}-title`}>
                {group.title}
              </p>
            </div>
            <div className="tool-guide-section-cards">
              {group.links.map((guideId, index) => {
                const guide = guideById[guideId];
                const guideNumber = String(index + 1).padStart(2, "0");

                return (
                  <article className="tool-guide-card" id={guide.id} key={guide.id}>
                    <div className="tool-guide-copy">
                      <h3 className="card-heading tool-guide-card-heading">
                        <span>{guideNumber}</span>
                        {guide.title}
                      </h3>
                      <p>{guide.summary}</p>
                      <details className="tool-guide-details">
                        <summary>{content.whySummary}</summary>
                        <p>{guide.why}</p>
                        <ul>
                          {guide.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                    <ToolVisual labels={content.visualLabels} type={guide.visual} />
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </div>
  );
}

export default FaqPage;
