const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || process.env.DATA_BASE; // support both names
if (!mongoURI) {
  console.error("❌ MongoDB connection string not found. Set MONGO_URI in environment variables.");
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

// Schema
const entrySchema = new mongoose.Schema({
  name: String,
  mobile: String,
  Occupation: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

const Entry = mongoose.model("Entry", entrySchema);

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Routes
app.post("/save", upload.single("image"), async (req, res) => {
  try {
    const { name, mobile, Occupation } = req.body;
    const image = req.file ? req.file.filename : null;

    const newEntry = new Entry({ name, mobile, Occupation, image });
    await newEntry.save();

    res.json({ message: "✅ Entry saved successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error saving entry" });
  }
});

app.get("/all", async (req, res) => {
  try {
    const allEntries = await Entry.find().sort({ createdAt: -1 });
    res.json(allEntries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Error fetching entries" });
  }
});

// Start server (use Render/Heroku PORT or fallback 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
