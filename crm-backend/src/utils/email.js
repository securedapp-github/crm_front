const nodemailer = require('nodemailer');

// Create a reusable transporter object using Gmail
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Send welcome email to new users
async function sendWelcomeEmail(email, name = 'there') {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SecureCRM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to SecureCRM!',
      text: `Hi ${name},

Welcome to SecureCRM! We're excited to have you on board.

Start exploring our platform and let us know if you have any questions.

Best regards,
The SecureCRM Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SecureCRM!</h2>
          <p>Hi ${name},</p>
          <p>We're excited to have you on board. Our platform is designed to help you manage your customer relationships effectively.</p>
          <p>Start exploring our platform and let us know if you have any questions.</p>
          <p>Best regards,<br>The SecureCRM Team</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
}

async function sendPasswordResetEmail(email, resetUrl) {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"SecureCRM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'SecureCRM Password Reset',
      text: `You requested a password reset for SecureCRM.

Please use the following link to set a new password:
${resetUrl}

This link will expire in 1 hour. If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your SecureCRM password. Click the button below to choose a new password:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Reset Password</a>
          </p>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #555;">${resetUrl}</p>
          <p>This link will expire in 1 hour. If you did not request this change, you can safely ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

// Send Sales Person ID email
async function sendSalesIdEmail(email, name = 'there', salesId) {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"SecureCRM" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your SecureCRM Sales Person ID',
      text: `Hi ${name},

Your Sales Person ID is: ${salesId}

Use this ID with your password to log in to the Sales Dashboard.

Best regards,
The SecureCRM Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Sales Person ID</h2>
          <p>Hi ${name},</p>
          <p>Your Sales Person ID is:</p>
          <p style="font-size: 20px; font-weight: 700; color: #065f46; margin: 12px 0;">${salesId}</p>
          <p>Use this ID with your password to log in to the Sales Dashboard.</p>
          <p>Best regards,<br/>The SecureCRM Team</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending salesId email:', error);
    throw new Error('Failed to send salesId email');
  }
}

module.exports = { createTransporter, sendWelcomeEmail, sendPasswordResetEmail, sendSalesIdEmail };