const { Campaign, Lead } = require('../models');

// GET /api/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
};

// POST /api/campaigns
exports.createCampaign = async (req, res) => {
  try {
    const { name, startDate, endDate, budget, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const campaign = await Campaign.create({ name, startDate, endDate, budget, status });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
};

// GET /api/campaigns/:id
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaign' });
  }
};

// PUT /api/campaigns/:id
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const { name, startDate, endDate, budget, status } = req.body;
    await campaign.update({ name, startDate, endDate, budget, status });
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
};

// GET /api/campaigns/:id/leads
exports.getCampaignLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll({ where: { campaignId: req.params.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaign leads' });
  }
};
