"""Inference helpers for the WallScan YOLO segmentation checkpoint."""

import io
import os
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

try:
    from ultralytics import YOLO
except ImportError as exc:
    raise RuntimeError(
        "The trained segmentation model requires ultralytics. "
        "Install dependencies with: pip install -r requirements.txt"
    ) from exc


SERVICE_DIR = Path(__file__).resolve().parent
EXTRACTED_CHECKPOINT_DIR = SERVICE_DIR / "crack_model.pt" / "crack_model.pt"
MODEL_PATH = Path(os.environ.get("MODEL_PATH", Path(tempfile.gettempdir()) / "wallscan-segmentation.pt"))


def prepare_checkpoint() -> Path:
    """Rebuild the supplied checkpoint when it has been extracted into a folder."""
    if MODEL_PATH.is_file():
        return MODEL_PATH

    if not EXTRACTED_CHECKPOINT_DIR.is_dir():
        raise FileNotFoundError(
            "Trained model files were not found. Expected "
            f"{EXTRACTED_CHECKPOINT_DIR} or a MODEL_PATH .pt file."
        )

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(MODEL_PATH, "w", zipfile.ZIP_DEFLATED) as archive:
        for source in EXTRACTED_CHECKPOINT_DIR.rglob("*"):
            if source.is_file():
                archive.write(source, Path("wallscan") / source.relative_to(EXTRACTED_CHECKPOINT_DIR))
    return MODEL_PATH


_model = YOLO(str(prepare_checkpoint()))


def predict_image(image_bytes: bytes):
    """Returns a crack/no-crack verdict from the trained segmentation model."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    result = _model(image, verbose=False)[0]
    boxes = result.boxes

    if boxes is None or len(boxes) == 0:
        # Object detectors do not provide a calibrated confidence for absence.
        return "no_crack", 0.5, {"crack": 0.5, "no_crack": 0.5}

    confidence = float(boxes.conf.max().item())
    return "crack", confidence, {"crack": round(confidence, 4), "no_crack": round(1 - confidence, 4)}
