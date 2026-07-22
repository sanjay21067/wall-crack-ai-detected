import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import path from "path";
import { spawnSync } from "child_process";
import Detection from "../models/Detection.js";
import { estimateRepairCost } from "../config/pricing.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";
const USE_LOCAL_PYTHON = process.env.USE_LOCAL_PYTHON === "true";

/**
 * POST /api/detections
 * Accepts an uploaded image, forwards it to the Python ML service for
 * inference, then saves the result (and a link to the stored image) in MongoDB.
 */
export async function createDetection(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded (field name must be 'image')" });
    }

    const { location = "", notes = "" } = req.body;
    const filePath = req.file.path;

    let label, confidence, breakdown;

    if (USE_LOCAL_PYTHON) {
      // Call Python CLI wrapper that returns JSON
      const py = process.env.PYTHON || "python";
      const script = path.join(process.cwd(), "..", "ml-service", "predict_cli.py");
      const resSpawn = spawnSync(py, [script, filePath], { encoding: "utf8" });
      if (resSpawn.error) {
        console.error("Python spawn error:", resSpawn.error);
        return res.status(502).json({ error: "Local Python prediction failed", detail: String(resSpawn.error) });
      }
      if (resSpawn.status !== 0 && !resSpawn.stdout) {
        return res.status(502).json({ error: "Local Python prediction failed", detail: resSpawn.stderr });
      }

      let out;
      try {
        // The predictor can emit model startup diagnostics before its JSON result.
        // Its final non-empty stdout line is always the prediction payload.
        const jsonLine = resSpawn.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
        out = JSON.parse(jsonLine);
      } catch (e) {
        console.error("Failed to parse python output", resSpawn.stdout, e);
        return res.status(502).json({ error: "Invalid Python output", detail: resSpawn.stdout });
      }

      if (out.error) {
        return res.status(502).json({ error: "ML service prediction failed", detail: out.error });
      }

      ({ label, confidence, breakdown } = out);
    } else {
      // Forward the image to the Python ML microservice for prediction
      const form = new FormData();
      form.append("image", fs.createReadStream(filePath), req.file.filename);

      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: "POST",
        body: form,
      });

      if (!mlResponse.ok) {
        const errBody = await mlResponse.json().catch(() => ({}));
        return res.status(502).json({
          error: "ML service prediction failed",
          detail: errBody.error || mlResponse.statusText,
        });
      }

      const json = await mlResponse.json();
      ({ label, confidence, breakdown } = json);
    }

    const detection = await Detection.create({
      imageUrl: `/uploads/${req.file.filename}`,
      label,
      confidence,
      breakdown,
      location,
      notes,
    });

    res.status(201).json(detection);
  } catch (err) {
    console.error("createDetection error:", err);
    res.status(500).json({ error: "Server error while creating detection" });
  }
}

/**
 * GET /api/detections
 * Returns detection history, most recent first. Supports optional
 * ?label=crack filter and ?limit=20 pagination.
 */
export async function getDetections(req, res) {
  try {
    const { label, limit = 50 } = req.query;
    const filter = label ? { label } : {};

    const detections = await Detection.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(detections);
  } catch (err) {
    console.error("getDetections error:", err);
    res.status(500).json({ error: "Server error while fetching detections" });
  }
}

/**
 * GET /api/detections/:id
 */
export async function getDetectionById(req, res) {
  try {
    const detection = await Detection.findById(req.params.id);
    if (!detection) {
      return res.status(404).json({ error: "Detection not found" });
    }
    res.json(detection);
  } catch (err) {
    console.error("getDetectionById error:", err);
    res.status(500).json({ error: "Server error while fetching detection" });
  }
}

/**
 * DELETE /api/detections/:id
 */
export async function deleteDetection(req, res) {
  try {
    const detection = await Detection.findByIdAndDelete(req.params.id);
    if (!detection) {
      return res.status(404).json({ error: "Detection not found" });
    }
    res.json({ message: "Detection deleted" });
  } catch (err) {
    console.error("deleteDetection error:", err);
    res.status(500).json({ error: "Server error while deleting detection" });
  }
}

/**
 * POST /api/detections/:id/estimate
 * Body: { crackLengthM, wallAreaSqFt, alreadyHaveTools }
 * Computes a materials + cost estimate for repairing the crack found in this
 * detection, using current price assumptions from config/pricing.js, and
 * saves it onto the detection record.
 */
export async function estimateCostForDetection(req, res) {
  try {
    const detection = await Detection.findById(req.params.id);
    if (!detection) {
      return res.status(404).json({ error: "Detection not found" });
    }

    if (detection.label !== "crack") {
      return res.status(400).json({
        error: "This scan did not detect a crack, so there is nothing to estimate.",
      });
    }

    const { crackLengthM = 0, wallAreaSqFt = 0, alreadyHaveTools = false } = req.body;

    if (Number(crackLengthM) <= 0 && Number(wallAreaSqFt) <= 0) {
      return res.status(400).json({
        error: "Provide at least a crack length (in metres) or a wall area (in sq ft).",
      });
    }

    const estimate = estimateRepairCost({
      crackLengthM: Number(crackLengthM),
      wallAreaSqFt: Number(wallAreaSqFt),
      alreadyHaveTools: Boolean(alreadyHaveTools),
    });

    detection.costEstimate = {
      crackLengthM: Number(crackLengthM),
      wallAreaSqFt: Number(wallAreaSqFt),
      alreadyHaveTools: Boolean(alreadyHaveTools),
      ...estimate,
    };
    await detection.save();

    res.json(detection);
  } catch (err) {
    console.error("estimateCostForDetection error:", err);
    res.status(500).json({ error: "Server error while estimating repair cost" });
  }
}

/**
 * GET /api/detections/stats/summary
 * Quick counts for a dashboard: total scans, cracks found, average confidence.
 */
export async function getStats(req, res) {
  try {
    const total = await Detection.countDocuments();
    const cracksFound = await Detection.countDocuments({ label: "crack" });
    const all = await Detection.find({}, "confidence");
    const avgConfidence = all.length
      ? all.reduce((sum, d) => sum + d.confidence, 0) / all.length
      : 0;

    res.json({
      total,
      cracksFound,
      noCrack: total - cracksFound,
      avgConfidence: Number(avgConfidence.toFixed(4)),
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ error: "Server error while computing stats" });
  }
}
