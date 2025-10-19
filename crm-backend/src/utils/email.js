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

module.exports = { createTransporter, sendWelcomeEmail };