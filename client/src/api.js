import axios from "axios";

const SERVER_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : "";

const api = axios.create({ baseURL: `${SERVER_URL}/api` });

export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SERVER_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function uploadImage(file, { location = "", notes = "" } = {}) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("location", location);
  formData.append("notes", notes);

  const { data } = await api.post("/detections", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchDetections(params = {}) {
  const { data } = await api.get("/detections", { params });
  return data;
}

export async function deleteDetection(id) {
  const { data } = await api.delete(`/detections/${id}`);
  return data;
}

export async function fetchStats() {
  const { data } = await api.get("/detections/stats/summary");
  return data;
}

export async function estimateCost(detectionId, { crackLengthM, wallAreaSqFt, alreadyHaveTools }) {
  const { data } = await api.post(`/detections/${detectionId}/estimate`, {
    crackLengthM,
    wallAreaSqFt,
    alreadyHaveTools,
  });
  return data;
}

export default api;
