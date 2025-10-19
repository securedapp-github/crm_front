const { Lead, User, Contact, Deal, Campaign, Activity, Task, Account } = require('../models');
const { Op } = require('sequelize');

// Scoring config
const ACTIVITY_POINTS = {
  email_open: 5,
  link_click: 10,
  webinar_attend: 15,
  inactive: -10
};

// GET /api/leads/:id/timeline
exports.listTimeline = async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    const lead = await Lead.findByPk(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const [activities, tasks] = await Promise.all([
      Activity.findAll({ where: { leadId }, order: [['occurredAt', 'DESC']] }),
      Task.findAll({ where: { leadId }, order: [['dueDate', 'DESC'], ['createdAt','DESC']] })
    ]);
    const timeline = [
      ...activities.map(a => ({
        type: 'activity',
        when: a.occurredAt || a.createdAt,
        data: a
      })),
      ...tasks.map(t => ({
        type: 'task',
        when: t.dueDate || t.createdAt,
        data: t
      }))
    ].sort((a, b) => new Date(b.when) - new Date(a.when));
    return res.json({ success: true, count: timeline.length, data: timeline });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
};

const computeGrade = (score) => {
  if (typeof score !== 'number') return null;
  if (score >= 70) return 'A';
  if (score >= 40) return 'B';
  return 'C';
};

// GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: leads.length, data: leads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
};

// GET /api/leads/:id/activities
exports.listActivities = async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    const lead = await Lead.findByPk(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const activities = await Activity.findAll({ where: { leadId }, order: [['occurredAt', 'DESC']] });
    return res.json({ success: true, count: activities.length, data: activities });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

// POST /api/leads/:id/activities
// Body: { type: 'email_open'|'link_click'|'webinar_attend'|'inactive', points?: number, meta?: any, occurredAt?: Date }
exports.addActivity = async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    const lead = await Lead.findByPk(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const { type, points, meta, occurredAt } = req.body || {};
    if (!['email_open','link_click','webinar_attend','inactive'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid activity type' });
    }
    const delta = typeof points === 'number' ? points : (ACTIVITY_POINTS[type] ?? 0);
    const activity = await Activity.create({ leadId, type, points: delta, meta: meta || null, occurredAt: occurredAt ? new Date(occurredAt) : new Date() });

    // Update lead score/grade/isHot
    const newScore = Math.max(0, (lead.score || 0) + delta);
    const grade = computeGrade(newScore);
    const isHot = newScore > 70;
    await lead.update({ score: newScore, grade, isHot });
    return res.status(201).json({ success: true, data: { activity, lead } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add activity' });
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
        const name = raw.name?.trim();
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
        const isHot = baseScore > 70;

        let lead = await Lead.create({ name, email, phone, source, campaignId, status, score: baseScore, isHot, company, jobTitle, industry, region });
        if (campaignId) { try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaignId } }); } catch {} }
        if (autoAssign && !lead.assignedTo) {
          const users = await User.findAll({ where: { role: 'user' }, order: [['id', 'ASC']] });
          if (users && users.length > 0) {
            const counts = await Promise.all(users.map(async (u) => ({ user: u, count: await Lead.count({ where: { assignedTo: u.id } }) })));
            counts.sort((a, b) => a.count - b.count);
            const assignee = counts[0].user;
            await lead.update({ assignedTo: assignee.id });
          }
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
    const { name, email, phone, source, campaignId, status = 'New', assignedTo, company, jobTitle, industry, region, autoAssign } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (status && !['New','Contacted','Qualified','Converted','Lost'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    // Duplicate check by email or phone (if provided)
    const dupWhere = [];
    if (email && String(email).trim() !== '') dupWhere.push({ email: String(email).trim() });
    if (phone && String(phone).trim() !== '') dupWhere.push({ phone: String(phone).trim() });
    if (dupWhere.length) {
      const dup = await Lead.findOne({ where: { [Op.or]: dupWhere } });
      if (dup) {
        return res.status(400).json({ success: false, message: 'Duplicate lead exists with same email or phone' });
      }
    }
    let baseScore = 10; // New Lead
    if (status === 'Contacted') baseScore += 20;
    if (status === 'Qualified') baseScore += 30;
    const isHot = baseScore > 70;
    const grade = computeGrade(baseScore);
    const sanitizedEmail = email && String(email).trim() !== '' ? String(email).trim() : null;
    const sanitizedPhone = phone && String(phone).trim() !== '' ? String(phone).trim() : null;
    let lead = await Lead.create({ name, email: sanitizedEmail, phone: sanitizedPhone, source, campaignId, status, score: baseScore, grade, isHot, assignedTo, company, jobTitle, industry, region });
    if (campaignId) {
      try { await Campaign.increment('leadsGenerated', { by: 1, where: { id: campaignId } }); } catch {}
    }
    // Optional auto-assign on create
    if (autoAssign && !lead.assignedTo) {
      const users = await User.findAll({ where: { role: 'user' }, order: [['id', 'ASC']] });
      if (users && users.length > 0) {
        const counts = await Promise.all(users.map(async (u) => ({ user: u, count: await Lead.count({ where: { assignedTo: u.id } }) })));
        counts.sort((a, b) => a.count - b.count);
        const assignee = counts[0].user;
        await lead.update({ assignedTo: assignee.id });
      }
    }
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
    const { name, email, phone, source, campaignId, status, assignedTo, score, company, jobTitle, industry, region } = req.body;
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

    await lead.update({ name, email: sanitizedEmail, phone: sanitizedPhone, source, campaignId, status, assignedTo, score: newScore, grade, isHot, company, jobTitle, industry, region });
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

    const users = await User.findAll({ where: { role: 'user' }, order: [['id', 'ASC']] });
    if (!users || users.length === 0) {
      return res.status(400).json({ success: false, message: 'No sales users available for assignment' });
    }

    // Simple round-robin by counting current lead assignments
    const counts = await Promise.all(users.map(async (u) => ({ user: u, count: await Lead.count({ where: { assignedTo: u.id } }) })));
    counts.sort((a, b) => a.count - b.count);
    const assignee = counts[0].user;

    await lead.update({ assignedTo: assignee.id });
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

    // Create a deal linked to Contact and Account
    const deal = await Deal.create({
      title: `${lead.name} Opportunity`,
      value: 0,
      stage: 'New',
      contactId: contact.id,
      accountId: account ? account.id : null,
      ownerId: lead.assignedTo || req.user?.id
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
