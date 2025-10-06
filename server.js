const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
require("dotenv").config();


// MongoDB Connection
mongoose.connect(process.env.DATA_BASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
    const image = req.file.filename;

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


// Start server
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
