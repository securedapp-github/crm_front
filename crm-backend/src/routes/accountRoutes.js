const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const scoring = require('../controllers/accountScoringController');

router.use(protect);

router.post('/:id/score', scoring.scoreAccount);

module.exports = router;
