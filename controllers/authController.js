const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { generateOTP, sendOTPEmail } = require('../utils/emailService');
const Order = require('../models/Order');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const authUser = asyncHandler(async (req, res) => {
    const { email, password, isAdminLogin } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error('Email and password are required');
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Universal Admin Check
    if ((normalizedEmail === 'admin' || normalizedEmail === 'admin@smarteprint.com') && password === 'admin@123') {
        return res.json({
            _id: '000000000000000000000000',
            name: 'Universal Admin',
            email: 'admin@smarteprint.com',
            isAdmin: true,
            token: generateToken('000000000000000000000000'),
        });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user && (await user.matchPassword(password))) {
        if (user.isBlocked) {
            res.status(403);
            throw new Error('Your account has been blocked by admin.');
        }
        if (!isAdminLogin && user.isAdmin) {
            res.status(401);
            throw new Error('You are not our user');
        }
        if (isAdminLogin && !user.isAdmin) {
            res.status(401);
            throw new Error('Not authorized as an admin');
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

const sendRegistrationOTP = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    if (!firstName || !lastName || !email || !password) {
        res.status(400);
        throw new Error('All fields are required');
    }
    const userExists = await User.findOne({ email: trimmedEmail });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const otp = generateOTP();
    await sendOTPEmail(trimmedEmail, otp, 'registration');
    await OTP.findOneAndDelete({ email: trimmedEmail, type: 'registration' });
    await OTP.create({
        email: trimmedEmail, otp, type: 'registration',
        registrationData: { firstName, lastName, password }
    });
    res.json({ message: 'OTP sent to your email' });
});

const verifyRegistrationOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const otpRecord = await OTP.findOne({ email: trimmedEmail, otp, type: 'registration' });
    if (!otpRecord) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }
    const { registrationData } = otpRecord;
    const user = await User.create({
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        name: `${registrationData.firstName} ${registrationData.lastName}`,
        email: trimmedEmail,
        password: registrationData.password,
    });
    await OTP.deleteOne({ _id: otpRecord._id });
    res.status(201).json({ message: 'Account verified successfully.', email: user.email });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    const otp = generateOTP();
    await sendOTPEmail(trimmedEmail, otp, 'password-reset');
    await OTP.findOneAndDelete({ email: trimmedEmail, type: 'reset' });
    await OTP.create({ email: trimmedEmail, otp, type: 'reset' });
    res.json({ message: 'Password reset OTP sent to your email' });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        res.status(400);
        throw new Error('Password must be at least 6 characters');
    }
    const trimmedEmail = email.trim().toLowerCase();
    const otpRecord = await OTP.findOne({ email: trimmedEmail, otp, type: 'reset' });
    if (!otpRecord) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }
    const user = await User.findOne({ email: trimmedEmail });
    if (user) {
        user.password = newPassword;
        await user.save();
        await OTP.deleteOne({ _id: otpRecord._id });
        res.json({ message: 'Password reset successfully' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const getUserProfile = asyncHandler(async (req, res) => {
    if (req.user._id === '000000000000000000000000') {
        return res.json({ _id: '000000000000000000000000', name: 'Universal Admin', email: 'admin@smarteprint.com', isAdmin: true });
    }
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({ _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const updateUserProfile = asyncHandler(async (req, res) => {
    if (req.user._id === '000000000000000000000000') {
        res.status(403);
        throw new Error('Universal Admin profile cannot be modified');
    }
    const user = await User.findById(req.user._id);
    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) user.password = req.body.password;
        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
            isAdmin: updatedUser.isAdmin, token: generateToken(updatedUser._id)
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ isAdmin: false }).select('-password').lean();
    
    // Enrich users with order data
    const usersWithStats = await Promise.all(users.map(async (user) => {
        const orders = await Order.find({ user: user._id });
        const totalSpent = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        return {
            ...user,
            totalSpent,
            orderCount: orders.length
        };
    }));

    res.json({ users: usersWithStats });
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user && !user.isAdmin) {
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const blockUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user && !user.isAdmin) {
        user.isBlocked = true;
        await user.save();
        res.json({ message: 'User blocked' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const unblockUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.isBlocked = false;
        await user.save();
        res.json({ message: 'User unblocked' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = {
    authUser, sendRegistrationOTP, verifyRegistrationOTP, forgotPassword, resetPassword,
    getUserProfile, updateUserProfile, getUsers, deleteUser, blockUser, unblockUser
};
