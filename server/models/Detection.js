import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const detectionSchema = new mongoose.Schema(
  {
    imageUrl: {
      // path to the stored image, served statically by Express (see server.js)
      type: String,
      required: true,
    },
    label: {
      // "crack" or "no_crack" -- whatever class names the model was trained with
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    breakdown: {
      // full probability breakdown per class, e.g. { crack: 0.94, no_crack: 0.06 }
      type: Map,
      of: Number,
    },
    location: {
      // optional free-text label the user can attach, e.g. "Living room, north wall"
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    costEstimate: {
      // populated after a user runs the repair cost estimator on a "crack" detection
      crackLengthM: Number,
      wallAreaSqFt: Number,
      alreadyHaveTools: Boolean,
      fillerKgNeeded: Number,
      fillerPacksNeeded: Number,
      fillerCost: Number,
      puttyCost: Number,
      toolsCost: Number,
      total: Number,
    },
  },
  { timestamps: true }
);

const MongooseDetection = mongoose.model("Detection", detectionSchema);

// --- Mock DB Implementation ---
const dbPath = path.resolve("db.json");

function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]));
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch (e) {
    return [];
  }
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

class MockDetection {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    const data = readDB();
    const index = data.findIndex(d => d._id === this._id);
    this.updatedAt = new Date().toISOString();
    if (index !== -1) {
      data[index] = this.toJSON();
    } else {
      data.push(this.toJSON());
    }
    writeDB(data);
    return this;
  }

  toJSON() {
    const obj = {};
    for (const key of Object.keys(this)) {
      if (typeof this[key] !== "function") {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

MockDetection.create = async function (doc) {
  const newDoc = new MockDetection({
    _id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...doc,
  });
  await newDoc.save();
  return newDoc;
};

MockDetection.find = function (filter = {}) {
  let data = readDB();

  if (filter.label) {
    data = data.filter((d) => d.label === filter.label);
  }

  const chain = {
    sort(sortObj) {
      if (sortObj && sortObj.createdAt) {
        data.sort((a, b) => {
          const order = sortObj.createdAt === -1 ? -1 : 1;
          return (new Date(a.createdAt) - new Date(b.createdAt)) * order;
        });
      }
      return chain;
    },
    limit(limitNum) {
      if (typeof limitNum === "number" && limitNum > 0) {
        data = data.slice(0, limitNum);
      }
      return chain;
    },
    then(onFulfilled, onRejected) {
      const instances = data.map((d) => new MockDetection(d));
      return Promise.resolve(instances).then(onFulfilled, onRejected);
    },
  };

  return chain;
};

MockDetection.findById = async function (id) {
  const data = readDB();
  const found = data.find((d) => d._id === id);
  if (!found) return null;
  return new MockDetection(found);
};

MockDetection.findByIdAndDelete = async function (id) {
  const data = readDB();
  const index = data.findIndex((d) => d._id === id);
  if (index === -1) return null;
  const [deleted] = data.splice(index, 1);
  writeDB(data);
  return new MockDetection(deleted);
};

MockDetection.countDocuments = async function (filter = {}) {
  let data = readDB();
  if (filter.label) {
    data = data.filter((d) => d.label === filter.label);
  }
  return data.length;
};

export default MongooseDetection;
