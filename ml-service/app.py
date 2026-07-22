"""
ML microservice for wall crack detection.

Runs the trained PyTorch model behind a small Flask API so the Node/Express
backend (which cannot run PyTorch directly) can call it over HTTP.

Endpoints:
  GET  /health           -> { status: "ok" }
  POST /predict           -> multipart/form-data with field "image"
                             returns { label, confidence, breakdown }

Run:
  pip install -r requirements.txt
  # place a trained crack_model.pt in this folder (see ../ai-training)
  python app.py
  # service listens on http://localhost:5001
"""

from flask import Flask, jsonify, request
from flask_cors import CORS

from model_utils import predict_image

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No 'image' file field in request"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use png, jpg, or jpeg."}), 400

    image_bytes = file.read()

    try:
        label, confidence, breakdown = predict_image(image_bytes)
    except Exception as exc:  # noqa: BLE001 - surface the error to the caller for debugging
        return jsonify({"error": f"Prediction failed: {exc}"}), 500

    return jsonify({
        "label": label,          # "crack" or "no_crack"
        "confidence": confidence,
        "breakdown": breakdown,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
