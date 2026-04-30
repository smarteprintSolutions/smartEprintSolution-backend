const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');

const getAllChats = asyncHandler(async (req, res) => {
    const chats = await Chat.find().populate('user', 'name email').sort({ updatedAt: -1 });
    res.json(chats);
});

const getMyChat = asyncHandler(async (req, res) => {
    let chat = await Chat.findOne({ user: req.user._id }).populate('user', 'name email');
    if (!chat) {
        chat = await Chat.create({ user: req.user._id, messages: [], status: 'active' });
        chat = await Chat.findById(chat._id).populate('user', 'name email');
    }
    res.json(chat);
});

const getChatById = asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id).populate('user', 'name email');
    if (chat) {
        if (chat.user._id.toString() === req.user._id.toString() || req.user.isAdmin) {
            res.json(chat);
        } else { res.status(403); throw new Error('Not authorized'); }
    } else { res.status(404); throw new Error('Chat not found'); }
});

const sendMessage = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (chat) {
        const newMessage = {
            sender: req.user._id,
            senderModel: 'User',
            message,
            isRead: false,
            timestamp: new Date()
        };
        chat.messages.push(newMessage);
        chat.lastMessage = message;
        if (!req.user.isAdmin) chat.unreadCount += 1;
        await chat.save();
        const updatedChat = await Chat.findById(chat._id).populate('user', 'name email');
        res.json(updatedChat);
    } else { res.status(404); throw new Error('Chat not found'); }
});

const markAsRead = asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id);
    if (chat && req.user.isAdmin) {
        chat.messages.forEach(msg => { msg.isRead = true; });
        chat.unreadCount = 0;
        await chat.save();
        res.json({ message: 'Read' });
    } else { res.status(404); throw new Error('Chat not found'); }
});

const closeChat = asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id);
    if (chat) {
        chat.status = 'closed';
        await chat.save();
        res.json({ message: 'Closed' });
    } else { res.status(404); throw new Error('Chat not found'); }
});

module.exports = { getAllChats, getMyChat, getChatById, sendMessage, markAsRead, closeChat };
