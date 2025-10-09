// server.js

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
require("dotenv").config();

const app = express();

// ✅ Middleware Setup
try {
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(xss());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
} catch (err) {
  console.error("❌ Error in middleware setup:", err);
  process.exit(1);
}

// ✅ Ensure 'uploads' Directory Exists
try {
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log("📁 'uploads' folder created.");
  }
} catch (err) {
  console.error("❌ Error ensuring 'uploads' directory:", err);
  process.exit(1);
}

// ✅ MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ MONGO_URI not found in .env file.");
  process.exit(1);
}

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Mongoose Schema
const entrySchema = new mongoose.Schema({
  name: String,
  mobile: String,
  occupation: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

const Entry = mongoose.model("Entry", entrySchema);

// ✅ Multer Setup
let upload;
try {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && /\.(jpeg|jpg|png|gif)$/.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("❌ Only image files are allowed!"));
    }
  };

  upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
} catch (err) {
  console.error("❌ Error configuring multer:", err);
  process.exit(1);
}

// ✅ POST /save - Save Entry
app.post("/save", (req, res, next) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("❌ Multer upload error:", err);
      return res.status(400).json({ message: err.message });
    }

    try {
      const { name, mobile, occupation } = req.body;
      console.log("📦 Body:", req.body);
      console.log("🖼️ File:", req.file);

      if (!name || !mobile || !occupation) {
        return res.status(400).json({ message: "❌ All fields are required" });
      }

      const image = req.file
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
        : null;

      const newEntry = new Entry({ name, mobile, occupation, image });
      await newEntry.save();

      res.status(200).json({
        message: "✅ Entry saved successfully!",
        image: req.file?.filename || null,
      });
    } catch (err) {
      console.error("❌ Error saving entry:", err);
      res.status(500).json({ message: "❌ Internal Server Error", error: err.message });
    }
  });
});

// ✅ GET /all - Fetch All Entries
app.get("/all", async (req, res) => {
  try {
    const allEntries = await Entry.find().sort({ createdAt: -1 });
    res.status(200).json(allEntries);
  } catch (err) {
    console.error("❌ Error fetching entries:", err);
    res.status(500).json({ message: "❌ Error fetching entries", error: err.message });
  }
});

// ✅ GET /entry/:id - Fetch Single Entry
app.get("/entry/:id", async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "❌ Entry not found" });
    }
    res.status(200).json(entry);
  } catch (err) {
    console.error("❌ Error fetching entry:", err);
    res.status(500).json({ message: "❌ Error fetching entry", error: err.message });
  }
});

// ✅ Global Error Handler (Fallback)
app.use((err, req, res, next) => {
  console.error("❌ Unexpected Error:", err);
  if (err instanceof multer.MulterError || err.message.includes("Only image files")) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: "❌ Internal Server Error", error: err.message });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
try {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.error("❌ Error starting server:", err);
  process.exit(1);
}
