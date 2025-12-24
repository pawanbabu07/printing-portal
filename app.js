/******************** LOAD ENV ********************/
require("dotenv").config();

/******************** IMPORTS ********************/
const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const Hostel = require("./models/Hostel");

const app = express();

/******************** MIDDLEWARE ********************/
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/******************** MONGODB ATLAS ********************/
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

/******************** CLOUDINARY CONFIG ********************/
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
});

/******************** MULTER + CLOUDINARY ********************/
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printing_documents",
    resource_type: "auto"
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, PNG, JPG files are allowed"));
    }
    cb(null, true);
  }
});

/******************** ROUTES ********************/

/* HOME */
app.get("/", (req, res) => {
  res.render("index");
});

/* SUBMIT FORM */
app.post("/submit", upload.array("documents", 10), async (req, res, next) => {
  try {
    const { name, phone, hostelNo, roomNo } = req.body;

    if (!req.files || req.files.length === 0) {
      throw new Error("No files uploaded");
    }

    const documents = req.files.map(file => ({
      url: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype
    }));

    const record = await Hostel.create({
      name,
      phone,
      hostelNo,
      roomNo,
      documents,
      isConfirmed: false
    });

    res.redirect(`/records-view/${record._id}`);
  } catch (err) {
    next(err);
  }
});

/* VIEW SINGLE RECORD */
app.get("/records-view/:id", async (req, res) => {
  try {
    const record = await Hostel.findById(req.params.id);

    // ❌ If record not found OR no documents → redirect to index
    if (!record || record.documents.length === 0) {
      return res.redirect("/");
    }

    res.render("records", { data: [record] });

  } catch (err) {
    console.error(err.message);
    res.redirect("/");
  }
});


/* CONFIRM RECORD */
app.post("/confirm-record/:id", async (req, res) => {
  try {
    const record = await Hostel.findById(req.params.id);
    if (!record) return res.redirect("/");

    record.isConfirmed = true;
    await record.save();

    res.redirect(`/confirmed/${record._id}`);
  } catch {
    res.redirect("/");
  }
});

/* CONFIRM PAGE */
app.get("/confirmed/:id", async (req, res) => {
  try {
    const record = await Hostel.findById(req.params.id);
    if (!record) return res.redirect("/");
    res.render("confirmed", { reference: record._id });
  } catch {
    res.redirect("/");
  }
});

/* ALL REQUESTS */
app.get("/requests", async (req, res) => {
  try {
    const requests = await Hostel.find().sort({ createdAt: -1 });
    res.render("all-requests", { requests });
  } catch {
    res.redirect("/");
  }
});

/* DELETE REQUEST */
app.post("/delete-request/:id", async (req, res) => {
  try {
    await Hostel.findByIdAndDelete(req.params.id);
    res.redirect("/requests");
  } catch {
    res.redirect("/requests");
  }
});

/* ================= DOCUMENT EDIT & DELETE ================= */

/* EDIT / REPLACE DOCUMENT */
app.post(
  "/edit-document/:recordId/:docIndex",
  upload.single("document"),
  async (req, res) => {
    try {
      const { recordId, docIndex } = req.params;
      const record = await Hostel.findById(recordId);
      if (!record) return res.redirect("/");

      record.documents[docIndex] = {
        url: req.file.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype
      };

      await record.save();
      res.redirect(`/records-view/${recordId}`);
    } catch {
      res.redirect(`/records-view/${recordId}`);
    }
  }
);

/* DELETE DOCUMENT */
app.post("/delete-document/:recordId/:docIndex", async (req, res) => {
  try {
    const { recordId, docIndex } = req.params;
    const record = await Hostel.findById(recordId);
    if (!record) return res.redirect("/");

    record.documents.splice(docIndex, 1);
    await record.save();

    res.redirect(`/records-view/${recordId}`);
  } catch {
    res.redirect(`/records-view/${recordId}`);
  }
});

/******************** GLOBAL ERROR HANDLER ********************/
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.message);

  let message = "Something went wrong. Please try again.";
  if (err.message.includes("Only PDF")) message = err.message;

  res.status(500).render("error", { message });
});

/******************** SERVER ********************/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
