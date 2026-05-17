function InfoPopover({ info, isOpen, panelId, onToggle, onClose }) {
  return (
    <div className="info-popover-container">
      <button
        type="button"
        className="info-icon-button"
        aria-label={`Show ${info.title.toLowerCase()}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          info
        </span>
      </button>
      {isOpen && (
        <aside className="info-popover" id={panelId}>
          <div className="info-popover-header">
            <p className="card-heading">{info.title}</p>
            <button type="button" className="info-popover-close" aria-label="Close information panel" onClick={onClose}>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <p>{info.body}</p>
          <ul>
            {info.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

export default InfoPopover;
