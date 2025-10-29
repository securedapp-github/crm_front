const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  budget: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD'
  },
  expectedSpend: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: true
  },
  plannedLeads: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Planned', 'Active', 'Paused', 'Completed'),
    defaultValue: 'Planned'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High'),
    defaultValue: 'Medium'
  },
  objective: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  channel: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  audienceSegment: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  productLine: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  campaignOwnerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  externalCampaignId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  utmSource: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  utmMedium: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  utmCampaign: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  accountCompany: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  accountDomain: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING(32),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  complianceChecklist: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  actualSpend: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0.00
  },
  leadsGenerated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  wonDeals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  revenueAttributed: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  timestamps: true
});

module.exports = Campaign;
