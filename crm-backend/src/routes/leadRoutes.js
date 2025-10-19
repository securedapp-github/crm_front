const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', leadController.getLeads);
router.post('/', leadController.createLead);
router.post('/import', leadController.importLeads);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);
router.post('/assign', leadController.assignLead);
router.post('/convert/:id', leadController.convertLead);
router.get('/:id/activities', leadController.listActivities);
router.post('/:id/activities', leadController.addActivity);
router.get('/:id/timeline', leadController.listTimeline);

module.exports = router;
