const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', quoteController.getQuotes);
router.post('/', quoteController.createQuote);
router.put('/:id', quoteController.updateQuote);
router.delete('/:id', quoteController.deleteQuote);

module.exports = router;
