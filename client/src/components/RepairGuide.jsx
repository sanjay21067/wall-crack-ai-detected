const STEPS = [
  ["Inspect", "Classify the crack: hairline (<1mm), medium (1–5mm), or structural (>5mm, diagonal, growing)."],
  ["Widen", "Open the crack into a shallow V-groove with a chisel or scraper so filler can grip."],
  ["Clean", "Remove dust and loose debris, wash with water, let dry fully."],
  ["Fill", "Press acrylic or elastomeric filler firmly into the groove with a putty blade."],
  ["Cure", "Follow the product's cure time — usually 4–24 hours — before sanding."],
  ["Sand", "Sand the dried filler flush with the surrounding wall."],
  ["Prime & paint", "Prime, then paint to match the surrounding wall."],
];

const PRICES = [
  ["Basic acrylic crack filler", "₹40 – ₹170 / piece"],
  ["Waterproof crack filler (1–5kg)", "From ₹150"],
  ["Ready-to-use crack paste (1kg)", "₹150 – ₹250 / kg"],
  ["Wall putty, finishing coat (with labour)", "₹8 – ₹13 / sq ft"],
  ["Wall putty, raw material only", "₹30 – ₹45 / kg"],
  ["Putty blade + sandpaper set", "₹50 – ₹150"],
];

export default function RepairGuide() {
  return (
    <div className="panel guide-panel">
      <h2 className="panel-title">
        <span className="eyebrow">04 — Reference</span>
        Repair guide
      </h2>

      <div className="guide-grid">
        <div>
          <h3 className="guide-subhead">Steps</h3>
          <ol className="steps-list">
            {STEPS.map(([title, detail], i) => (
              <li key={i}>
                <strong>{title}.</strong> {detail}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="guide-subhead">Typical prices (India, Jul 2026)</h3>
          <table className="price-table">
            <tbody>
              {PRICES.map(([item, price]) => (
                <tr key={item}>
                  <td>{item}</td>
                  <td className="price-cell">{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="guide-note">
            Prices vary by brand, city, and quantity. A small DIY job (a few
            hairline cracks in one room) typically runs ₹300–₹800 total.
          </p>
        </div>
      </div>
    </div>
  );
}
