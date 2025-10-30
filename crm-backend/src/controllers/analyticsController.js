const { Deal, Campaign, Activity, User, Contact, Salesperson } = require('../models');
const { Op } = require('sequelize');

// GET /api/analytics/summary
// Returns KPIs, funnel, top campaigns, team performance, engagement, simple forecast
exports.getSummary = async (req, res) => {
  try {
    const { from, to, ownerId, campaignId } = req.query || {};
    const dateFrom = from ? new Date(from) : null;
    const dateTo = to ? new Date(to) : null;

    // Build WHERE clauses
    const dealWhere = {};
    const actWhere = {};
    if (dateFrom || dateTo) {
      dealWhere.createdAt = {};
      if (dateFrom) dealWhere.createdAt[Op.gte] = dateFrom;
      if (dateTo) dealWhere.createdAt[Op.lte] = dateTo;

      actWhere.occurredAt = {};
      if (dateFrom) actWhere.occurredAt[Op.gte] = dateFrom;
      if (dateTo) actWhere.occurredAt[Op.lte] = dateTo;
    }
    if (ownerId) {
      const oid = Number(ownerId);
      if (!Number.isNaN(oid)) {
        dealWhere.ownerId = oid;
      }
    }

    const contactWhere = {};
    if (dateFrom || dateTo) {
      contactWhere.createdAt = {};
      if (dateFrom) contactWhere.createdAt[Op.gte] = dateFrom;
      if (dateTo) contactWhere.createdAt[Op.lte] = dateTo;
    }

    // campaignId filtering is currently limited because deals/contacts do not carry campaignId directly.
    // We still include it for compatibility by narrowing campaign list if provided.
    let campaignsWhere = {};
    if (campaignId) {
      const cid = Number(campaignId);
      if (!Number.isNaN(cid)) {
        campaignsWhere = { id: cid };
      }
    }

    const [deals, campaigns, activities, users, people, contacts] = await Promise.all([
      Deal.findAll({ where: dealWhere }),
      Campaign.findAll({ where: campaignsWhere }),
      Activity.findAll({ where: actWhere }),
      User.findAll(),
      Salesperson.findAll(),
      Contact.findAll({ where: contactWhere })
    ]);

    const realPeople = people.filter((p) => {
      const email = String(p?.email || '').toLowerCase();
      return email && !email.endsWith('@example.com');
    });

    // KPIs derived from deals (each deal represents a qualified lead in the new flow)
    const totalLeads = deals.length;
    const hotLeads = deals.filter(d => d.isHot).length;
    const convertedLeads = deals.filter(d => d.stage === 'Closed Won').length;
    const conversionRate = totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const revenueWon = deals
      .filter(d => d.stage === 'Closed Won')
      .reduce((sum, d) => sum + Number(d.value || 0), 0);

    // Lead-style funnel and deal stages
    const leadFunnel = [
      { status: 'New', count: deals.filter(d => d.stage === 'New').length },
      { status: 'Contacted', count: deals.filter(d => d.stage === 'Proposal Sent').length },
      { status: 'Qualified', count: deals.filter(d => d.stage === 'Negotiation').length },
      { status: 'Converted', count: deals.filter(d => d.stage === 'Closed Won').length },
      { status: 'Lost', count: deals.filter(d => d.stage === 'Closed Lost').length }
    ];

    const dealStages = ['New','Proposal Sent','Negotiation','Closed Won','Closed Lost']
      .map(stage => ({ stage, count: deals.filter(d => d.stage === stage).length }));

    const topCampaignsByLeads = campaigns
      .map(c => ({ id: c.id, name: c.name, count: Number(c.leadsGenerated || 0) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const engagement = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const wonLast30 = deals
      .filter(d => d.stage === 'Closed Won' && d.updatedAt && new Date(d.updatedAt) >= last30)
      .reduce((sum, d) => sum + Number(d.value || 0), 0);

    const team = users.map(user => {
      const leadsAssigned = contacts.filter(c => c.assignedTo === user.id).length;
      const dealsOwned = deals.filter(d => d.ownerId === user.id).length;
      const dealsWon = deals.filter(d => d.ownerId === user.id && d.stage === 'Closed Won').length;
      return {
        userId: user.id,
        name: user.name || `User #${user.id}`,
        leadsAssigned,
        dealsOwned,
        dealsWon
      };
    }).sort((a, b) => (b.dealsWon - a.dealsWon) || (b.dealsOwned - a.dealsOwned)).slice(0, 10);

    const leadsPerSalesperson = realPeople.map(p => {
      const assignedDeals = deals.filter(d => d.assignedTo === p.id);
      return {
        id: p.id,
        name: p.name,
        leads: assignedDeals.length
      };
    });

    const dealsBySalesperson = realPeople.map(p => {
      const assignedDeals = deals.filter(d => d.assignedTo === p.id);
      const wonDeals = assignedDeals.filter(d => d.stage === 'Closed Won');
      return {
        id: p.id,
        name: p.name,
        deals: assignedDeals.length,
        won: wonDeals.length
      };
    });

    const conversionRatePerSalesperson = dealsBySalesperson.map(item => ({
      id: item.id,
      name: item.name,
      rate: item.deals ? Math.round((item.won / item.deals) * 100) : 0
    }));

    const topSalespersonByDeals = dealsBySalesperson
      .slice()
      .sort((a, b) => (b.won - a.won) || (b.deals - a.deals))
      [0] || null;

    const stageToPipeline = (stage) => {
      if (stage === 'Negotiation') return 'In Progress';
      if (stage === 'Proposal Sent') return 'Proposal';
      if (stage === 'Closed Won') return 'Won';
      if (stage === 'Closed Lost') return 'Lost';
      return 'New';
    };

    const pipelineStages = ['New', 'In Progress', 'Proposal', 'Won', 'Lost'];
    const pipelineOverview = pipelineStages.map(stage => ({
      stage,
      count: deals.filter(d => stageToPipeline(d.stage) === stage).length
    }));

    const summary = {
      kpis: { totalLeads, hotLeads, convertedLeads, conversionRate, revenueWon },
      funnel: { leadFunnel, dealStages },
      campaigns: { topCampaignsByLeads },
      team,
      engagement,
      forecast: { next30daysRevenue: wonLast30 },
      sales: { leadsPerSalesperson, conversionRatePerSalesperson, topSalespersonByDeals, pipelineOverview }
    };

    return res.json({ success: true, data: summary });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};
