import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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
