const nodemailer = require('nodemailer');

let transporter = null;

const initializeTransporter = async () => {
    if (process.env.EMAIL_SERVICE === 'brevo' || (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('brevo'))) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_PORT == 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            family: 4, 
            tls: { rejectUnauthorized: false }
        });
    } else {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: { rejectUnauthorized: false }
        });
    }
};

initializeTransporter();

const sendEmail = async ({ to, subject, html, text, from, replyTo }) => {
    try {
        if (!transporter) await initializeTransporter();
        const mailOptions = {
            from: from || `"Smart ePrint Solution" <${process.env.EMAIL_FROM || 'no-reply@smarteprintsolution.com'}>`,
            to, subject, html, text, replyTo
        };
        const result = await transporter.sendMail(mailOptions);
        return result;
    } catch (error) {
        console.error('Email sending failed:', error.message);
        throw error;
    }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, type = 'registration') => {
    try {
        const subject = type === 'registration' ? 'Verify Your Account - Smart ePrint Solution' : 'Reset Your Password - Smart ePrint Solution';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #EF4056 0%, #d93548 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Smart ePrint Solution</h1>
                </div>
                <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">${type === 'registration' ? 'Verify Your Account' : 'Reset Your Password'}</h2>
                    <p>Your OTP code is:</p>
                    <div style="background-color: #f8f9fa; border: 2px dashed #EF4056; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; color: #EF4056; letter-spacing: 8px;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #999;">This code will expire in 10 minutes.</p>
                </div>
            </div>
        `;
        return await sendEmail({
            to: email, subject, html,
            from: `"Smart ePrint Solution" <${process.env.OTP_EMAIL_FROM || 'no-reply@smarteprintsolution.com'}>`
        });
    } catch (error) {
        console.log('DEV MODE: OTP is:', otp);
        return { messageId: 'error-fallback', originalError: error };
    }
};

module.exports = { generateOTP, sendOTPEmail, sendEmail };
