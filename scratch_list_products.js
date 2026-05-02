const mongoose = require('mongoose');
require('dotenv').config();

const listProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Product = require('./models/Product');
        const products = await Product.find({});
        console.log(`Found ${products.length} products:`);
        products.forEach(p => console.log(`- ${p.title} (${p.brand})`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

listProducts();
