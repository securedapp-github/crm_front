const { Campaign, Contact, Account, Deal, Task, User } = require('../models');
const { computeCompanyScoreFromHeuristics, applyDealScoreFromCompany } = require('../services/scoring');
const { computeCampaignStrength } = require('../services/campaignScoring');

const CAMPAIGN_FIELDS = [
  'name',
  'code',
  'startDate',
  'endDate',
  'budget',
  'currency',
  'expectedSpend',
  'plannedLeads',
  'status',
  'priority',
  'objective',
  'description',
  'channel',
  'audienceSegment',
  'productLine',
  'campaignOwnerId',
  'externalCampaignId',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'complianceChecklist',
  'actualSpend',
  'leadsGenerated',
  'wonDeals',
  'revenueAttributed'
];

// GET /api/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }]
    });
    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
};

// DELETE /api/campaigns/:id
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await campaign.destroy();
    return res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
};

// POST /api/campaigns
exports.createCampaign = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const payload = CAMPAIGN_FIELDS.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});
    const t = await Campaign.sequelize.transaction();
    const campaign = await Campaign.create(payload, { transaction: t });

    const scoringInputs = {
      channel: req.body.channel,
      objective: req.body.objective,
      audienceSegment: req.body.audienceSegment,
      budget: req.body.budget,
      expectedSpend: req.body.expectedSpend,
      priority: req.body.priority,
      campaignStage: req.body.campaignStage,
      status: req.body.status,
      externalCampaignId: req.body.externalCampaignId,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      complianceChecklist: req.body.complianceChecklist,
      linkedCompanyDomain: req.body.linkedCompanyDomain,
    };
    const scoreResult = computeCampaignStrength(scoringInputs);

    // Auto-create initial placeholder lead as Contact + Deal + Task, then auto-assign
    const placeholderName = `Campaign Lead - ${campaign.name}`;
    const contact = await Contact.create({
      name: placeholderName,
      email: null,
      phone: null,
      company: null,
      accountId: null,
      assignedTo: null,
    }, { transaction: t });

    const deal = await Deal.create({
      title: `${placeholderName} Opportunity`,
      value: 0,
      stage: 'New',
      contactId: contact.id,
      accountId: null,
      ownerId: null,
      // initialize scoring fields if present in model (safe no-op if model lacks them)
      score: 10,
      grade: 'C',
      isHot: false,
    }, { transaction: t });

    // If request contains optional account fields, link and score now
    const { accountCompany, accountDomain, accountIsCustomer } = req.body || {};
    if (accountCompany || accountDomain) {
      let account = null;
      if (accountCompany) {
        account = await Account.findOne({ where: { name: accountCompany }, transaction: t });
      }
      if (!account && accountDomain) {
        account = await Account.findOne({ where: { domain: accountDomain }, transaction: t });
      }
      if (!account) {
        account = await Account.create({
          name: accountCompany || (accountDomain ? accountDomain.split('.')[0] : placeholderName),
          domain: accountDomain || null,
          isCustomer: !!accountIsCustomer,
          region: null,
        }, { transaction: t });
      } else {
        await account.update({
          domain: account.domain || accountDomain || null,
          isCustomer: accountIsCustomer !== undefined ? !!accountIsCustomer : (account.isCustomer || false)
        }, { transaction: t });
      }
      await contact.update({ accountId: account.id }, { transaction: t });
      await deal.update({ accountId: account.id }, { transaction: t });

      // Compute company score and apply to deal
      const companyScore = await computeCompanyScoreFromHeuristics(account);
      await account.update({ companyScore }, { transaction: t });
      const patch = applyDealScoreFromCompany(companyScore);
      await deal.update(patch, { transaction: t });
    }

    await Task.create({
      title: `Follow-up: ${placeholderName}`,
      description: `Auto-created on campaign creation (#${campaign.id})`,
      status: 'Open',
      assignedTo: null,
      relatedDealId: deal.id,
    }, { transaction: t });

    // Auto-assign to least-loaded Salesperson by active deals; also set an internal user owner for visibility
    const { Salesperson } = require('../models');
    const { Op } = require('sequelize');
    const activeStages = ['New','Proposal Sent','Negotiation'];
    let people = await Salesperson.findAll({ order: [['id','ASC']], transaction: t });
    if (!people || people.length === 0) {
      people = await Salesperson.bulkCreate([
        { name: 'Asha Verma', email: 'asha@example.com' },
        { name: 'Rohit Menon', email: 'rohit@example.com' },
        { name: 'Kiran Rao', email: 'kiran@example.com' },
        { name: 'Leela Nair', email: 'leela@example.com' },
      ], { returning: true, transaction: t });
    }
    if (people && people.length) {
      const counts = [];
      for (const sp of people) {
        const count = await Deal.count({ where: { assignedTo: sp.id, stage: { [Op.in]: activeStages } }, transaction: t });
        counts.push({ sp, count });
      }
      counts.sort((a, b) => (a.count - b.count) || (a.sp.id - b.sp.id));
      const chosen = counts[0].sp;
      await deal.update({ assignedTo: chosen.id }, { transaction: t });
    }
    // Keep owner assignment to least-loaded app user for task ownership (optional best-effort)
    const users = await User.findAll({ where: { role: 'user' }, order: [['id', 'ASC']], transaction: t });
    if (users && users.length) {
      const userCounts = await Promise.all(users.map(async (u) => ({ user: u, count: await Deal.count({ where: { ownerId: u.id }, transaction: t }) })));
      userCounts.sort((a, b) => a.count - b.count);
      const assignee = userCounts[0].user;
      await contact.update({ assignedTo: assignee.id }, { transaction: t });
      await deal.update({ ownerId: assignee.id }, { transaction: t });
    }

    // Increment KPI
    try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaign.id }, transaction: t }); } catch {}

    await t.commit();
    res.status(201).json({
      success: true,
      data: campaign,
      scoring: {
        campaign_name: campaign.name,
        total_score: scoreResult.total,
        grade: scoreResult.grade,
        status: scoreResult.strength,
        recommendation: scoreResult.recommendation
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
};

// GET /api/campaigns/:id
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }]
    });
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
    const updates = CAMPAIGN_FIELDS.reduce((acc, field) => {
      if (req.body[field] !== undefined) acc[field] = req.body[field];
      return acc;
    }, {});
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    await campaign.update(updates);

    const scoringInputs = {
      channel: req.body.channel ?? campaign.channel,
      objective: req.body.objective ?? campaign.objective,
      audienceSegment: req.body.audienceSegment ?? campaign.audienceSegment,
      budget: req.body.budget ?? campaign.budget,
      expectedSpend: req.body.expectedSpend ?? campaign.expectedSpend,
      priority: req.body.priority ?? campaign.priority,
      campaignStage: req.body.campaignStage,
      status: req.body.status ?? campaign.status,
      externalCampaignId: req.body.externalCampaignId ?? campaign.externalCampaignId,
      utmSource: req.body.utmSource ?? campaign.utmSource,
      utmMedium: req.body.utmMedium ?? campaign.utmMedium,
      utmCampaign: req.body.utmCampaign ?? campaign.utmCampaign,
      complianceChecklist: req.body.complianceChecklist ?? campaign.complianceChecklist,
      linkedCompanyDomain: req.body.linkedCompanyDomain,
    };
    const scoreResult = computeCampaignStrength(scoringInputs);

    res.json({
      success: true,
      data: campaign,
      scoring: {
        campaign_name: campaign.name,
        total_score: scoreResult.total,
        grade: scoreResult.grade,
        status: scoreResult.strength,
        recommendation: scoreResult.recommendation
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
};

// GET /api/campaigns/:id/leads
// Leads have been removed from the system. Keep endpoint but return 410.
exports.getCampaignLeads = async (_req, res) => {
  return res.status(410).json({ success: false, message: 'Lead resources were removed. Use contacts/deals created via capture.' });
};

// GET /api/campaigns/:id/scoring
exports.getCampaignScoring = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const inputs = {
      channel: campaign.channel,
      objective: campaign.objective,
      audienceSegment: campaign.audienceSegment,
      budget: campaign.budget,
      expectedSpend: campaign.expectedSpend,
      priority: campaign.priority,
      status: campaign.status,
      externalCampaignId: campaign.externalCampaignId,
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: campaign.utmCampaign,
      complianceChecklist: campaign.complianceChecklist,
      linkedCompanyDomain: null,
    };
    const scoreResult = computeCampaignStrength(inputs);
    return res.json({
      success: true,
      scoring: {
        campaign_name: campaign.name,
        total_score: scoreResult.total,
        grade: scoreResult.grade,
        status: scoreResult.strength,
        recommendation: scoreResult.recommendation
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to compute campaign scoring' });
  }
};

// POST /api/campaigns/:id/capture
// Body: { name, email?, phone?, company?, jobTitle?, source?, region?, industry?, notes? }
// Creates Contact (+Account if needed), optional Deal + Task, assigns to a rep, increments campaign KPIs
exports.captureLead = async (req, res) => {
  const t = await Campaign.sequelize.transaction();
  try {
    const campaignId = Number(req.params.id);
    if (!campaignId || Number.isNaN(campaignId)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid campaign id' });
    }

    const campaign = await Campaign.findByPk(campaignId, { transaction: t });
    if (!campaign) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const { name, email, phone, company, jobTitle, source, region, industry, notes } = req.body || {};
    const trimmedName = (name && String(name).trim()) || null;
    if (!trimmedName && !(email || phone)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Provide name or at least one contact detail (email/phone)' });
    }

    // Optionally create or reuse Account and score
    let account = null;
    const domainFromEmail = email && String(email).includes('@') ? String(email).split('@')[1] : null;
    const providedDomain = req.body?.domain || domainFromEmail || null;
    if (company && String(company).trim() !== '') {
      account = await Account.findOne({ where: { name: company }, transaction: t });
    }
    if (!account && providedDomain) {
      account = await Account.findOne({ where: { domain: providedDomain }, transaction: t });
    }
    if (company || providedDomain) {
      if (!account) {
        account = await Account.create({ name: company || (providedDomain ? providedDomain.split('.')[0] : 'New Account'), domain: providedDomain, industry: industry || null, region: region || null }, { transaction: t });
      } else {
        await account.update({ domain: account.domain || providedDomain }, { transaction: t });
      }
    }

    // Create Contact (use only fields present in Contact model)
    const contact = await Contact.create({
      name: trimmedName || (email || phone || 'New Contact'),
      email: email && String(email).trim() !== '' ? String(email).trim() : null,
      phone: phone && String(phone).trim() !== '' ? String(phone).trim() : null,
      company: company || null,
      accountId: account ? account.id : null,
      assignedTo: null,
    }, { transaction: t });

    // Create a Deal stub to push into pipeline (optional but useful)
    const deal = await Deal.create({
      title: `${contact.name} Opportunity`,
      value: 0,
      stage: 'New',
      contactId: contact.id,
      accountId: account ? account.id : null,
      ownerId: null
    }, { transaction: t });

    // Create a follow-up Task
    await Task.create({
      title: `Follow-up: ${contact.name}`,
      description: notes || `Captured from campaign #${campaignId}`,
      status: 'Open',
      assignedTo: null,
      relatedDealId: deal.id,
    }, { transaction: t });

    // Auto-assign to a Salesperson (least-loaded on active deals) and also set app user owner
    const { Salesperson } = require('../models');
    const { Op } = require('sequelize');
    const activeStages = ['New','Proposal Sent','Negotiation'];
    let reps = await Salesperson.findAll({ order: [['id','ASC']], transaction: t });
    if (!reps || reps.length === 0) {
      reps = await Salesperson.bulkCreate([
        { name: 'Asha Verma', email: 'asha@example.com' },
        { name: 'Rohit Menon', email: 'rohit@example.com' },
        { name: 'Kiran Rao', email: 'kiran@example.com' },
        { name: 'Leela Nair', email: 'leela@example.com' },
      ], { returning: true, transaction: t });
    }
    if (reps && reps.length) {
      const repCounts = [];
      for (const sp of reps) {
        const count = await Deal.count({ where: { assignedTo: sp.id, stage: { [Op.in]: activeStages } }, transaction: t });
        repCounts.push({ sp, count });
      }
      repCounts.sort((a, b) => (a.count - b.count) || (a.sp.id - b.sp.id));
      const chosen = repCounts[0].sp;
      await deal.update({ assignedTo: chosen.id }, { transaction: t });
    }
    const users = await User.findAll({ where: { role: 'user' }, order: [['id', 'ASC']], transaction: t });
    if (users && users.length) {
      const counts = await Promise.all(users.map(async (u) => ({ user: u, count: await Deal.count({ where: { ownerId: u.id }, transaction: t }) })));
      counts.sort((a, b) => a.count - b.count);
      const assignee = counts[0].user;
      await contact.update({ assignedTo: assignee.id }, { transaction: t });
      await deal.update({ ownerId: assignee.id }, { transaction: t });
    }

    // If we have an account, compute company score and apply to this deal now
    if (account) {
      const companyScore = await computeCompanyScoreFromHeuristics(account);
      await account.update({ companyScore }, { transaction: t });
      const patch = applyDealScoreFromCompany(companyScore);
      await deal.update(patch, { transaction: t });
    }

    // Increment campaign KPI
    try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaignId }, transaction: t }); } catch {}

    await t.commit();
    return res.status(201).json({ success: true, data: { contact, account, deal } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: 'Failed to capture lead' });
  }
};
