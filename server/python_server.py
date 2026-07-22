#!/usr/bin/env python3
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler, BaseHTTPRequestHandler
from urllib.parse import urlparse
import cgi
import io
import hashlib
import time
import uuid

ROOT = os.path.dirname(__file__)
SAMPLES_DIR = os.path.join(ROOT, "samples")
DB_PATH = os.path.join(ROOT, "db.json")
UPLOADS_DIR = os.path.join(ROOT, "uploads")


class ApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, obj, status=200):
        b = json.dumps(obj).encode("utf8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self._send_json({"status": "ok"})
            return

        if path == "/api/samples/measurements":
            p = os.path.join(SAMPLES_DIR, "measurements.json")
            if not os.path.exists(p):
                self._send_json({"error": "not found"}, status=404)
                return
            with open(p, "r", encoding="utf8") as f:
                data = json.load(f)
            self._send_json(data)
            return

        if path == "/api/samples/ai_report":
            p = os.path.join(SAMPLES_DIR, "ai_report.txt")
            if not os.path.exists(p):
                self.send_response(404)
                self.end_headers()
                return
            with open(p, "r", encoding="utf8") as f:
                txt = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(txt.encode("utf8"))))
            self.end_headers()
            self.wfile.write(txt.encode("utf8"))
            return

        if path == "/api/detections/stats/summary":
            if not os.path.exists(DB_PATH):
                # empty db
                self._send_json({"total": 0, "cracksFound": 0, "noCrack": 0, "avgConfidence": 0})
                return
            try:
                with open(DB_PATH, "r", encoding="utf8") as f:
                    data = json.load(f)
            except Exception:
                data = []

            total = len(data)
            cracks = sum(1 for d in data if d.get("label") == "crack")
            confidences = [d.get("confidence", 0) for d in data if isinstance(d.get("confidence", 0), (int, float))]
            avg = round((sum(confidences) / len(confidences)) if confidences else 0, 4)
            self._send_json({"total": total, "cracksFound": cracks, "noCrack": total - cracks, "avgConfidence": avg})
            return

        # GET /api/detections and GET /api/detections/:id
        if path.startswith("/api/detections"):
            parts = path.split("/")
            # /api/detections
            if len(parts) == 3 or (len(parts) == 4 and parts[3] == ""):
                # list detections
                try:
                    with open(DB_PATH, "r", encoding="utf8") as f:
                        data = json.load(f)
                except Exception:
                    data = []
                # newest first
                data.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
                self._send_json(data)
                return
            # /api/detections/<id>
            if len(parts) >= 4 and parts[3]:
                det_id = parts[3]
                try:
                    with open(DB_PATH, "r", encoding="utf8") as f:
                        data = json.load(f)
                except Exception:
                    data = []
                found = next((d for d in data if d.get("_id") == det_id), None)
                if not found:
                    self._send_json({"error": "Detection not found"}, status=404)
                    return
                self._send_json(found)
                return

        # fallback: serve static files (uploads, samples, etc.) using SimpleHTTPRequestHandler
        # tweak the path to serve relative to server directory
        # Delegate to SimpleHTTPRequestHandler with current directory set to ROOT
        self.close_connection = True
        os.chdir(ROOT)
        SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/detections":
            # accept multipart/form-data with field 'image'
            ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
            if ctype != 'multipart/form-data':
                self._send_json({"error": "Unsupported content type"}, status=400)
                return

            pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
            length = int(self.headers.get('content-length'))
            fs = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'}, keep_blank_values=True)

            if 'image' not in fs:
                self._send_json({"error": "No image file field"}, status=400)
                return

            fileitem = fs['image']
            filename = fileitem.filename or (str(uuid.uuid4()) + '.jpg')
            os.makedirs(UPLOADS_DIR, exist_ok=True)
            outpath = os.path.join(UPLOADS_DIR, filename)
            with open(outpath, 'wb') as out:
                out.write(fileitem.file.read())

            # Run local Python prediction using ml-service.model_utils (no torch required)
            try:
                # Load model_utils from the ../ml-service folder (safe import without package name issues)
                import importlib.util
                ml_path = os.path.join(ROOT, '..', 'ml-service', 'model_utils.py')
                spec = importlib.util.spec_from_file_location('model_utils', ml_path)
                mu = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mu)
                with open(outpath, 'rb') as f:
                    image_bytes = f.read()
                label, confidence, breakdown = mu.predict_image(image_bytes)
            except Exception as e:
                print('prediction error', e)
                label = 'no_crack'
                confidence = 0.0
                breakdown = {}

            # save detection to db.json
            try:
                with open(DB_PATH, 'r', encoding='utf8') as f:
                    data = json.load(f)
            except Exception:
                data = []

            det = {
                '_id': str(uuid.uuid4()),
                'imageUrl': '/uploads/' + filename,
                'label': label,
                'confidence': confidence,
                'breakdown': breakdown,
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
            }
            data.append(det)
            with open(DB_PATH, 'w', encoding='utf8') as f:
                json.dump(data, f, indent=2)

            self._send_json(det, status=201)
            return

        # POST /api/detections/<id>/estimate
        if path.startswith('/api/detections/') and path.endswith('/estimate'):
            parts = path.split('/')
            if len(parts) >= 4:
                det_id = parts[3]
                # read body JSON
                length = int(self.headers.get('content-length', '0'))
                body = self.rfile.read(length).decode('utf8') if length > 0 else '{}'
                try:
                    body_json = json.loads(body)
                except Exception:
                    body_json = {}

                try:
                    with open(DB_PATH, 'r', encoding='utf8') as f:
                        data = json.load(f)
                except Exception:
                    data = []

                found = next((d for d in data if d.get('_id') == det_id), None)
                if not found:
                    self._send_json({"error": "Detection not found"}, status=404)
                    return

                # simple estimate: use crack length in body or 0
                crackLengthM = float(body_json.get('crackLengthM', 0) or 0)
                wallAreaSqFt = float(body_json.get('wallAreaSqFt', 0) or 0)
                alreadyHaveTools = bool(body_json.get('alreadyHaveTools', False))

                # use same pricing logic as server/config/pricing.js defaults
                metersCoveredPerKgFiller = 3.5
                fillerPricePerKg = 200
                fillerPackSizeKg = 1
                puttyPricePerSqFt = 10
                toolsFlatCost = 100

                fillerKgNeeded = crackLengthM / metersCoveredPerKgFiller if crackLengthM > 0 else 0
                fillerPacksNeeded = int((fillerKgNeeded + fillerPackSizeKg - 1) // fillerPackSizeKg) if fillerKgNeeded > 0 else 0
                fillerCost = fillerPacksNeeded * fillerPackSizeKg * fillerPricePerKg
                puttyCost = wallAreaSqFt * puttyPricePerSqFt if wallAreaSqFt > 0 else 0
                toolsCost = 0 if alreadyHaveTools else toolsFlatCost
                total = fillerCost + puttyCost + toolsCost

                found['costEstimate'] = {
                    'crackLengthM': crackLengthM,
                    'wallAreaSqFt': wallAreaSqFt,
                    'alreadyHaveTools': alreadyHaveTools,
                    'fillerKgNeeded': round(fillerKgNeeded, 2),
                    'fillerPacksNeeded': fillerPacksNeeded,
                    'fillerCost': fillerCost,
                    'puttyCost': puttyCost,
                    'toolsCost': toolsCost,
                    'total': total,
                    'currency': '₹'
                }

                with open(DB_PATH, 'w', encoding='utf8') as f:
                    json.dump(data, f, indent=2)

                self._send_json(found)
                return

        self._send_json({"error": "Not implemented"}, status=404)


def run(port=5000):
    server = HTTPServer(("0.0.0.0", port), ApiHandler)
    print(f"Python server serving from {ROOT} on http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down")
        server.server_close()


if __name__ == "__main__":
    run()
