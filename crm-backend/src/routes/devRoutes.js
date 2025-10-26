const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const devController = require('../controllers/devController');

router.use(protect);

router.post('/seed', devController.seed);

module.exports = router;
