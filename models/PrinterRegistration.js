const mongoose = require('mongoose');

const printerRegistrationSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    model: { type: String, required: true },
    agree: { type: Boolean, default: false }
}, {
    timestamps: true
});

const PrinterRegistration = mongoose.model('PrinterRegistration', printerRegistrationSchema);
module.exports = PrinterRegistration;
