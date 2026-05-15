const asyncHandler = require('express-async-handler');
const EasyPostClient = require('@easypost/api');

// Initialize EasyPost client only if the key exists to avoid app crash on startup if missing
let client;
if (process.env.EASYPOST_API_KEY) {
    client = new EasyPostClient(process.env.EASYPOST_API_KEY);
}

const calculateShippingRates = asyncHandler(async (req, res) => {
    const { address, city, postalCode, country, state, phone, cartItems } = req.body;

    if (!client) {
        res.status(500);
        throw new Error('EasyPost API key is not configured on the server.');
    }

    if (!address || !city || !postalCode || !country || !state) {
        res.status(400);
        throw new Error('Please provide full shipping address details.');
    }

    // Default weight calculation
    let totalWeight = 0;
    if (cartItems && cartItems.length > 0) {
        // Assume weight in ounces. If item has weight, add it, else default to 32 oz (2 lbs) per item
        totalWeight = cartItems.reduce((acc, item) => acc + (item.weight || 32) * item.qty, 0);
    } else {
        totalWeight = 32;
    }

    try {
        const toAddress = await client.Address.create({
            street1: address,
            city: city,
            state: state,
            zip: postalCode,
            country: country,
            phone: phone || '',
        });

        const fromAddress = await client.Address.create({
            company: process.env.COMPANY_NAME || 'SmartEPrint Solution',
            street1: process.env.COMPANY_ADDRESS || '11397 Quincy St NE',
            city: process.env.COMPANY_CITY || 'Blaine',
            state: process.env.COMPANY_STATE || 'MN',
            zip: process.env.COMPANY_ZIP || '55434',
            country: process.env.COMPANY_COUNTRY || 'US',
            phone: process.env.COMPANY_PHONE || '+1 (651) 815-4630',
        });

        const parcel = await client.Parcel.create({
            weight: totalWeight,
        });

        const shipment = await client.Shipment.create({
            to_address: toAddress,
            from_address: fromAddress,
            parcel: parcel,
        });

        // The checkout frontend expects data to contain rates
        const rates = shipment.rates.map(rate => ({
            id: rate.id,
            service: rate.service,
            carrier: rate.carrier,
            rate: rate.rate,
        }));

        res.json({ rates, shipmentId: shipment.id });
    } catch (error) {
        console.error('EasyPost Error:', error);
        res.status(500);
        throw new Error(error.message || 'Failed to calculate shipping rates');
    }
});

module.exports = { calculateShippingRates };
