const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

const getAnalytics = asyncHandler(async (req, res) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueResult = await Order.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ isAdmin: false });
    const activeStock = await Product.countDocuments({ countInStock: { $gt: 0 } });

    const recentOrders = await Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);

    const ordersByStatus = await Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
        revenue: { total: totalRevenue },
        orders: { total: totalOrders },
        customers: { total: totalCustomers },
        activeStock,
        recentOrders,
        ordersByStatus
    });
});

const getStats = asyncHandler(async (req, res) => {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalCustomers = await User.countDocuments({ isAdmin: false });
    const totalProducts = await Product.countDocuments();

    res.json({
        totalOrders,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        totalCustomers,
        totalProducts
    });
});

module.exports = { getDashboardStats: getStats, getAnalytics };
