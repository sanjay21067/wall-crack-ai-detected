import { useState } from "react";
import { estimateCost } from "../api.js";

export default function CostEstimator({ detection, onUpdated }) {
  const [crackLength, setCrackLength] = useState("");
  const [wallArea, setWallArea] = useState("");
  const [alreadyHaveTools, setAlreadyHaveTools] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!detection || detection.label !== "crack") {
    return null;
  }

  async function handleEstimate(e) {
    e.preventDefault();
    setError("");

    const lengthM = Number(crackLength) || 0;
    const areaSqFt = Number(wallArea) || 0;

    if (lengthM <= 0 && areaSqFt <= 0) {
      setError("Enter a crack length or a wall area to estimate.");
      return;
    }

    setLoading(true);
    try {
      const updated = await estimateCost(detection._id, {
        crackLengthM: lengthM,
        wallAreaSqFt: areaSqFt,
        alreadyHaveTools,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not estimate cost.");
    } finally {
      setLoading(false);
    }
  }

  const est = detection.costEstimate;

  return (
    <div className="panel estimator-panel">
      <h2 className="panel-title">
        <span className="eyebrow">03 — Materials</span>
        Estimate repair cost
      </h2>

      <form className="estimator-form" onSubmit={handleEstimate}>
        <div className="estimator-inputs">
          <label className="field">
            <span>Crack length (metres)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 1.2"
              value={crackLength}
              onChange={(e) => setCrackLength(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Wall area to finish (sq ft)</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 100"
              value={wallArea}
              onChange={(e) => setWallArea(e.target.value)}
            />
          </label>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={alreadyHaveTools}
            onChange={(e) => setAlreadyHaveTools(e.target.checked)}
          />
          <span>I already have a putty blade & sandpaper</span>
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-primary btn-primary--outline" disabled={loading}>
          {loading ? "Calculating…" : "Calculate estimate"}
        </button>
      </form>

      {est && est.total !== undefined && (
        <div className="estimate-result">
          <table className="price-table">
            <tbody>
              {est.fillerKgNeeded > 0 && (
                <tr>
                  <td>Crack filler ({est.fillerPacksNeeded} × 1kg pack, {est.fillerKgNeeded}kg needed)</td>
                  <td className="price-cell">₹{est.fillerCost}</td>
                </tr>
              )}
              {est.puttyCost > 0 && (
                <tr>
                  <td>Finishing putty ({est.wallAreaSqFt} sq ft)</td>
                  <td className="price-cell">₹{est.puttyCost}</td>
                </tr>
              )}
              {est.toolsCost > 0 && (
                <tr>
                  <td>Tools (putty blade, sandpaper)</td>
                  <td className="price-cell">₹{est.toolsCost}</td>
                </tr>
              )}
              <tr className="estimate-total-row">
                <td>Estimated total</td>
                <td className="price-cell">₹{est.total}</td>
              </tr>
            </tbody>
          </table>
          <p className="guide-note">
            Based on ~{est.assumptions?.metersCoveredPerKgFiller}m of crack coverage
            per kg of filler and ₹{est.assumptions?.puttyPricePerSqFt}/sq ft for
            finishing putty — current India market approximations, July 2026.
            Actual coverage varies by product and crack depth.
          </p>
        </div>
      )}
    </div>
  );
}
