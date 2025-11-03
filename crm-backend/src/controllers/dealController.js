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
    // Compute unique work ID suffix W### per contact/email or per base title
    const baseTitle = String(title).replace(/-W\d{3}$/i, '').trim();
    let seq = 1;
    if (contactId) {
      const count = await Deal.count({ where: { contactId } });
      seq = count + 1;
    } else {
      const existing = await Deal.findAll({ where: { title: { [Op.like]: `${baseTitle}%` } } });
      // Only count titles that match baseTitle or baseTitle-W### pattern
      const matched = existing.filter(d => {
        const t = String(d.title || '').trim();
        return t === baseTitle || new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-W\\d{3}$`, 'i').test(t);
      });
      seq = matched.length + 1;
    }
    const finalTitle = `${baseTitle}-W${String(seq).padStart(3, '0')}`;

    let deal = await Deal.create({ title: finalTitle, value, stage, contactId, ownerId, accountId, assignedTo });

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
    const { title, value, stage, contactId, ownerId, accountId, notes, isHot, score, grade } = req.body;
    if (stage && !STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }
    // Allow updating scoring/priority fields as well
    const updates = { title, value, stage, contactId, ownerId, accountId, notes, isHot, score, grade };
    Object.keys(updates).forEach((key) => {
      if (typeof updates[key] === 'undefined') delete updates[key];
    });
    await deal.update(updates);
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
