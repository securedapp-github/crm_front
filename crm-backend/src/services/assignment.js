const { Salesperson, sequelize } = require('../models');
const { Transaction } = require('sequelize');

/**
 * Returns the next salesperson in round-robin order.
 * Prefers the earliest `lastAssignedAt`; breaks ties by lowest `assignedLeadsCount`, then id.
 * Increments their counters and updates `lastAssignedAt`.
 * @param {Transaction} [transaction]
 */
async function assignNextSalesperson({ transaction } = {}) {
  const outer = transaction || await sequelize.transaction();
  const manageTx = !transaction;
  try {
    let people = await Salesperson.findAll({
      order: [
        ['lastAssignedAt', 'ASC'],
        ['assignedLeadsCount', 'ASC'],
        ['id', 'ASC']
      ],
      transaction: outer
    });

    if (!people || people.length === 0) {
      people = await Salesperson.bulkCreate([
        { name: 'Asha Verma', email: 'asha@example.com' },
        { name: 'Rohit Menon', email: 'rohit@example.com' },
        { name: 'Kiran Rao', email: 'kiran@example.com' },
        { name: 'Leela Nair', email: 'leela@example.com' }
      ], { returning: true, transaction: outer });
    }

    const chosen = people[0];
    await chosen.update({
      assignedLeadsCount: (chosen.assignedLeadsCount || 0) + 1,
      lastAssignedAt: new Date()
    }, { transaction: outer });

    if (manageTx) await outer.commit();
    return chosen;
  } catch (err) {
    if (manageTx) await outer.rollback();
    throw err;
  }
}

module.exports = { assignNextSalesperson };
