import { useEffect, useState } from "react";
import CostEstimator from "./components/CostEstimator.jsx";
import DetectionCard from "./components/DetectionCard.jsx";
import History from "./components/History.jsx";
import RepairGuide from "./components/RepairGuide.jsx";
import UploadForm from "./components/UploadForm.jsx";
import SampleViewer from "./components/SampleViewer.jsx";
import { fetchStats } from "./api.js";

export default function App() {
  const [latest, setLatest] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState(null);

  async function refreshStats() {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    refreshStats();
  }, [refreshKey]);

  function handleResult(detection) {
    setLatest(detection);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▦</span>
          <div>
            <h1>WallScan</h1>
            <p className="tagline">Point, scan, know if it's structural or cosmetic.</p>
          </div>
        </div>

        {stats && (
          <div className="stats-strip">
            <div className="stat">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Scans</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.cracksFound}</span>
              <span className="stat-label">Cracks found</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.round(stats.avgConfidence * 100)}%</span>
              <span className="stat-label">Avg confidence</span>
            </div>
          </div>
        )}
      </header>

      <main className="app-grid">
        <UploadForm onResult={handleResult} />
        <DetectionCard detection={latest} />
        <SampleViewer />
        {latest?.label === "crack" && (
          <CostEstimator detection={latest} onUpdated={setLatest} />
        )}
        <History refreshKey={refreshKey} />
        <RepairGuide />
      </main>

      <footer className="app-footer">
        <p>WallScan runs a locally-trained model — always have wide or growing cracks checked by a professional.</p>
      </footer>
    </div>
  );
}
