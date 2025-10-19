const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deal = sequelize.define('Deal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  stage: {
    type: DataTypes.ENUM('New', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'),
    defaultValue: 'New'
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Deal;
