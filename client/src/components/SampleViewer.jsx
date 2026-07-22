import { useState } from "react";
import api from "../api.js";

export default function SampleViewer() {
  const [measurements, setMeasurements] = useState(null);
  const [report, setReport] = useState(null);

  async function loadSamples() {
    try {
      const m = await api.get("/samples/measurements");
      setMeasurements(m.data);
    } catch (e) {
      setMeasurements({ error: "Failed to load measurements" });
    }

    try {
      const r = await api.get("/samples/ai_report");
      setReport(r.data);
    } catch (e) {
      setReport("Failed to load report");
    }
  }

  return (
    <div className="panel">
      <h3>Sample Files</h3>
      <button onClick={loadSamples}>Load sample measurements & report</button>

      {measurements && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{JSON.stringify(measurements, null, 2)}</pre>
      )}

      {report && (
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{report}</pre>
      )}
    </div>
  );
}
