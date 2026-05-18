const TOOL_GUIDES = [
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
    steps: ["Choose a focus color.", "Switch between grid and list views.", "Turn on Focus passing pairs to hide failed combinations."],
    visual: "matrix",
  },
  {
    id: "scale-generator",
    title: "Scale generator",
    summary: "Generate lighter and darker steps from one selected color, then test the scale without replacing your palette.",
    why: "A scale gives one color more jobs. Lighter and darker steps can become surfaces, borders, hover states, active states, and readable pairings while still feeling related.",
    steps: ["Select a base color from your palette.", "Copy any generated step.", "Use Compare scale to scan the generated colors against each other."],
    visual: "scale",
  },
  {
    id: "export-code",
    title: "Export as code",
    summary: "Export the generated scale as CSS variables, a JS object, JSON tokens, or an Adobe Swatch Exchange file.",
    why: "Once the scale works, export turns the decision into something reusable. Designers can import swatches, and developers can paste tokens directly into a project.",
    steps: ["Open Export as code.", "Choose CSS, JS, or JSON.", "Choose HEX, RGB, or HSL values, then copy the snippet."],
    visual: "code",
  },
];

const FAQ_ITEMS = [
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
];

const GUIDE_GROUPS = [
  {
    title: "Palette setup",
    links: ["your-palette", "selected-colors"],
  },
  {
    title: "Contrast checking",
    links: ["manual-compare", "palette-compare", "inspect-color"],
  },
  {
    title: "Scale and export",
    links: ["scale-generator", "export-code"],
  },
];

const GUIDE_BY_ID = TOOL_GUIDES.reduce((guides, guide) => {
  guides[guide.id] = guide;
  return guides;
}, {});

const INDEX_LINKS = {
  ...GUIDE_BY_ID,
  "common-questions": {
    title: "Common questions",
  },
};

const INDEX_GROUPS = [
  ...GUIDE_GROUPS,
  {
    title: "Help and basics",
    links: ["common-questions"],
  },
];

function ToolVisual({ type }) {
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
            <span>Text</span>
            <strong>#1f2937</strong>
          </div>
          <div className="tool-visual-selected-card">
            <span>Background</span>
            <strong>#ededf9</strong>
          </div>
        </>
      )}
      {type === "manual" && (
        <>
          <div className="tool-visual-preview">Aa</div>
          <div className="tool-visual-meter">
            <strong>8.3:1</strong>
            <span>Pass</span>
          </div>
        </>
      )}
      {type === "inspect" && (
        <>
          <div className="tool-visual-inspect-preview">
            <strong>Aa</strong>
            <span>Draft color</span>
          </div>
          <div className="tool-visual-inspect-map">
            {Array.from({ length: 36 }, (_, index) => (
              <span className={index === 16 ? "tool-visual-current" : index % 3 === 0 || index > 26 ? "tool-visual-pass" : "tool-visual-fail"} key={index}>
                {index % 3 === 0 || index > 26 ? "check" : "close"}
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

function FaqPage() {
  return (
    <div className="faq-page">
      <header className="intro-section faq-intro-section">
        <div>
          <div>
            <h1>How Blobb works</h1>
            <p>Learn how the color tools in Blobb work together, from palettes and contrast checks to scales and exports.</p>
          </div>
        </div>
      </header>

      <section className="tool-guide-index" aria-label="Tool guide index">
        <div>
          <p className="card-heading">Tool index</p>
          <p>Jump to the part of the workflow you want to understand.</p>
        </div>
        <nav className="tool-guide-link-groups" aria-label="Tool guide links">
          {INDEX_GROUPS.map((group) => (
            <div className="tool-guide-link-group" key={group.title}>
              <p>{group.title}</p>
              <div className="tool-guide-links">
                {group.links.map((guideId, index) => (
                  <a href={`#${guideId}`} key={guideId}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{INDEX_LINKS[guideId].title}</strong>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </section>

      <section className="tool-guide-list" aria-label="Tool guides">
        {GUIDE_GROUPS.map((group) => (
          <section className="tool-guide-section" aria-labelledby={`${group.title.toLowerCase().replaceAll(" ", "-")}-title`} key={group.title}>
            <div className="tool-guide-section-heading">
              <p className="card-heading" id={`${group.title.toLowerCase().replaceAll(" ", "-")}-title`}>
                {group.title}
              </p>
            </div>
            <div className="tool-guide-section-cards">
              {group.links.map((guideId, index) => {
                const guide = GUIDE_BY_ID[guideId];
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
                        <summary>Why and how to use it</summary>
                        <p>{guide.why}</p>
                        <ul>
                          {guide.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                    <ToolVisual type={guide.visual} />
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <section className="tool-guide-section" id="common-questions" aria-labelledby="common-questions-title">
        <div className="tool-guide-section-heading">
          <p className="card-heading" id="common-questions-title">
            Common questions
          </p>
        </div>
        <div className="faq-layout faq-layout-compact" aria-label="Frequently asked questions">
          <div className="faq-summary-panel">
            <p className="card-heading">Quick answers</p>
            <p>Short answers about Blobb, WCAG, contrast ratios, and why palette context matters.</p>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default FaqPage;
