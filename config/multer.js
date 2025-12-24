/******************** LOAD ENV ********************/
require("dotenv").config();

/******************** IMPORTS ********************/
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const Hostel = require("./models/Hostel");

/******************** APP INIT ********************/
const app = express();

/******************** VIEW ENGINE ********************/
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/******************** MONGODB ATLAS ********************/
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected"))
  .catch(err => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

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

const upload = multer({ storage });



/******************** ROUTES ********************/

/* HOME – FORM */
app.get("/", (req, res) => {
  res.render("index");
});

/* SUBMIT FORM */
app.post("/submit", upload.array("documents", 10), async (req, res) => {
  const documents = req.files.map(file => ({
    url: file.path,              // Cloudinary URL
    originalname: file.originalname,
    mimetype: file.mimetype
  }));

  await Hostel.create({
    name: req.body.name,
    phone: req.body.phone,
    hostelNo: req.body.hostelNo,
    roomNo: req.body.roomNo,
    documents
  });

  res.redirect("/");
});


/* VIEW SINGLE RECORD */
app.get("/records-view/:id", async (req, res) => {
  try {
    const record = await Hostel.findById(req.params.id);
    if (!record) return res.redirect("/");

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

    if (!record.isConfirmed) {
      record.isConfirmed = true;
      await record.save();
    }

    res.redirect(`/confirmed/${record._id}`);

  } catch (err) {
    console.error(err.message);
    res.redirect("/");
  }
});

/* CONFIRMATION PAGE */
app.get("/confirmed/:id", async (req, res) => {
  try {
    const record = await Hostel.findById(req.params.id);
    if (!record) return res.redirect("/");

    res.render("confirmed", { reference: record._id });

  } catch (err) {
    console.error(err.message);
    res.redirect("/");
  }
});

/* ALL PRINT REQUESTS */
app.get("/requests", async (req, res) => {
  try {
    const requests = await Hostel.find().sort({ createdAt: -1 });
    res.render("all-requests", { requests });

  } catch (err) {
    console.error(err.message);
    res.redirect("/");
  }
});

/* DELETE REQUEST */
app.post("/delete-request/:id", async (req, res) => {
  try {
    await Hostel.findByIdAndDelete(req.params.id);
    res.redirect("/requests");

  } catch (err) {
    console.error(err.message);
    res.redirect("/requests");
  }
});

app.use((err, req, res, next) => {
  console.error("UPLOAD ERROR:", err.message);

  res.status(500).render("error", {
    message: err.message || "Upload failed"
  });
});

/******************** SERVER ********************/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
