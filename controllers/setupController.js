const asyncHandler = require('express-async-handler');
const SetupSettings = require('../models/SetupSettings');
const PrinterRegistration = require('../models/PrinterRegistration');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const simpleLogin = asyncHandler(async(req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin@123') {
        res.json({
            _id: 'setup-admin-id',
            name: 'Setup Admin',
            isAdmin: true,
            token: generateToken('setup-admin-id'),
        });
    } else {
        res.status(401);
        throw new Error('Invalid setup admin credentials');
    }
});

const getSettings = asyncHandler(async(req, res) => {
    let settings = await SetupSettings.findOne();
    if (!settings) {
        settings = await SetupSettings.create({
            showHeader: false,
            showLogo: false,
            allowModelSearch: true,
            showInstallationFailed: true,
            showCompleteSetup: true
        });
    }
    res.json(settings);
});

const updateSettings = asyncHandler(async(req, res) => {
    const { showHeader, showLogo, allowModelSearch, showInstallationFailed, showCompleteSetup } = req.body;
    let settings = await SetupSettings.findOne();
    if (settings) {
        settings.showHeader = showHeader !== undefined ? showHeader : settings.showHeader;
        settings.showLogo = showLogo !== undefined ? showLogo : settings.showLogo;
        settings.allowModelSearch = allowModelSearch !== undefined ? allowModelSearch : settings.allowModelSearch;
        settings.showInstallationFailed = showInstallationFailed !== undefined ? showInstallationFailed : settings.showInstallationFailed;
        settings.showCompleteSetup = showCompleteSetup !== undefined ? showCompleteSetup : settings.showCompleteSetup;
        const updatedSettings = await settings.save();
        res.json({ success: true, settings: updatedSettings });
    } else {
        const newSettings = await SetupSettings.create({
            showHeader, showLogo, allowModelSearch, showInstallationFailed, showCompleteSetup
        });
        res.json({ success: true, settings: newSettings });
    }
});

const registerPrinter = asyncHandler(async(req, res) => {
    const { name, email, phone, model, agree } = req.body;
    const registration = await PrinterRegistration.create({
        name, email, phone, model, agree
    });
    if (registration) {
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: registration
        });
    } else {
        res.status(400);
        throw new Error('Invalid registration data');
    }
});

module.exports = { getSettings, updateSettings, registerPrinter, simpleLogin };
