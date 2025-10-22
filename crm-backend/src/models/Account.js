const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Company scoring/enrichment fields
  domain: {
    type: DataTypes.STRING,
    allowNull: true
  },
  employeeCount: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  annualRevenue: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  growthRate: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  fundingStage: {
    type: DataTypes.ENUM('Seed','Series A','Series B','Series C','Public'),
    allowNull: true
  },
  techTags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isCustomer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  companyScore: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  enrichedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  enrichmentSource: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Account;
