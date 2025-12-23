const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const Hostel = require("./models/Hostel");

const app = express();

/* ===================== MIDDLEWARE ===================== */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================== MONGODB ===================== */
mongoose.connect("mongodb://127.0.0.1:27017/hostelDB")
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));

/* ===================== MULTER ===================== */
const upload = multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "image/png",
            "image/jpeg"
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, PNG, JPG files allowed"));
        }
    }
});

/* ===================== ROUTES ===================== */

/* 1️⃣ HOME PAGE (FORM ONLY) */
app.get("/", (req, res) => {
    res.render("index");
});

/* 2️⃣ SUBMIT FORM → SAVE DATA (NOT CONFIRMED) */
app.post("/submit", upload.array("documents", 10), async (req, res) => {
    try {
        const { name, phone, hostelNo, roomNo } = req.body;

        const documents = req.files.map(file => ({
            filename: file.filename,          // stored file name
            originalname: file.originalname,  // original file name
            path: file.path,
            mimetype: file.mimetype
        }));

        const savedRecord = await Hostel.create({
            name,
            phone,
            hostelNo,
            roomNo,
            documents,
            isConfirmed: false
        });

        // Redirect to single record view
        res.redirect(`/records-view/${savedRecord._id}`);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error saving data");
    }
});

/* 3️⃣ VIEW ONLY CURRENT RECORD */
app.get("/records-view/:id", async (req, res) => {
    try {
        const record = await Hostel.findById(req.params.id);
        if (!record) return res.status(404).send("Record not found");

        res.render("records", { data: [record] });

    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading record");
    }
});

/* 4️⃣ CONFIRM RECORD → GENERATE REFERENCE */
app.post("/confirm-record/:id", async (req, res) => {
    try {
        const record = await Hostel.findById(req.params.id);
        if (!record) return res.redirect("/");

        // Prevent double confirm
        if (record.isConfirmed) {
            return res.redirect(`/records-view/${record._id}`);
        }

        record.isConfirmed = true;
        await record.save();

        // Redirect to popup page
        res.redirect(`/confirmed/${record._id}`);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error confirming record");
    }
});

/* 5️⃣ POPUP PAGE (SHOW REFERENCE + OK → HOME) */
app.get("/confirmed/:id", async (req, res) => {
    try {
        const record = await Hostel.findById(req.params.id);
        if (!record) return res.redirect("/");

        res.render("confirmed", { reference: record._id });

    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});

/* 6️⃣ SHOW ALL PRINTING REQUESTS */
app.get("/requests", async (req, res) => {
    try {
        const requests = await Hostel.find().sort({ createdAt: -1 });
        res.render("all-requests", { requests });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading requests");
    }
});

/* 7️⃣ CONTACT PAGE (NAVBAR LINK) */
app.get("/contact", (req, res) => {
    res.render("contact"); // create contact.ejs
});

/* 8️⃣ OPTIONAL API (DEBUG) */
app.get("/records", async (req, res) => {
    const data = await Hostel.find();
    res.json(data);
});
// DELETE printing request
app.post("/delete-request/:id", async (req, res) => {
    try {
        const record = await Hostel.findByIdAndDelete(req.params.id);
        if (!record) return res.redirect("/requests");

        res.redirect("/requests");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error deleting request");
    }
});

// Download document with original filename
app.get("/download/:id/:file", async (req, res) => {
    try {
        const record = await Hostel.findById(req.params.id);
        if (!record) return res.status(404).send("Record not found");

        const doc = record.documents.find(d => d.filename === req.params.file);
        if (!doc) return res.status(404).send("File not found");

        res.download(
            path.join(__dirname, doc.path),
            doc.originalname   // 👈 ORIGINAL FILE NAME
        );

    } catch (err) {
        console.log(err);
        res.status(500).send("Download error");
    }
});


/* ===================== SERVER ===================== */
app.listen(8080, () => {
    console.log("🚀 Server running at http://localhost:8080");
});
