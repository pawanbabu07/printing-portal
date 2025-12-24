const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    }
}, { _id: false });

const hostelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
    },
    hostelNo: {
        type: String,
        required: true
    },
    roomNo: {
        type: String,
        required: true
    },
    documents: {
        type: [documentSchema],
        required: true
    },
    isConfirmed: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["Pending", "Printed"],
        default: "Pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("Hostel", hostelSchema);
