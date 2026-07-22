# WallScan — MERN Wall Crack Detection App

A full-stack app: upload a wall photo, an AI model tells you if there's a
crack, and if it finds one you can enter the crack length and wall area to
get an instant materials + cost estimate at current India market prices.
Every scan (and its estimate) is logged to MongoDB with a full history view,
plus a repair reference guide (steps + pricing table).

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│   React      │ ---> │   Express    │ ---> │  Flask ML service  │
│  (client)    │ <--- │  (server)    │ <--- │  (PyTorch model)   │
│  port 5173   │      │  port 5000   │      │  port 5001         │
└─────────────┘      └──────┬───────┘      └────────────────────┘
                             │
                             v
                        ┌─────────┐
                        │ MongoDB │
                        └─────────┘
```

- **client/** — React + Vite. Upload form, result card, scan history, repair guide.
- **server/** — Express + Mongoose. Stores uploaded images and forwards them to the ML service for a prediction, saves the result in MongoDB.
- **ml-service/** — Flask + PyTorch. Loads a trained ResNet18 crack classifier and exposes `POST /predict`.

Node.js doesn't run PyTorch, so the ML model lives in its own small Python
service that Express calls over HTTP — a standard pattern for adding an AI
model to a MERN app.

## 1. Train (or reuse) the model

This project expects a trained `crack_model.pt` file (produced by the
`train_crack_classifier.py` script from the standalone training project —
see the earlier `crack-detector/` deliverable). Drop it into `ml-service/`:

```
ml-service/crack_model.pt
```

If it's missing, the service still runs using an untrained placeholder model
so you can test the plumbing end-to-end — predictions just won't be
meaningful until you add a real trained model.

## 2. Run the ML service

```bash
cd ml-service
pip install -r requirements.txt
python app.py
# -> http://localhost:5001
```

Alternative: run the Python prediction CLI in-process from the Express server
so you don't need a separate Flask process. Set `USE_LOCAL_PYTHON=true` in
`server/.env` (the default in this repo). The server will invoke
`ml-service/predict_cli.py` to run predictions directly using the local
Python runtime.

## 3. Run the backend

```bash
cd server
npm install
cp .env.example .env     # edit MONGO_URI if needed
npm run dev               # requires nodemon (npm i -D nodemon) or: npm start
# -> http://localhost:5000
```

Make sure MongoDB is running locally (`mongod`) or point `MONGO_URI` in
`.env` at a MongoDB Atlas cluster.

## 4. Run the frontend

```bash
cd client
npm install
npm run dev
# -> http://localhost:5173
```

Vite proxies `/api` and `/uploads` requests to the Express server, so no CORS
setup is needed in development beyond what's already in `server.js`.

## API reference

| Method | Route | Description |
|---|---|---|
| POST | `/api/detections` | Upload an image (`multipart/form-data`, field `image`), get back the saved detection with AI prediction |
| GET | `/api/detections` | List detections, newest first. Query params: `label=crack\|no_crack`, `limit=50` |
| GET | `/api/detections/:id` | Get one detection |
| DELETE | `/api/detections/:id` | Delete a detection |
| POST | `/api/detections/:id/estimate` | Body: `{ crackLengthM, wallAreaSqFt, alreadyHaveTools }` — computes and saves a materials + cost estimate (only works if the detection's label is `crack`) |
| GET | `/api/detections/stats/summary` | Totals: scans, cracks found, average confidence |

## Repair cost estimator

When a scan detects a crack, the UI shows an estimator form: enter the
crack's length (metres) and/or the wall area you want to finish (sq ft), and
it returns a materials + cost breakdown:

- **Filler** — `crackLengthM / metersCoveredPerKgFiller` → kg needed → rounded
  up to whole 1kg packs → cost at `fillerPricePerKg`
- **Putty** — `wallAreaSqFt × puttyPricePerSqFt`
- **Tools** — a flat one-time cost, skipped if you already own a putty
  blade/sandpaper

All the price constants live in one place: `server/config/pricing.js`.
Update them there as market prices change — every estimate reads from that
single source, so there's nothing to keep in sync elsewhere.

## Notes

- Uploaded images are stored on disk in `server/uploads/` and served
  statically at `/uploads/<filename>`. For production, swap this for S3 or
  another object store and save the URL instead.
- The app never claims to replace a structural engineer — the UI explicitly
  flags that wide, diagonal, or growing cracks need professional review.
- To go beyond classification (crack / no crack) to pixel-level crack
  outlines, swap the ML service's model for a YOLOv8-seg model — see the
  "Going further" section of the training project's README.
