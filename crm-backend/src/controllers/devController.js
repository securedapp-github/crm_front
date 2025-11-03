const { Campaign, Lead, Deal, Contact, Account, Activity, User } = require('../models');
const { computeCampaignStrength } = require('../services/campaignScoring');
const { Op } = require('sequelize');

exports.seed = async (_req, res) => {
  const t = await Campaign.sequelize.transaction();
  try {
    // Users (assignees)
    const users = await User.findAll({ transaction: t });
    const ownerId = users[0]?.id || null;

    // Create sample campaigns
    const samples = [
      {
        name: 'Netflix Product Launch Q4', channel: 'Multi-channel', priority: 'High', status: 'Active',
        objective: 'New product acquisition', audienceSegment: 'Enterprise', budget: 500000, expectedSpend: 480000,
        utmSource: 'newsletter', utmMedium: 'email', utmCampaign: 'launch_q4'
      },
      {
        name: 'Summer Webinar Series', channel: 'Email', priority: 'Medium', status: 'Planned',
        objective: 'Awareness and signups', audienceSegment: 'Mid-market', budget: 100000, expectedSpend: 90000,
        utmSource: 'social', utmMedium: 'organic', utmCampaign: 'summer_webinars'
      }
    ];

    const createdCampaigns = [];
    for (const s of samples) {
      const c = await Campaign.create({ ...s, currency: 'USD', code: s.name.toUpperCase().replace(/\s+/g, '_') }, { transaction: t });
      createdCampaigns.push(c);

      // Auto create lead+deal similar to createCampaign controller
      const placeholderName = `Campaign Lead - ${c.name}`;
      const contact = await Contact.create({ name: placeholderName }, { transaction: t });
      const deal = await Deal.create({ title: `${placeholderName} Opportunity`, value: 0, stage: 'New', contactId: contact.id, ownerId }, { transaction: t });
      await Campaign.increment('leadsGenerated', { by: 1, where: { id: c.id }, transaction: t });

      // Apply basic scoring from campaign inputs
      const score = computeCampaignStrength(s);
      if (score?.total) {
        await deal.update({ score: score.total, grade: score.total >= 90 ? 'A' : score.total >= 70 ? 'B' : 'C', isHot: score.total > 70 }, { transaction: t });
      }
    }

    // Additional contacts/deals to enrich funnel and revenue
    const acc = await Account.create({ name: 'Acme Inc', domain: 'acme.com' }, { transaction: t });
    const contact2 = await Contact.create({ name: 'John Doe', email: 'john@acme.com', accountId: acc.id }, { transaction: t });
    await Deal.create({ title: 'John Doe Opportunity', value: 25000, stage: 'Proposal Sent', contactId: contact2.id, accountId: acc.id, ownerId }, { transaction: t });
    await Deal.create({ title: 'John Doe Expansion', value: 75000, stage: 'Closed Won', contactId: contact2.id, accountId: acc.id, ownerId }, { transaction: t });

    // Leads with statuses
    await Lead.create({ name: 'Priya Sharma', status: 'New', score: 10, grade: 'C', isHot: false }, { transaction: t });
    await Lead.create({ name: 'Ravi Kumar', status: 'Contacted', score: 30, grade: 'C', isHot: false }, { transaction: t });
    await Lead.create({ name: 'Anita Gupta', status: 'Qualified', score: 40, grade: 'B', isHot: false }, { transaction: t });
    await Lead.create({ name: 'Sanjay Patel', status: 'Converted', score: 80, grade: 'A', isHot: true }, { transaction: t });

    // Activities to populate engagement
    await Activity.create({ type: 'Email', subject: 'Intro email', occurredAt: new Date() }, { transaction: t });
    await Activity.create({ type: 'Call', subject: 'Discovery call', occurredAt: new Date() }, { transaction: t });
    await Activity.create({ type: 'Meeting', subject: 'Demo', occurredAt: new Date() }, { transaction: t });

    await t.commit();
    return res.json({ success: true, data: { campaigns: createdCampaigns.map(c => c.id) } });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success: false, message: 'Seeding failed' });
  }
};

// POST /api/dev/normalize-deal-titles
// Body: { strategy?: 'email'|'title', dryRun?: boolean }
// - strategy 'email': base = contact.email (fallback to stripped title)
// - strategy 'title': base = stripped title (remove -W###)
exports.normalizeDealTitles = async (req, res) => {
  const { strategy = 'title', dryRun = true } = req.body || {};
  try {
    const deals = await Deal.findAll({ order: [['createdAt','ASC']] });
    const contactsById = {};
    if (strategy === 'email') {
      const cids = [...new Set(deals.map(d => d.contactId).filter(Boolean))];
      if (cids.length) {
        const cs = await Contact.findAll({ where: { id: { [Op.in]: cids } } });
        cs.forEach(c => { contactsById[c.id] = c; });
      }
    }

    const stripSuffix = (s) => String(s || '').replace(/-W\d{3}$/i, '').trim();
    const keyFor = (d) => {
      if (strategy === 'email') {
        const email = contactsById[d.contactId]?.email || null;
        return (email && email.trim()) ? email.trim().toLowerCase() : stripSuffix(d.title);
      }
      return stripSuffix(d.title);
    };

    // Group by base key
    const groups = new Map();
    for (const d of deals) {
      const k = keyFor(d);
      if (!k) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    }

    const changes = [];
    for (const [base, list] of groups.entries()) {
      // Sort by createdAt to assign deterministic sequence
      list.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        const desired = `${base}-W${String(i+1).padStart(3,'0')}`;
        if (d.title !== desired) {
          changes.push({ id: d.id, from: d.title, to: desired });
          if (!dryRun) {
            await d.update({ title: desired });
          }
        }
      }
    }

    return res.json({ success: true, data: { changes, total: changes.length, dryRun: Boolean(dryRun), strategy } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Normalization failed' });
  }
};
