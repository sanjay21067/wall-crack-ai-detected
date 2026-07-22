#!/usr/bin/env python
import sys
import json
from pathlib import Path

from model_utils import predict_image


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing image path"}))
        sys.exit(2)

    img_path = Path(sys.argv[1])
    if not img_path.exists():
        print(json.dumps({"error": "image not found"}))
        sys.exit(2)

    try:
        with img_path.open("rb") as f:
            image_bytes = f.read()

        label, confidence, breakdown = predict_image(image_bytes)

        out = {"label": label, "confidence": confidence, "breakdown": breakdown}
        print(json.dumps(out))
    except Exception as e:
        print(json.dumps({"error": f"prediction error: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
