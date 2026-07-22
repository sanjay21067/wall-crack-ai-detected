import express from "express";
import upload from "../middleware/upload.js";
import {
  createDetection,
  deleteDetection,
  estimateCostForDetection,
  getDetectionById,
  getDetections,
  getStats,
} from "../controllers/detectionController.js";

const router = express.Router();

router.post("/", upload.single("image"), createDetection);
router.get("/", getDetections);
router.get("/stats/summary", getStats);
router.get("/:id", getDetectionById);
router.delete("/:id", deleteDetection);
router.post("/:id/estimate", estimateCostForDetection);

export default router;
