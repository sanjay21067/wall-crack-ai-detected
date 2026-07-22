import { useEffect, useRef, useState } from "react";
import { uploadImage } from "../api.js";
import CameraUploadControls from "./CameraUploadControls.jsx";

export default function UploadForm({ onResult }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [cameraMode, setCameraMode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function handleFile(selected) {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  async function handlePickCamera(mode) {
    setCameraMode(mode);
    setError("");
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser. Choose an image file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      setError(err?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : "Could not access a camera. Check that a webcam is connected, then try again.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      handleFile(new File([blob], `wall-scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose or drop a wall photo first.");
      return;
    }
    setScanning(true);
    setError("");
    try {
      const result = await uploadImage(file, { location, notes });
      onResult(result);
      setFile(null);
      setPreview(null);
      setLocation("");
      setNotes("");
      stopCamera();
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err?.response?.data?.error || "Scan failed. Is the server running?");
    } finally {
      setScanning(false);
    }
  }

  return (
    <form className="panel upload-panel" onSubmit={handleSubmit}>
      <h2 className="panel-title">
        <span className="eyebrow">01 — Capture</span>
        Scan a wall
      </h2>

      <div className="camera-action-group">
        <CameraUploadControls
          onPickCamera={handlePickCamera}
          selectedCamera={cameraMode}
          cameraOpen={cameraOpen}
        />
      </div>

      {cameraOpen && (
        <div className="webcam-preview">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="webcam-actions">
            <button type="button" className="btn-secondary" onClick={capturePhoto}>Take photo</button>
            <button type="button" className="btn-secondary" onClick={stopCamera}>Cancel camera</button>
          </div>
        </div>
      )}

      <div
        className={`dropzone ${dragOver ? "dropzone--active" : ""} ${scanning ? "dropzone--scanning" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Selected wall preview" className="dropzone-preview" />
        ) : (
          <div className="dropzone-hint">
            <span className="dropzone-icon" aria-hidden="true">⊕</span>
            <p>Drop a photo here or click to browse</p>
            <p className="dropzone-sub">JPG or PNG, up to 8MB</p>
            <p className="camera-selected">
              {cameraMode
                ? `A ${cameraMode === "user" ? "front" : "back"} camera is selected. Use the live preview above to take a photo.`
                : "Select a camera above to take a photo, or choose an existing image."}
            </p>
          </div>
        )}
        {scanning && <div className="scan-line" aria-hidden="true" />}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          capture={cameraMode || undefined}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <label className="field">
        <span>Location (optional)</span>
        <input
          type="text"
          placeholder="e.g. Living room, north wall"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Notes (optional)</span>
        <textarea
          placeholder="Anything worth remembering about this spot"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </label>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={scanning}>
        {scanning ? "Scanning…" : "Run scan"}
      </button>
    </form>
  );
}
