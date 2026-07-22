import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb+srv://srinidhigiri03115_db_user:res5VvOaRNZ9hPho@cluster0.uurslco.mongodb.net/?appName=Cluster0";

  try {
    // Attempt connection with a short timeout so development startup isn't delayed
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn("WARNING: MongoDB connection failed:", err.message);
    console.warn("Falling back to a local JSON file database (db.json) for development.");
    process.env.USE_MOCK_DB = "true";
  }
}
