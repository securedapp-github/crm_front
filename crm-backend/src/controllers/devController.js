const { Campaign, Lead, Deal, Contact, Account, Activity, User } = require('../models');
const { computeCampaignStrength } = require('../services/campaignScoring');

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
