export default function CameraUploadControls({ onPickCamera, selectedCamera, cameraOpen }) {
  return (
    <div className="camera-controls">
      <p className="camera-hint">Use your phone camera or a webcam connected to this computer.</p>
      <div className="camera-actions">
        <button
          type="button"
          className={`btn-secondary ${selectedCamera === "user" ? "btn-secondary--active" : ""}`}
          onClick={() => onPickCamera("user")}
        >
          Front camera
        </button>
        <button
          type="button"
          className={`btn-secondary ${selectedCamera === "environment" ? "btn-secondary--active" : ""}`}
          onClick={() => onPickCamera("environment")}
        >
          Back camera
        </button>
        {cameraOpen && <span className="camera-status" aria-live="polite">Camera is on</span>}
      </div>
    </div>
  );
}
