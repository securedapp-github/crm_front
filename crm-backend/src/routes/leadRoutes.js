const express = require('express');
const router = express.Router();
router.all('*', (_req, res) => {
  res.status(410).json({
    success: false,
    message: 'Lead endpoints have been removed. Please migrate to campaign-driven intake.'
  });
});

module.exports = router;
