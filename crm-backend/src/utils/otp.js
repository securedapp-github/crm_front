const crypto = require('crypto');

/**
 * Generates a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Sends OTP to user's email
 * @param {string} email - User's email address
 * @param {string} otp - The OTP to send
 * @returns {Promise<Object>} Result of the email sending operation
 */
async function sendOTPEmail(email, otp) {
  try {
    // Import the email utility
    const { createTransporter } = require('./email');
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SecureCRM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'SecureCRM - Your OTP for Verification',
      text: `Your OTP for SecureCRM verification is: ${otp}

This OTP will expire in 10 minutes.

If you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>SecureCRM Verification</h2>
          <p>Your OTP (One-Time Password) for SecureCRM verification is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}

module.exports = { generateOTP, sendOTPEmail };