const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const salesController = require('../controllers/salesController');

router.use(protect);

router.get('/deals', salesController.getDealsByStage);
router.patch('/deals/:id/stage', salesController.moveDealStage);
router.get('/overview', salesController.getOverview);
router.get('/people', salesController.getPeople);

module.exports = router;
