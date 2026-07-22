import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const samplesDir = path.join(__dirname, "..", "samples");

router.get("/measurements", async (req, res) => {
  try {
    const p = path.join(samplesDir, "measurements.json");
    if (!fs.existsSync(p)) return res.status(404).json({ error: "measurements not found" });
    const json = JSON.parse(fs.readFileSync(p, "utf8"));
    res.json(json);
  } catch (err) {
    console.error("/api/samples/measurements error:", err);
    res.status(500).json({ error: "Failed to read measurements" });
  }
});

router.get("/ai_report", async (req, res) => {
  try {
    const p = path.join(samplesDir, "ai_report.txt");
    if (!fs.existsSync(p)) return res.status(404).json({ error: "ai report not found" });
    const txt = fs.readFileSync(p, "utf8");
    res.type("text/plain").send(txt);
  } catch (err) {
    console.error("/api/samples/ai_report error:", err);
    res.status(500).json({ error: "Failed to read ai report" });
  }
});

export default router;
