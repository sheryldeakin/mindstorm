const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDb = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const entryRoutes = require("./routes/entries");
const insightRoutes = require("./routes/insights");
const aiRoutes = require("./routes/ai");
const derivedRoutes = require("./routes/derived");
const patientRoutes = require("./routes/patient");
const clinicianRoutes = require("./routes/clinician");
const { startDerivedWorker } = require("./derived/worker");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = [...defaultOrigins, ...(process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/derived", derivedRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/clinician", clinicianRoutes);

app.use(notFound);
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
    startDerivedWorker({ intervalMs: 60000 });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
