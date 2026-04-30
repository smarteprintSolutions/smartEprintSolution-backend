const mongoose = require('mongoose');

const setupSettingsSchema = mongoose.Schema({
    showHeader: { type: Boolean, default: false },
    showLogo: { type: Boolean, default: false },
    allowModelSearch: { type: Boolean, default: true },
    showInstallationFailed: { type: Boolean, default: true },
    showCompleteSetup: { type: Boolean, default: true }
}, {
    timestamps: true
});

const SetupSettings = mongoose.model('SetupSettings', setupSettingsSchema);
module.exports = SetupSettings;
