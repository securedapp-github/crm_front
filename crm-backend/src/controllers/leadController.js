const { Lead, User, Contact, Deal, Campaign, Task, Account, LeadActivity } = require('../models');
const { Op } = require('sequelize');
const { assignNextSalesperson } = require('../services/assignment');

const computeGrade = (score) => {
  if (typeof score !== 'number') return null;
  if (score >= 70) return 'A';
  if (score >= 40) return 'B';
  return 'C';
};

// GET /api/leads/:id/activities
exports.getLeadActivities = async (req, res) => {
  try {
    const leadId = Number(req.params.id)
    const lead = await Lead.findByPk(leadId)
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    const acts = await LeadActivity.findAll({ where: { leadId }, order: [['createdAt','DESC']] })
    return res.json({ success: true, data: acts })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lead activities' })
  }
}

// POST /api/leads/:id/activities
// Body: { type?: string, note?: string, meta?: object }
exports.addLeadActivity = async (req, res) => {
  try {
    const leadId = Number(req.params.id)
    const lead = await Lead.findByPk(leadId)
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' })
    const { type = 'New intent', note = null, meta = null } = req.body || {}
    const createdBy = req.user?.id || null
    const act = await LeadActivity.create({ leadId, type, note, meta, createdBy })
    return res.status(201).json({ success: true, data: act })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add lead activity' })
  }
}

// GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Campaign, as: 'campaign', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] }
      ]
    });
    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
};

// POST /api/leads/import
// Body: { leads: Array<LeadLike>, autoAssign?: boolean }
exports.importLeads = async (req, res) => {
  try {
    const { leads, autoAssign } = req.body || {};
    if (!Array.isArray(leads)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: leads must be an array' });
    }

    let created = 0, skippedDuplicates = 0, errors = 0;
    const createdIds = [];

    for (const raw of leads) {
      try {
        const name = raw.name?.trim() || [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim();
        if (!name) { errors++; continue; }
        const email = raw.email && String(raw.email).trim() !== '' ? String(raw.email).trim() : null;
        const phone = raw.phone && String(raw.phone).trim() !== '' ? String(raw.phone).trim() : null;
        const source = raw.source || null;
        const campaignId = raw.campaignId ? Number(raw.campaignId) : null;
        const status = raw.status && ['New','Contacted','Qualified','Converted','Lost'].includes(raw.status) ? raw.status : 'New';
        const company = raw.company || null;
        const jobTitle = raw.jobTitle || null;
        const industry = raw.industry || null;
        const region = raw.region || null;
        const firstName = raw.firstName || null;
        const lastName = raw.lastName || null;

        // dup check
        const dupWhere = [];
        if (email) dupWhere.push({ email });
        if (phone) dupWhere.push({ phone });
        if (dupWhere.length) {
          const dup = await Lead.findOne({ where: { [Op.or]: dupWhere } });
          if (dup) { skippedDuplicates++; continue; }
        }

        let baseScore = 10;
        if (status === 'Contacted') baseScore += 20;
        if (status === 'Qualified') baseScore += 30;
        const grade = computeGrade(baseScore);
        const isHot = baseScore > 70;

        let lead = await Lead.create({
          name,
          firstName,
          lastName,
          email,
          phone,
          source,
          campaignId,
          status,
          score: baseScore,
          grade,
          isHot,
          company,
          jobTitle,
          industry,
          region,
          autoAssignRequested: Boolean(autoAssign)
        });
        if (campaignId) { try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaignId } }); } catch {} }
        if (autoAssign && !lead.assignedTo) {
          const chosen = await assignNextSalesperson();
          await lead.update({ assignedTo: chosen.id, autoAssignRequested: true });
        }
        created++;
        createdIds.push(lead.id);
      } catch (e) {
        errors++;
      }
    }

    return res.json({ success: true, data: { created, skippedDuplicates, errors, createdIds } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to import leads' });
  }
};

// POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const { name: bodyName, firstName, lastName, email, phone, source, campaignId, status = 'New', assignedTo, company, jobTitle, industry, region, autoAssign } = req.body;
    const resolvedName = (bodyName && String(bodyName).trim() !== '') ? String(bodyName).trim() : [firstName, lastName].filter(Boolean).join(' ').trim();
    if (!resolvedName) return res.status(400).json({ success: false, message: 'Name is required' });
    if (status && !['New','Contacted','Qualified','Converted','Lost'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    // Duplicate check by email or phone (if provided)
    // Note: duplicates are allowed now; no blocking on email/phone
    let baseScore = 10; // New Lead
    if (status === 'Contacted') baseScore += 20;
    if (status === 'Qualified') baseScore += 30;
    const isHot = baseScore > 70;
    const grade = computeGrade(baseScore);
    const sanitizedEmail = email && String(email).trim() !== '' ? String(email).trim() : null;
    const sanitizedPhone = phone && String(phone).trim() !== '' ? String(phone).trim() : null;
    const lead = await Lead.create({
      name: resolvedName,
      firstName: firstName || null,
      lastName: lastName || null,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      source,
      campaignId,
      status,
      score: baseScore,
      grade,
      isHot,
      assignedTo,
      company,
      jobTitle,
      industry,
      region,
      autoAssignRequested: Boolean(autoAssign)
    });
    if (campaignId) {
      try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaignId } }); } catch {}
    }
    // Optional auto-assign on create (Salesperson round-robin). Only use existing salespeople.
    if (autoAssign && !lead.assignedTo) {
      try {
        const chosen = await assignNextSalesperson();
        await lead.update({ assignedTo: chosen.id, autoAssignRequested: true });
      } catch (e) {
        // No salespeople available — proceed without assignment
      }
    }
    // Auto-create a corresponding Deal in 'New' stage with unique work-id title (base-W###)
    try {
      const assignedSp = lead.assignedTo || null;
      const baseTitleRaw = lead.company || lead.email || lead.name;
      const baseTitle = String(baseTitleRaw || 'Work').replace(/-W\d{3}$/i, '').trim();
      const existing = await Deal.findAll({ where: { title: { [Op.like]: `${baseTitle}%` } } });
      const matched = existing.filter(d => {
        const t = String(d.title || '').trim();
        return t === baseTitle || new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-W\\d{3}$`, 'i').test(t);
      });
      const seq = matched.length + 1;
      const finalTitle = `${baseTitle}-W${String(seq).padStart(3, '0')}`;
      await Deal.create({
        title: finalTitle,
        value: 0,
        stage: 'New',
        contactId: null,
        accountId: null,
        ownerId: req.user?.id || null,
        assignedTo: assignedSp || null,
        notes: null
      });
    } catch {}
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    if (err && (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError')) {
      const message = err.errors?.[0]?.message || 'Validation error';
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Failed to create lead' });
  }
};

// PUT /api/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const { name, firstName, lastName, email, phone, source, campaignId, status, assignedTo, score, company, jobTitle, industry, region, autoAssignRequested } = req.body;
    if (status && !['New','Contacted','Qualified','Converted','Lost'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    // Scoring logic
    let newScore = typeof score === 'number' ? score : lead.score;
    if (status && status !== lead.status) {
      if (status === 'Contacted') newScore = Math.max(newScore, 10) + 20;
      if (status === 'Qualified') newScore = Math.max(newScore, 10) + 30;
      if (status === 'New') newScore = Math.max(newScore, 10);
    }
    const isHot = newScore > 70;
    const grade = computeGrade(newScore);

    const sanitizedEmail = (email !== undefined) ? (email && String(email).trim() !== '' ? email : null) : lead.email;
    const sanitizedPhone = (phone !== undefined) ? (phone && String(phone).trim() !== '' ? phone : null) : lead.phone;

    const updatedData = {
      email: sanitizedEmail,
      phone: sanitizedPhone,
      source,
      campaignId,
      status,
      assignedTo,
      score: newScore,
      grade,
      isHot,
      company,
      jobTitle,
      industry,
      region
    };
    if (firstName !== undefined) updatedData.firstName = firstName || null;
    if (lastName !== undefined) updatedData.lastName = lastName || null;
    if (autoAssignRequested !== undefined) updatedData.autoAssignRequested = Boolean(autoAssignRequested);
    if (name !== undefined && name && String(name).trim() !== '') {
      updatedData.name = String(name).trim();
    } else if ((firstName !== undefined || lastName !== undefined)) {
      const composite = [
        firstName !== undefined ? (firstName || '') : (lead.firstName || ''),
        lastName !== undefined ? (lastName || '') : (lead.lastName || '')
      ].filter(part => part && part.trim() !== '').join(' ').trim();
      if (composite) updatedData.name = composite;
    }
    await lead.update(updatedData);
    res.json({ success: true, data: lead });
  } catch (err) {
    if (err && (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError')) {
      const message = err.errors?.[0]?.message || 'Validation error';
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: 'Failed to update lead' });
  }
};

// DELETE /api/leads/:id
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    await lead.destroy();
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
};

// POST /api/leads/assign
// Body: { leadId?: number } -> if not provided, assign the most recent unassigned lead
exports.assignLead = async (req, res) => {
  try {
    const { leadId } = req.body;
    let lead = leadId ? await Lead.findByPk(leadId) : await Lead.findOne({ where: { assignedTo: null }, order: [['createdAt', 'DESC']] });
    if (!lead) return res.status(404).json({ success: false, message: 'No lead found to assign' });

    let assignee = null;
    try {
      assignee = await assignNextSalesperson();
    } catch (e) {
      return res.status(404).json({ success: false, message: 'No salespeople available for assignment' });
    }
    await lead.update({ assignedTo: assignee.id, autoAssignRequested: true });
    // Also reflect assignment in the most recent auto-created Deal for this lead, if present
    try {
      const title = `${lead.name} Opportunity`;
      const deal = await Deal.findOne({ where: { title }, order: [['createdAt', 'DESC']] });
      if (deal) {
        await deal.update({ assignedTo: assignee.id });
      }
    } catch {}
    res.json({ success: true, data: { lead, assignee } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign lead' });
  }
};

// POST /api/leads/convert/:id
exports.convertLead = async (req, res) => {
  const t = await Lead.sequelize.transaction();
  try {
    const lead = await Lead.findByPk(req.params.id, { transaction: t });
    if (!lead) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Create or reuse Account (by name)
    const accountName = lead.company || lead.name;
    let account = null;
    if (accountName) {
      account = await Account.findOne({ where: { name: accountName }, transaction: t });
      if (!account) {
        account = await Account.create({ name: accountName, industry: lead.industry || null, region: lead.region || null }, { transaction: t });
      }
    }

    // Create contact linked to Account
    const contact = await Contact.create({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company || null,
      accountId: account ? account.id : null,
      assignedTo: lead.assignedTo || req.user?.id
    }, { transaction: t });

    // Create a deal linked to Contact and Account with unique work-id title
    const baseTitleRaw = lead.company || lead.email || lead.name;
    const baseTitle = String(baseTitleRaw || 'Work').replace(/-W\d{3}$/i, '').trim();
    const existing = await Deal.findAll({ where: { title: { [Op.like]: `${baseTitle}%` } }, transaction: t });
    const matched = existing.filter(d => {
      const tt = String(d.title || '').trim();
      return tt === baseTitle || new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-W\\d{3}$`, 'i').test(tt);
    });
    const seq = matched.length + 1;
    const finalTitle = `${baseTitle}-W${String(seq).padStart(3, '0')}`;
    const deal = await Deal.create({
      title: finalTitle,
      value: 0,
      stage: 'New',
      contactId: contact.id,
      accountId: account ? account.id : null,
      ownerId: req.user?.id,
      assignedTo: lead.assignedTo || null
    }, { transaction: t });

    // Transfer lead-linked tasks to Deal
    const leadTasks = await Task.findAll({ where: { leadId: lead.id }, transaction: t });
    for (const task of leadTasks) {
      await task.update({ relatedDealId: deal.id, leadId: null }, { transaction: t });
    }

    // Delete lead after conversion
    await lead.destroy({ transaction: t });
    await t.commit();

    res.json({ success: true, data: { account, contact, deal } });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Failed to convert lead' });
  }
};
