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
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  },
  // Scoring fields for qualification/prioritisation
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  grade: {
    type: DataTypes.ENUM('A','B','C'),
    allowNull: true
  },
  isHot: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true
});

module.exports = Deal;
