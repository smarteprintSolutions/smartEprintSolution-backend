/**
 * Smart ePrint Solution - Email & Messaging Service
 * Handles SMTP transport, OTP generation, and HTML email templates.
 */

const nodemailer = require('nodemailer');

// Global transporter instance
let transporter = null;

// --- Service Configuration ---

/**
 * Initializes the Nodemailer instance.
 * Automatically detects Brevo relay settings or falls back to standard SMTP.
 */
const setupMailTransporter = async () => {
    const useBrevo = process.env.EMAIL_SERVICE === 'brevo' || 
                    (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('brevo'));

    const smtpSettings = {
        host: process.env.EMAIL_HOST || (useBrevo ? 'smtp-relay.brevo.com' : ''),
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT == 465, // True for port 465, false for others
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: { 
            // Allow self-signed certs for internal relays if necessary
            rejectUnauthorized: false 
        }
    };

    if (useBrevo) {
        smtpSettings.family = 4; // Force IPv4 for stable Brevo connection
    }

    transporter = nodemailer.createTransport(smtpSettings);
};

// Auto-boot the transporter
setupMailTransporter();

/**
 * Core Dispatcher: Sends raw email packets.
 */
const dispatchEmailPacket = async ({ to, subject, html, text, from, replyTo }) => {
    try {
        if (!transporter) await setupMailTransporter();
        
        const envelope = {
            from: from || `"Smart ePrint Solution" <${process.env.EMAIL_FROM || 'no-reply@smarteprintsolution.com'}>`,
            to,
            subject,
            html,
            text,
            replyTo
        };

        const response = await transporter.sendMail(envelope);
        return response;
    } catch (err) {
        console.error('Critical: Mailer Dispatch Failed ->', err.message);
        throw err;
    }
};

/**
 * Generates a random 6-digit numeric OTP.
 */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Sends a verification or reset OTP to a user.
 * During development, the OTP is also printed to the console.
 */
const sendOTPEmail = async (email, otp, type = 'registration') => {
    // Development fallback: Log OTP to terminal
    console.log(`\n-----------------------------------------`);
    console.log(`🔑 [OTP SYSTEM] Verification Code for ${email}`);
    console.log(`   CODE: ${otp}`);
    console.log(`   TYPE: ${type.toUpperCase()}`);
    console.log(`-----------------------------------------\n`);

    try {
        const isRegistration = type === 'registration';
        const subject = isRegistration 
            ? 'Verify Your Account - Smart ePrint Solution' 
            : 'Reset Your Password - Smart ePrint Solution';

        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <div style="background: linear-gradient(135deg, #EF4056 0%, #d93548 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Smart ePrint Solution</h1>
                </div>
                <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #111; margin-top: 0;">${isRegistration ? 'Verify Your Identity' : 'Reset Password'}</h2>
                    <p style="line-height: 1.6;">Hello, please use the verification code below to ${isRegistration ? 'complete your registration' : 'reset your account password'}.</p>
                    
                    <div style="background-color: #fcfcfc; border: 2px dashed #EF4056; padding: 25px; text-align: center; margin: 30px 0; border-radius: 12px;">
                        <span style="font-size: 36px; font-weight: 800; color: #EF4056; letter-spacing: 10px;">${otp}</span>
                    </div>
                    
                    <p style="font-size: 13px; color: #666; text-align: center;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                    &copy; ${new Date().getFullYear()} Smart ePrint Solution. All rights reserved.
                </div>
            </div>
        `;

        const result = await dispatchEmailPacket({
            to: email,
            subject,
            html,
            from: `"Smart ePrint Solution" <${process.env.OTP_EMAIL_FROM || process.env.EMAIL_FROM || 'no-reply@smarteprintsolution.com'}>`
        });

        console.log(`✅ SMTP: OTP email delivered successfully to ${email}`);
        return result;
    } catch (error) {
        console.error(`❌ SMTP: Transmission failed for ${email} ->`, error.message);
        
        // Detailed error for Brevo / SMTP providers
        if (error.response) {
            console.error('SMTP Response:', error.response);
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('\n------------------------------------------------------------');
            console.log('⚠️ [DEV MODE] SMTP FAILED BUT CONTINUING');
            console.log('   The OTP has been printed to the console above.');
            console.log('   Check if your EMAIL_FROM is verified in your SMTP dashboard.');
            console.log('------------------------------------------------------------\n');
            return { message: 'OTP logged to console (Email delivery failed)' };
        }
            
        throw new Error(`Email Service Unavailable: ${error.message}`);
    }
};

module.exports = { 
    generateOTP, 
    sendOTPEmail, 
    sendEmail: dispatchEmailPacket 
};
