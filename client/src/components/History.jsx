import { useEffect, useState } from "react";
import { deleteDetection, fetchDetections } from "../api.js";

export default function History({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { label: filter };
      const data = await fetchDetections(params);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, filter]);

  async function handleDelete(id) {
    await deleteDetection(id);
    setItems((prev) => prev.filter((d) => d._id !== id));
  }

  return (
    <div className="panel history-panel">
      <div className="history-header">
        <h2 className="panel-title">
          <span className="eyebrow">03 — Log</span>
          Scan history
        </h2>
        <div className="filter-tabs">
          {["all", "crack", "no_crack"].map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f === "all" ? "All" : f === "crack" ? "Cracks" : "Clean"}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="muted">No scans yet.</p>}

      <ul className="history-list">
        {items.map((item) => (
          <li key={item._id} className="history-item">
            <img src={item.imageUrl} alt="" className="history-thumb" />
            <div className="history-info">
              <span className={`badge badge--small ${item.label === "crack" ? "badge--alert" : "badge--safe"}`}>
                {item.label === "crack" ? "Crack" : "Clean"}
              </span>
              <span className="history-confidence">{Math.round(item.confidence * 100)}%</span>
              {item.location && <span className="history-location">{item.location}</span>}
              <span className="history-date">
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              className="btn-icon"
              onClick={() => handleDelete(item._id)}
              title="Delete this scan"
              type="button"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
