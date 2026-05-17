import { getReadableTextColor } from "../lib/colorUtils";
import { getDarkModeSuggestions, simulateColorVision, VISION_MODES } from "../lib/visionUtils";

function VisionToolsPage({ colors, getColorName, copyColor }) {
  const isPaletteEmpty = colors.length === 0;
  const darkModeSuggestions = getDarkModeSuggestions(colors, getColorName);

  return (
    <div className="vision-tools-page">
      <header className="intro-section vision-intro-section">
        <div>
          <div>
            <h1>Preview your palette in real UI conditions</h1>
            <p>Generate dark mode equivalents from your palette and preview how colors may appear for common color vision differences.</p>
          </div>
        </div>
      </header>
      <div className="vision-tools-layout">
        <section className="vision-panel">
          <div className="vision-panel-header">
            <div>
              <p className="card-heading">Dark mode suggestions</p>
              <p>Suggested darker equivalents with readable text colors for dark UI surfaces.</p>
            </div>
          </div>
          {isPaletteEmpty ? (
            <div className="empty-panel-state">
              <span className="material-symbols-outlined">dark_mode</span>
              <p>Add colors to your palette first.</p>
            </div>
          ) : (
            <div className="dark-mode-suggestion-list">
              {darkModeSuggestions.map((item) => (
                <div className="dark-mode-suggestion-row" key={`${item.name}-${item.original}`}>
                  <div className="dark-mode-original" style={{ backgroundColor: item.original, color: getReadableTextColor(item.original) }}>
                    <span>{item.original}</span>
                  </div>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                  <button
                    type="button"
                    className="dark-mode-result"
                    style={{ backgroundColor: item.darkColor, color: item.textColor }}
                    onClick={(event) => copyColor(item.darkColor, event)}
                    aria-label={`Copy dark mode suggestion ${item.darkColor}`}
                  >
                    <span>{item.name}</span>
                    <strong>{item.darkColor}</strong>
                    <small>{item.contrast.toFixed(1)}:1 with text</small>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="vision-panel">
          <div className="vision-panel-header">
            <div>
              <p className="card-heading">Color blindness preview</p>
              <p>Approximate previews for common color vision differences. Use this to spot colors that become too similar.</p>
            </div>
          </div>
          {isPaletteEmpty ? (
            <div className="empty-panel-state">
              <span className="material-symbols-outlined">visibility</span>
              <p>Add colors to preview color vision differences.</p>
            </div>
          ) : (
            <div className="vision-preview-grid">
              {VISION_MODES.map((mode) => (
                <div className="vision-preview-card" key={mode.key}>
                  <div>
                    <p className="card-heading">{mode.label}</p>
                    <p>{mode.description}</p>
                  </div>
                  <div className="vision-swatch-strip">
                    {colors.map((color, index) => {
                      const simulated = simulateColorVision(color, mode.key);

                      return (
                        <button
                          type="button"
                          className="vision-swatch"
                          key={`${mode.key}-${color}-${index}`}
                          style={{ backgroundColor: simulated, color: getReadableTextColor(simulated) }}
                          onClick={(event) => copyColor(simulated, event)}
                          aria-label={`Copy ${mode.label} preview color ${simulated}`}
                        >
                          <span>{getColorName(index)}</span>
                          <small>{simulated}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default VisionToolsPage;
