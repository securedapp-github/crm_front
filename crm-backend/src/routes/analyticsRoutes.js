const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.use(protect);

router.get('/summary', analyticsController.getSummary);

module.exports = router;
