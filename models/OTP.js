const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ['registration', 'reset'], default: 'registration' },
    createdAt: { type: Date, default: Date.now, expires: 600 },
    registrationData: { type: Object }
});

module.exports = mongoose.model('OTP', otpSchema);
