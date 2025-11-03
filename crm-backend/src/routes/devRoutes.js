const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const devController = require('../controllers/devController');

router.use(protect);

router.post('/seed', devController.seed);
router.post('/normalize-deal-titles', devController.normalizeDealTitles);

module.exports = router;
