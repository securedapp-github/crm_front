const { Account, Deal } = require('../models');
const { computeCompanyScoreFromHeuristics, applyDealScoreFromCompany } = require('../services/scoring');

exports.scoreAccount = async (req, res) => {
  const t = await Account.sequelize.transaction();
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid account id' });
    }

    const acc = await Account.findByPk(id, { transaction: t });
    if (!acc) { await t.rollback(); return res.status(404).json({ success:false, message:'Account not found' }); }

    const updatable = ['domain','region','industry','employeeCount','annualRevenue','growthRate','fundingStage','techTags','isCustomer','riskScore','enrichmentSource'];
    const updates = {};
    for (const k of updatable) if (req.body[k] !== undefined) updates[k] = req.body[k];
    updates.enrichedAt = new Date();
    await acc.update(updates, { transaction: t });

    const companyScore = await computeCompanyScoreFromHeuristics(acc);
    await acc.update({ companyScore }, { transaction: t });

    const deals = await Deal.findAll({ where: { accountId: acc.id }, transaction: t });
    const updatedDeals = [];
    for (const d of deals) {
      const patch = applyDealScoreFromCompany(companyScore);
      await d.update(patch, { transaction: t });
      updatedDeals.push({ dealId: d.id, ...patch });
    }

    await t.commit();
    return res.json({ success: true, data: { accountId: acc.id, companyScore, updatedDeals } });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success:false, message:'Failed to score account' });
  }
};

// GET /api/accounts/resolve?domain=example.com&name=Acme
// Returns whether an account exists by domain or name. No mutations.
exports.resolveAccount = async (req, res) => {
  try {
    const rawDomain = req.query.domain ? String(req.query.domain).trim().toLowerCase() : null;
    const rawName = req.query.name ? String(req.query.name).trim() : null;
    if (!rawDomain && !rawName) {
      return res.status(400).json({ success: false, message: 'Provide domain or name' });
    }
    const where = {};
    if (rawDomain) where.domain = rawDomain;
    if (rawName) where.name = rawName;
    const acc = await Account.findOne({ where });
    if (!acc) return res.json({ success: true, data: { exists: false } });
    return res.json({ success: true, data: { exists: true, accountId: acc.id } });
  } catch (e) {
    return res.status(500).json({ success:false, message:'Failed to resolve account' });
  }
};
