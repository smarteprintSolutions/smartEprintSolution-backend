const asyncHandler = require('express-async-handler');
const { sendEmail } = require('../utils/emailService');

const sendContactEmail = asyncHandler(async (req, res) => {
    const { type } = req.body;
    let subject, html, text, fromName, replyToEmail;

    if (type === 'return-exchange') {
        const { email, orderNumber, reason, resolution, additionalDetails } = req.body;
        if (!email || !orderNumber) { res.status(400); throw new Error('Email and order number are required'); }
        fromName = `Return Request - Order #${orderNumber}`;
        replyToEmail = email;
        subject = `Return/Exchange Request: Order #${orderNumber}`;
        text = `Return/Exchange Request\n\nCustomer Email: ${email}\nOrder: ${orderNumber}\nReason: ${reason || 'Not specified'}\nResolution: ${resolution || 'Not specified'}\nDetails: ${additionalDetails || 'None'}`;
        html = `<h3>Return Request</h3><p>Email: ${email}</p><p>Order: ${orderNumber}</p><p>Reason: ${reason || 'N/A'}</p><p>Resolution: ${resolution || 'N/A'}</p><p>Details: ${additionalDetails || 'N/A'}</p>`;
    } else {
        const { name, email, orderNumber, subject: reqSubject, message } = req.body;
        if (!name || !email || !reqSubject || !message) { res.status(400); throw new Error('Required fields missing'); }
        fromName = name;
        replyToEmail = email;
        subject = `Contact Form: ${reqSubject} from ${name}`;
        text = `Name: ${name}\nEmail: ${email}\nOrder: ${orderNumber || 'N/A'}\nSubject: ${reqSubject}\nMessage: ${message}`;
        html = `<h3>Contact Submission</h3><p>Name: ${name}</p><p>Email: ${email}</p><p>Order: ${orderNumber || 'N/A'}</p><p>Subject: ${reqSubject}</p><p>Message: ${message}</p>`;
    }

    try {
        await sendEmail({
             to: process.env.CONTACT_RECEIVER_EMAIL || 'support@smarteprintsolution.com',
             subject, html, text,
             from: `"${fromName}" <${process.env.EMAIL_FROM || 'support@smarteprintsolution.com'}>`,
             replyTo: replyToEmail
        });
        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        res.status(500);
        throw new Error('Failed to send email.');
    }
});

module.exports = { sendContactEmail };
