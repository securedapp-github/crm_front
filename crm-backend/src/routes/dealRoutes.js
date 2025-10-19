const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', dealController.getDeals);
router.get('/:id', dealController.getDealById);
router.post('/', dealController.createDeal);
router.put('/:id', dealController.updateDeal);
router.delete('/:id', dealController.deleteDeal);

module.exports = router;
