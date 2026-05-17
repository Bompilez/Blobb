const FAQ_ITEMS = [
  {
    question: "What is Blobb.net for?",
    answer:
      "Blobb.net is a palette-first tool for designers and developers. Add the colors you already work with, then check which combinations are readable and what they can safely be used for in a UI.",
  },
  {
    question: "Why start with a palette?",
    answer:
      "Real interface work usually starts with brand colors, design tokens, or an existing palette. Blobb.net lets you test those colors against each other instead of judging isolated color pairs with no design context.",
  },
  {
    question: "What is WCAG and why should I care?",
    answer: (
      <>
        WCAG stands for Web Content Accessibility Guidelines. It helps make websites and digital interfaces easier to use for more people, including
        users with low vision, color vision deficiencies, tired eyes, bright sunlight, poor screens, or temporary impairments. Contrast requirements also
        make UI decisions clearer because you can tell whether a color pair is suitable for text, icons, controls, or decorative use only. You can read
        more in the{" "}
        <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer">
          official WCAG overview
        </a>
        .
      </>
    ),
  },
  {
    question: "Does this check full WCAG compliance?",
    answer: (
      <>
        No. It checks WCAG contrast ratios and common WCAG 2.2 contrast thresholds. Full accessibility also includes keyboard behavior, labels, focus
        order, semantics, zoom, motion, and assistive technology support. For the broader requirements, see the{" "}
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
    question: "What is the scale generator doing?",
    answer:
      "It creates lighter and darker steps from a selected base color so you can keep the same visual style across the UI. Those steps can be used for backgrounds, borders, hover states, selected states, and palette testing.",
  },
  {
    question: "Why can a nice color fail contrast?",
    answer:
      "Contrast depends on the relationship between two colors, not whether one color looks good alone. A soft color can work well on dark text but fail on white text, or the other way around.",
  },
];

function FaqPage() {
  return (
    <div className="faq-page">
      <header className="intro-section faq-intro-section">
        <div>
          <div>
            <h1>Frequently asked questions</h1>
            <p>
              Short answers about using your own palette to check contrast, understand what colors can be used for, and generate lighter or darker UI
              colors in the same style.
            </p>
          </div>
        </div>
      </header>
      <section className="faq-layout" aria-label="Frequently asked questions">
        <div className="faq-summary-panel">
          <p className="card-heading">Quick version</p>
          <p>
            Start with your palette, test the combinations, then use the scale generator when you need lighter and darker UI colors that still feel like
            part of the same system.
          </p>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

export default FaqPage;
