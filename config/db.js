const mongoose = require("mongoose");
require("dotenv").config();

// Cache the connection to prevent multiple connections in serverless environments
let isConnected = false;

const connectDB = async () => {
    // Set strictQuery for cleaner logs
    mongoose.set('strictQuery', true);

    if (isConnected) {
        return;
    }

    try {
        if (!process.env.MONGO_URI) {
            console.error("❌ MONGO_URI is missing in Vercel environment variables");
            return;
        }

        // Configuration for serverless stability
        const options = {
            connectTimeoutMS: 10000, // 10 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds timeout
        };

        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        isConnected = !!conn.connections[0].readyState;
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        // Throwing the error here helps Vercel report the 500 status correctly with a reason
        throw error;
    }
};

module.exports = connectDB;
