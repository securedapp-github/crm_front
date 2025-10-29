const { User } = require('../models');
const { generateOTP, sendOTPEmail } = require('../utils/otp');
const crypto = require('crypto');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStore = new Map();

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
    return res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ authenticated: false });
    const user = await User.findByPk(req.session.userId, { attributes: ['id', 'name', 'email'] });
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
    const { name, password } = req.body || {};
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required' });

    // Generate unique Sales Person ID: SP-YY<random6>
    const year = new Date().getFullYear().toString().slice(-2);
    let salesId;
    for (let i = 0; i < 5; i++) {
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
      salesId = `SP-${year}${rand}`;
      const exists = await User.findOne({ where: { salesId } });
      if (!exists) break;
    }

    // Use a syntactically valid placeholder email to satisfy model validators
    const pseudoEmail = `sales+${Date.now()}@securecrm.local`;
    const user = await User.create({ name, email: pseudoEmail, password, role: 'sales', salesId });
    // Set session
    req.session.userId = user.id;
    return res.status(201).json({ message: 'Sales person registered', salesId: user.salesId, user: { id: user.id, name: user.name, role: user.role } });
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
    return res.json({ message: 'Login successful', user: { id: user.id, name: user.name, salesId: user.salesId, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to login sales' });
  }
};