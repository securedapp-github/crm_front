const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const sessionAuth = require('../controllers/sessionAuthController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
// Session-based auth
router.post('/signup', sessionAuth.signup);
router.post('/verify-otp', sessionAuth.verifyOTP);
router.post('/resend-otp', sessionAuth.resendOTP);
router.post('/login', sessionAuth.login);
router.get('/me', sessionAuth.me);
router.post('/logout', sessionAuth.logout);

// Protected routes
router.use(protect);

// User profile routes
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);

// Admin routes
router.use(authorize('admin'));
router.get('/users', authController.getUsers);

module.exports = router;