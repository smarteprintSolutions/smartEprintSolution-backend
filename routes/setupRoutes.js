const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const {
    getSettings,
    updateSettings,
    registerPrinter,
    simpleLogin
} = require('../controllers/setupController');

const setupAdminAuth = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.isAdmin) {
                req.user = { _id: decoded.id, isAdmin: true };
                return next();
            }
        } catch (error) {
            console.error(error);
        }
    }
    res.status(401);
    throw new Error('Not authorized as an admin');
};

router.get('/header-visibility', getSettings);
router.post('/header-visibility', setupAdminAuth, updateSettings);
router.post('/register', registerPrinter);
router.post('/login-simple', simpleLogin);

module.exports = router;
