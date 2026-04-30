const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart');

const getCart = asyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    res.json(cart ? cart.items : []);
});

const saveCart = asyncHandler(async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) { res.status(400); throw new Error('Items must be an array'); }
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) { cart.items = items; await cart.save(); }
    else { cart = await Cart.create({ user: req.user._id, items }); }
    res.json(cart.items);
});

const clearCart = asyncHandler(async (req, res) => {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
});

module.exports = { getCart, saveCart, clearCart };
