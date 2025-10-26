const { Deal, Salesperson } = require('../models');

const PIPELINE_STAGES = ['New', 'In Progress', 'Proposal', 'Won', 'Lost'];

exports.getDealsByStage = async (_req, res) => {
  try {
    // Map legacy stages to new pipeline where possible
    const mapStage = (s) => {
      if (s === 'Proposal Sent') return 'Proposal';
      if (s === 'Negotiation') return 'In Progress';
      if (s === 'Closed Won') return 'Won';
      if (s === 'Closed Lost') return 'Lost';
      return 'New';
    };
    const deals = await Deal.findAll({ order: [['updatedAt', 'DESC']] });
    const grouped = PIPELINE_STAGES.reduce((acc, st) => { acc[st] = []; return acc; }, {});
    deals.forEach(d => {
      const stage = mapStage(d.stage);
      const plain = d.toJSON();
      plain.pipelineStage = stage;
      grouped[stage].push(plain);
    });
    return res.json({ success: true, data: grouped });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pipeline' });
  }
};

exports.moveDealStage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { stage } = req.body || {};
    if (!PIPELINE_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }
    const deal = await Deal.findByPk(id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    // Map new pipeline to legacy deal stages for backward compatibility
    const toLegacy = (s) => {
      if (s === 'Proposal') return 'Proposal Sent';
      if (s === 'In Progress') return 'Negotiation';
      if (s === 'Won') return 'Closed Won';
      if (s === 'Lost') return 'Closed Lost';
      return 'New';
    };
    await deal.update({ stage: toLegacy(stage) });
    return res.json({ success: true, data: deal });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to move deal' });
  }
};

exports.getOverview = async (_req, res) => {
  try {
    const deals = await Deal.findAll();
    const totals = {
      counts: {
        won: deals.filter(d => d.stage === 'Closed Won').length,
        lost: deals.filter(d => d.stage === 'Closed Lost').length,
        pending: deals.filter(d => !['Closed Won','Closed Lost'].includes(d.stage)).length,
      },
      valueByStage: deals.reduce((acc, d) => {
        const key = d.stage;
        acc[key] = (acc[key] || 0) + Number(d.value || 0);
        return acc;
      }, {})
    };
    return res.json({ success: true, data: totals });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

exports.getPeople = async (_req, res) => {
  try {
    let people = await Salesperson.findAll({ order: [['id','ASC']] });
    if (!people || people.length === 0) {
      const seeds = [
        { name: 'Asha Verma', email: 'asha@example.com' },
        { name: 'Rohit Menon', email: 'rohit@example.com' },
        { name: 'Kiran Rao', email: 'kiran@example.com' },
        { name: 'Leela Nair', email: 'leela@example.com' },
      ];
      people = await Salesperson.bulkCreate(seeds, { returning: true });
    }
    return res.json({ success: true, data: people });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load salespeople' });
  }
};
