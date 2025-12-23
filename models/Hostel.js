const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema({
    name: String,
    phone: String,
    hostelNo: String,
    roomNo: String,
    documents: [
        {
            filename: String,
            originalname: String,
            path: String,
            mimetype: String
        }
    ],
    isConfirmed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("Hostel", hostelSchema);
