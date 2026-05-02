const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI is not defined in environment variables");
            return;
        }
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
    }
};

module.exports = connectDB;
