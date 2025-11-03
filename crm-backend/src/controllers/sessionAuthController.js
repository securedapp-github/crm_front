const { User, Salesperson } = require('../models');
const { Op } = require('sequelize');
const { generateOTP, sendOTPEmail } = require('../utils/otp');
const { sendWelcomeEmail, sendPasswordResetEmail, sendSalesIdEmail, createTransporter } = require('../utils/email');
const crypto = require('crypto');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map();
// In-memory storage for approval tokens
const approvalStore = new Map();

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (10 minutes)
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { otp, expiration });

    // Create user but don't save to database yet
    // We'll save after OTP verification
    req.session.pendingUser = { name, email, password };
    
    // Send OTP via email
    try {
      await sendOTPEmail(email, otp);
      return res.status(201).json({ 
        message: 'OTP sent to your email. Please verify to complete registration.',
        otpSent: true 
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // If email fails, we still allow registration to proceed for now
      // In production, you might want to handle this differently
      await User.create({ name, email, password });
      return res.status(201).json({ 
        message: 'User registered successfully (email delivery failed)',
        otpSent: false 
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(email);
    
    if (!storedOTP) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    // Check expiration
    if (Date.now() > storedOTP.expiration) {
      otpStore.delete(email); // Clean up expired OTP
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Check if OTP matches
    if (storedOTP.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid, create the user
    const pendingUser = req.session.pendingUser;
    if (!pendingUser || pendingUser.email !== email) {
      return res.status(400).json({ error: 'Registration session not found' });
    }

    const user = await User.create({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password
    });

    // Clean up
    otpStore.delete(email);
    delete req.session.pendingUser;

    // Set session
    req.session.userId = user.id;
    
    return res.json({ 
      message: 'User registered and verified successfully',
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const pendingUser = req.session.pendingUser;
    if (!pendingUser || pendingUser.email !== email) {
      return res.status(400).json({ error: 'No pending registration found for this email' });
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (10 minutes)
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { otp, expiration });

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp);
      return res.json({ message: 'OTP resent successfully' });
    } catch (emailError) {
      console.error('Failed to resend OTP email:', emailError);
      return res.status(500).json({ error: 'Failed to resend OTP email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.validPassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Set session
    req.session.userId = user.id;
    return res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role, salesId: user.salesId } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/forgot-password-otp
exports.requestForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    // Do not reveal whether user exists
    if (!user) {
      return res.json({ message: 'If that account exists, an OTP has been sent to the email.' });
    }

    const otp = generateOTP();
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(`fp:${email}`, { otp, expiration });

    try {
      await sendOTPEmail(email, otp);
      return res.json({ message: 'OTP sent to your email. It will expire in 10 minutes.' });
    } catch (emailErr) {
      console.error('Failed to send forgot-password OTP email:', emailErr);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/resend-forgot-otp
exports.resendForgotOTP = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: 'If that account exists, an OTP has been resent.' });
    }

    const otp = generateOTP();
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(`fp:${email}`, { otp, expiration });

    try {
      await sendOTPEmail(email, otp);
      return res.json({ message: 'OTP resent successfully.' });
    } catch (emailErr) {
      console.error('Failed to resend forgot-password OTP email:', emailErr);
      return res.status(500).json({ error: 'Failed to resend OTP email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password-otp
exports.resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, password } = req.body || {};
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP and new password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or OTP' });

    const record = otpStore.get(`fp:${email}`);
    if (!record) return res.status(400).json({ error: 'OTP not found or expired' });

    if (Date.now() > record.expiration) {
      otpStore.delete(`fp:${email}`);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    user.password = password;
    await user.save();

    // Clean up OTP
    otpStore.delete(`fp:${email}`);

    return res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/forgot-password
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: 'If that account exists, a reset link has been sent.' });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({ hooks: false });

    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${base}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
      return res.json({ message: 'Password reset instructions sent to your email.' });
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now sign in with your new password.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/signup-sales-start
exports.signupSalesStart = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingSalesperson = await Salesperson.findOne({ where: { email } });
    if (existingSalesperson) {
      return res.status(400).json({ error: 'Email already linked to a salesperson' });
    }

    const otp = generateOTP();
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(`sales:${email}`, { otp, expiration, pending: { name, email, password } });

    try {
      await sendOTPEmail(email, otp);
      return res.status(201).json({ message: 'OTP sent to your email. Please verify to complete Sales signup.' });
    } catch (emailErr) {
      console.error('Failed to send Sales signup OTP email:', emailErr);
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to start Sales signup' });
  }
};

// POST /api/auth/verify-sales-otp
exports.verifySalesOTP = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = otpStore.get(`sales:${email}`);
    if (!record) return res.status(400).json({ error: 'OTP not found or expired' });

    if (Date.now() > record.expiration) {
      otpStore.delete(`sales:${email}`);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const { name, password } = record.pending || {};
    if (!name) {
      return res.status(400).json({ error: 'Signup session not found' });
    }
    // Move to approval step: generate one-time approval token and email to admin
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    approvalStore.set(token, { name, email, password, expiration });

    // Clean up OTP
    otpStore.delete(`sales:${email}`);

    // Construct approval link to backend
    const approveUrl = `${req.protocol}://${req.get('host')}/api/auth/approve-sales?token=${token}`;

    // Send email to company admin for approval
    try {
      const transporter = createTransporter();
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
      await transporter.sendMail({
        from: `"SecureCRM" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: 'Approve Sales Person Signup',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Sales Person Signup Approval</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p>To approve this signup and generate the Sales Person ID, click the button below:</p>
            <p style="text-align:center; margin:20px 0;">
              <a href="${approveUrl}" style="background:#065f46;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Approve Sales Person</a>
            </p>
            <p style="font-size:12px;color:#666;">This link expires in 24 hours.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Failed to send approval email to admin:', emailErr);
    }

    // Respond to client: pending approval
    return res.json({
      message: 'OTP verified. Your account is pending company approval. You will receive your Sales Person ID via email once approved.'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to verify Sales OTP' });
  }
};

// GET /api/auth/approve-sales
exports.approveSales = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).send('Missing token');

    const record = approvalStore.get(token);
    if (!record) return res.status(400).send('Invalid or expired token');
    if (Date.now() > record.expiration) {
      approvalStore.delete(token);
      return res.status(400).send('Token expired');
    }

    const { name, email, password } = record;

    // Generate unique Sales Person ID: SP-YY<random6>
    const year = new Date().getFullYear().toString().slice(-2);
    let salesId;
    for (let i = 0; i < 5; i++) {
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
      salesId = `SP-${year}${rand}`;
      const exists = await User.findOne({ where: { salesId } });
      if (!exists) break;
    }

    const user = await User.create({ name, email, password, role: 'sales', salesId });
    await Salesperson.create({ name, email });

    try {
      await sendSalesIdEmail(email, name, salesId);
    } catch (emailErr) {
      console.warn('Failed to send salesId email to salesperson:', emailErr.message);
    }

    // Clean up approval token
    approvalStore.delete(token);

    // Return a simple approval page
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <html><body style="font-family:Arial, sans-serif;">
        <h2>Sales Person Approved</h2>
        <p>${name} (${email}) has been approved. The Sales Person ID has been emailed to them.</p>
        <p>You may close this tab.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('Approval error:', err);
    return res.status(500).send('Server error during approval');
  }
};

// POST /api/auth/resend-sales-otp
exports.resendSalesOTP = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const record = otpStore.get(`sales:${email}`);
    if (!record || !record.pending) {
      return res.status(400).json({ error: 'No pending Sales signup found for this email' });
    }

    const otp = generateOTP();
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(`sales:${email}`, { otp, expiration, pending: record.pending });

    try {
      await sendOTPEmail(email, otp);
      return res.json({ message: 'OTP resent successfully' });
    } catch (emailErr) {
      console.error('Failed to resend Sales signup OTP email:', emailErr);
      return res.status(500).json({ error: 'Failed to resend OTP email' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ authenticated: false });
    const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'email', 'role', 'salesId'] });
    if (!user) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('crm.sid');
    return res.json({ message: 'Logged out' });
  });
};

// POST /api/auth/signup-sales
exports.signupSales = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingSalesperson = await Salesperson.findOne({ where: { email } });
    if (existingSalesperson) {
      return res.status(400).json({ error: 'Email already linked to a salesperson' });
    }

    // Generate unique Sales Person ID: SP-YY<random6>
    const year = new Date().getFullYear().toString().slice(-2);
    let salesId;
    for (let i = 0; i < 5; i++) {
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
      salesId = `SP-${year}${rand}`;
      const exists = await User.findOne({ where: { salesId } });
      if (!exists) break;
    }

    const user = await User.create({ name, email, password, role: 'sales', salesId });
    await Salesperson.create({ name, email });

    try {
      await sendWelcomeEmail(email, name);
    } catch (emailErr) {
      console.warn('Failed to send welcome email to salesperson:', emailErr.message);
    }

    // Set session
    req.session.userId = user.id;
    return res.status(201).json({
      message: 'Sales person registered',
      salesId: user.salesId,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to signup sales' });
  }
};

// POST /api/auth/login-sales
exports.loginSales = async (req, res) => {
  try {
    const { salesId, password } = req.body || {};
    if (!salesId || !password) return res.status(400).json({ error: 'Sales Person ID and password are required' });
    const user = await User.findOne({ where: { salesId, role: 'sales' } });
    if (!user) return res.status(404).json({ error: 'Sales Person not found' });
    const valid = await user.validPassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    return res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, salesId: user.salesId, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to login sales' });
  }
};