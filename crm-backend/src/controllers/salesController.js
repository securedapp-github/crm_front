const { Deal, Salesperson, User } = require('../models');

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
    const people = await Salesperson.findAll();
    const enriched = people.map(p => {
      const assignedDeals = deals.filter(d => d.assignedTo === p.id);
      const wonDeals = assignedDeals.filter(d => d.stage === 'Closed Won');
      return {
        id: p.id,
        name: p.name,
        wonDeals: wonDeals.length,
        pendingDeals: assignedDeals.length - wonDeals.length,
        noteEntries: assignedDeals
          .filter(d => d.notes)
          .map(d => ({ id: d.id, title: d.title, notes: d.notes, updatedAt: d.updatedAt }))
      };
    });
    return res.json({ success: true, data: { totals, people: enriched } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

exports.getPeople = async (_req, res) => {
  try {
    const [people, users, deals] = await Promise.all([
      Salesperson.findAll({ order: [['id', 'ASC']] }),
      User.findAll({ where: { role: 'sales' }, attributes: ['id', 'name', 'email', 'salesId'] }),
      Deal.findAll({ attributes: ['id', 'assignedTo', 'notes', 'updatedAt', 'title'] })
    ]);

    const dealAssignments = deals.map(d => d.get({ plain: true }));

    const normalise = (val) => String(val || '').trim().toLowerCase();

    const lookupUsers = new Map(
      users
        .map((u) => ({
          ...u.toJSON(),
          email: normalise(u.email)
        }))
        .filter((u) => u.email && !u.email.endsWith('@example.com'))
        .map((u) => [u.email, u])
    );

    const peopleByEmail = new Map(
      people
        .map((sp) => ({ ...sp.toJSON(), email: normalise(sp.email) }))
        .filter((sp) => sp.email)
        .map((sp) => [sp.email, sp])
    );

    const missingUsers = [];
    for (const [email, user] of lookupUsers.entries()) {
      if (!peopleByEmail.has(email)) {
        missingUsers.push(user);
      }
    }

    if (missingUsers.length) {
      const created = await Promise.all(
        missingUsers.map((user) =>
          Salesperson.create({
            name: user.name || user.email.split('@')[0],
            email: user.email
          })
        )
      );
      created.forEach((sp) => {
        const email = normalise(sp.email);
        peopleByEmail.set(email, sp.toJSON());
      });
    }

    const enriched = Array.from(peopleByEmail.entries())
      .filter(([, sp]) => sp.email && !sp.email.endsWith('@example.com'))
      .map(([, sp]) => {
        const match = lookupUsers.get(sp.email);
        const assignedDeals = dealAssignments.filter(d => d.assignedTo === sp.id);
        return {
          ...sp,
          userId: match?.id ?? null,
          salesId: match?.salesId ?? null,
          userName: match?.name ?? sp.name,
          noteEntries: assignedDeals
            .filter(d => d.notes)
            .map(d => ({ id: d.id, title: d.title, notes: d.notes, updatedAt: d.updatedAt }))
        };
      })
      .sort((a, b) => a.id - b.id);

    return res.json({ success: true, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load salespeople' });
  }
};
