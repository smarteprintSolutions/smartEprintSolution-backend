const express = require('express');
const router = express.Router();
const { calculateShippingRates } = require('../controllers/shippingController');

router.post('/rates', calculateShippingRates);

module.exports = router;
