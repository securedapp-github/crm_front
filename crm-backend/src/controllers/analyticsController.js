const { Lead, Deal, Campaign, Activity, Task, User } = require('../models');
const { Op } = require('sequelize');

// GET /api/analytics/summary
// Returns KPIs, funnel, top campaigns, team performance, engagement, simple forecast
exports.getSummary = async (req, res) => {
  try {
    const { from, to, ownerId, campaignId } = req.query || {};
    const dateFrom = from ? new Date(from) : null;
    const dateTo = to ? new Date(to) : null;

    // Build WHERE clauses
    const leadWhere = {};
    const dealWhere = {};
    const actWhere = {};
    if (dateFrom || dateTo) {
      leadWhere.createdAt = {};
      if (dateFrom) leadWhere.createdAt[Op.gte] = dateFrom;
      if (dateTo) leadWhere.createdAt[Op.lte] = dateTo;

      dealWhere.updatedAt = {};
      if (dateFrom) dealWhere.updatedAt[Op.gte] = dateFrom;
      if (dateTo) dealWhere.updatedAt[Op.lte] = dateTo;

      actWhere.occurredAt = {};
      if (dateFrom) actWhere.occurredAt[Op.gte] = dateFrom;
      if (dateTo) actWhere.occurredAt[Op.lte] = dateTo;
    }
    if (ownerId) {
      const oid = Number(ownerId);
      if (!isNaN(oid)) dealWhere.ownerId = oid;
    }
    if (campaignId) {
      const cid = Number(campaignId);
      if (!isNaN(cid)) leadWhere.campaignId = cid;
    }

    // Load datasets with filters
    const [leads, deals, campaigns, activities, users] = await Promise.all([
      Lead.findAll({ where: leadWhere }),
      Deal.findAll({ where: dealWhere }),
      Campaign.findAll(),
      Activity.findAll({ where: actWhere }),
      User.findAll(),
    ]);

    // KPIs
    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => l.isHot).length;
    const convertedLeads = leads.filter(l => l.status === 'Converted').length;
    const conversionRate = totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    // Funnel (Leads by status, Deals by stage)
    const leadFunnel = ['New','Contacted','Qualified','Converted','Lost']
      .map(s => ({ status: s, count: leads.filter(l => l.status === s).length }));
    const dealStages = ['New','Proposal Sent','Negotiation','Closed Won','Closed Lost']
      .map(s => ({ stage: s, count: deals.filter(d => d.stage === s).length }));

    // Campaign performance (by leads count + by revenue from Closed Won deals linked via account/contact optional)
    // Use leads.campaignId counts
    const campaignLeadCounts = leads.reduce((acc, l) => {
      if (!l.campaignId) return acc; acc[l.campaignId] = (acc[l.campaignId] || 0) + 1; return acc;
    }, {});
    const topCampaignsByLeads = Object.entries(campaignLeadCounts).map(([id, count]) => ({
      id: Number(id),
      name: (campaigns.find(c => c.id === Number(id))?.name) || `#${id}`,
      count
    })).sort((a,b)=>b.count-a.count).slice(0,5);

    // Revenue attribution: sum deal.value for Closed Won (no strict link to campaign yet; can be enhanced later)
    const revenueByStage = deals.reduce((acc, d) => {
      if (d.stage === 'Closed Won') acc.won = (acc.won || 0) + Number(d.value || 0);
      return acc;
    }, { won: 0 });

    // Team performance: per user number of leads assigned and deals owned (won)
    const team = users.map(u => {
      const leadsAssigned = leads.filter(l => l.assignedTo === u.id).length;
      const dealsOwned = deals.filter(d => d.ownerId === u.id).length;
      const dealsWon = deals.filter(d => d.ownerId === u.id && d.stage === 'Closed Won').length;
      return { userId: u.id, name: u.name || `User #${u.id}`, leadsAssigned, dealsOwned, dealsWon };
    }).sort((a,b)=>b.dealsWon - a.dealsWon).slice(0,10);

    // Engagement: counts of activity types
    const engagement = activities.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1; return acc;
    }, {});

    // Forecast (very simple): next 30 days forecast equals last 30 days Closed Won sum
    const now = new Date();
    const last30 = new Date(now); last30.setDate(now.getDate() - 30);
    const wonLast30 = deals.filter(d => d.stage === 'Closed Won' && d.updatedAt && new Date(d.updatedAt) >= last30)
      .reduce((sum, d) => sum + Number(d.value || 0), 0);

    // Salesperson metrics
    let people = [];
    try {
      const { Salesperson } = require('../models');
      if (Salesperson) {
        people = await Salesperson.findAll();
      }
    } catch (err) {
      people = [];
    }
    const leadsPerSalesperson = people.map(p => ({ id: p.id, name: p.name, leads: leads.filter(l => l.assignedTo === p.id).length }));
    const conversionsBySalesperson = people.map(p => ({ id: p.id, name: p.name, converted: leads.filter(l => l.assignedTo === p.id && l.status === 'Converted').length }));
    const conversionRatePerSalesperson = conversionsBySalesperson.map(c => {
      const total = leadsPerSalesperson.find(x => x.id === c.id)?.leads || 0;
      return { id: c.id, name: c.name, rate: total ? Math.round((c.converted / total) * 100) : 0 };
    });
    const dealsBySalesperson = people.map(p => ({ id: p.id, name: p.name, deals: deals.filter(d => d.assignedTo === p.id).length, won: deals.filter(d => d.assignedTo === p.id && d.stage === 'Closed Won').length }));
    const topSalespersonByDeals = dealsBySalesperson.slice().sort((a,b)=> b.won - a.won || b.deals - a.deals)[0] || null;

    // Pipeline overview (map legacy -> new pipeline stages)
    const mapToPipeline = (s) => {
      if (s === 'Proposal Sent') return 'Proposal';
      if (s === 'Negotiation') return 'In Progress';
      if (s === 'Closed Won') return 'Won';
      if (s === 'Closed Lost') return 'Lost';
      return 'New';
    };
    const pipelineStages = ['New','In Progress','Proposal','Won','Lost'];
    const pipelineOverview = pipelineStages.map(st => ({ stage: st, count: deals.filter(d => mapToPipeline(d.stage) === st).length }));

    const summary = {
      kpis: { totalLeads, hotLeads, convertedLeads, conversionRate, revenueWon: revenueByStage.won || 0 },
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
