function formatPct(n) {
  return `${Math.round(n * 100)}%`;
}

export default function DetectionCard({ detection }) {
  if (!detection) {
    return (
      <div className="panel result-panel result-panel--empty">
        <h2 className="panel-title">
          <span className="eyebrow">02 — Verdict</span>
          Result
        </h2>
        <p className="muted">Run a scan to see the verdict here.</p>
      </div>
    );
  }

  const isCrack = detection.label === "crack";

  return (
    <div className={`panel result-panel ${isCrack ? "result-panel--alert" : "result-panel--safe"}`}>
      <h2 className="panel-title">
        <span className="eyebrow">02 — Verdict</span>
        Result
      </h2>

      <div className="result-body">
        <img src={detection.imageUrl} alt="Scanned wall" className="result-thumb" />
        <div className="result-details">
          <span className={`badge ${isCrack ? "badge--alert" : "badge--safe"}`}>
            {isCrack ? "Crack detected" : "No crack detected"}
          </span>
          <p className="confidence">
            Confidence: <strong>{formatPct(detection.confidence)}</strong>
          </p>
          {detection.location && <p className="meta">Location: {detection.location}</p>}
          {detection.notes && <p className="meta">Notes: {detection.notes}</p>}

          {isCrack && (
            <p className="advice">
              Widen the crack into a shallow V, clean out debris, fill with an
              acrylic crack filler, let it cure, sand, then prime and paint.
              Get wide, diagonal, or growing cracks checked by a professional.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
