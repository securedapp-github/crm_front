const { Deal } = require('../models');
const { Op } = require('sequelize');
const { assignNextSalesperson } = require('../services/assignment');
  
  const STAGES = ['New','Proposal Sent','Negotiation','Closed Won','Closed Lost'];

// GET /api/deals
exports.getDeals = async (req, res) => {
  try {
    const deals = await Deal.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: deals.length, data: deals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch deals' });
  }
};

// GET /api/deals/:id
exports.getDealById = async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch deal' });
  }
};

// POST /api/deals
exports.createDeal = async (req, res) => {
  try {
    const { title, value, stage = 'New', contactId, ownerId, accountId, assignedTo, autoAssign } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (value == null) return res.status(400).json({ success: false, message: 'Value is required' });
    if (stage && !STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }
    let deal = await Deal.create({ title, value, stage, contactId, ownerId, accountId, assignedTo });

    // Optional round-robin assignment
    if (autoAssign && !deal.assignedTo) {
      try {
        const chosen = await assignNextSalesperson();
        if (chosen) {
          await deal.update({ assignedTo: chosen.id });
        }
      } catch (assignErr) {
        console.warn('Auto-assign skipped:', assignErr.message);
      }
    }

    res.status(201).json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create deal' });
  }
};

// PUT /api/deals/:id
exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    const { title, value, stage, contactId, ownerId, accountId } = req.body;
    if (stage && !STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }
    await deal.update({ title, value, stage, contactId, ownerId, accountId });
    res.json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update deal' });
  }
};

// DELETE /api/deals/:id
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    await deal.destroy();
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete deal' });
  }
};
