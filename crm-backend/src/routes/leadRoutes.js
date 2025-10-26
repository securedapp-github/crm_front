const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const leadController = require('../controllers/leadController');

router.use(protect);

// Lead management (conversion removed)
router.get('/', leadController.getLeads);

// Optional routes if needed elsewhere
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.post('/assign', leadController.assignLead);

module.exports = router;
