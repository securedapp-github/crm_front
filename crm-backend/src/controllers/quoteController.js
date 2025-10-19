const { Quote } = require('../models');

// GET /api/quotes
exports.getQuotes = async (req, res) => {
  try {
    const where = {};
    if (req.query && req.query.dealId) {
      where.dealId = Number(req.query.dealId);
    }
    const quotes = await Quote.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: quotes.length, data: quotes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch quotes' });
  }
};

// POST /api/quotes
exports.createQuote = async (req, res) => {
  try {
    const { dealId, amount = 0, status = 'Draft', url, notes } = req.body;
    if (!dealId) return res.status(400).json({ success: false, message: 'dealId is required' });
    if (status && !['Draft','Sent','Accepted','Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const quote = await Quote.create({ dealId, amount, status, url, notes });
    res.status(201).json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create quote' });
  }
};

// PUT /api/quotes/:id
exports.updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
    const { dealId, amount, status, url, notes } = req.body;
    if (status && !['Draft','Sent','Accepted','Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await quote.update({ dealId, amount, status, url, notes });
    res.json({ success: true, data: quote });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update quote' });
  }
};

// DELETE /api/quotes/:id
exports.deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
    await quote.destroy();
    res.json({ success: true, message: 'Quote deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete quote' });
  }
};
