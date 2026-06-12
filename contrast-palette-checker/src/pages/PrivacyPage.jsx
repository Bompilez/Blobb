import { getTranslation } from "../lib/i18n";

function PrivacyPage({ analyticsConsent, language = "en", onConsentChange }) {
  const t = getTranslation(language);
  const consentLabel =
    analyticsConsent === "accepted"
      ? t.cookieConsent.accepted
      : analyticsConsent === "declined"
        ? t.cookieConsent.declined
        : t.cookieConsent.statusPending;

  return (
    <div className="faq-page privacy-page">
      <header className="intro-section faq-intro-section">
        <div>
          <div>
            <h1>{t.privacy.title}</h1>
            <p>{t.privacy.intro}</p>
          </div>
        </div>
      </header>

      <section className="tool-guide-index privacy-overview-panel" aria-label={t.privacy.title}>
        <div>
          <p className="card-heading">{t.privacy.updated}</p>
          <p>{t.privacy.contact}</p>
        </div>
        <div aria-hidden="true"></div>
      </section>

      <section className="tool-guide-section" aria-labelledby="privacy-sections-title">
        <div className="tool-guide-section-heading">
          <p className="card-heading" id="privacy-sections-title">
            {t.privacy.title}
          </p>
        </div>
        <div className="tool-guide-section-cards privacy-section-cards">
          {t.privacy.sections.map((section, index) => (
            <article className="tool-guide-card privacy-info-card" key={section.title}>
              <div className="tool-guide-copy">
                <h2 className="card-heading tool-guide-card-heading">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                <p>{section.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tool-guide-section" aria-labelledby="privacy-choice-title">
        <div className="tool-guide-section-heading">
          <p className="card-heading" id="privacy-choice-title">
            {t.privacy.currentChoice}
          </p>
        </div>
        <div className="privacy-choice-panel" aria-label={t.privacy.currentChoice}>
          <div>
            <span>{t.privacy.currentChoice}</span>
            <strong>{consentLabel}</strong>
          </div>
          <div className="privacy-choice-actions">
            <button
              type="button"
              className={`cookie-action-button ${
                analyticsConsent === "accepted" ? "cookie-action-selected cookie-action-selected-accepted" : "cookie-action-primary"
              }`}
              aria-pressed={analyticsConsent === "accepted"}
              onClick={() => onConsentChange("accepted")}
            >
              {t.cookieConsent.accept}
            </button>
            <button
              type="button"
              className={`cookie-action-button ${
                analyticsConsent === "declined" ? "cookie-action-selected cookie-action-selected-declined" : "cookie-action-secondary"
              }`}
              aria-pressed={analyticsConsent === "declined"}
              onClick={() => onConsentChange("declined")}
            >
              {t.cookieConsent.decline}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PrivacyPage;
