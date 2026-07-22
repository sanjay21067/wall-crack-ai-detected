import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import detectionRoutes from "./routes/detectionRoutes.js";
import sampleRoutes from "./routes/sampleRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.join(__dirname, "../client/dist");
const hasClientBuild = fs.existsSync(clientBuildPath);

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// Serve uploaded images statically so the React app can display them
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (hasClientBuild) {
  app.use(express.static(clientBuildPath));
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/detections", detectionRoutes);
app.use("/api/samples", sampleRoutes);

if (hasClientBuild) {
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
