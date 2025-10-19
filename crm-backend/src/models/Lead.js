const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('Website', 'Social Media', 'Email', 'Referral', 'Event'),
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('New', 'Contacted', 'Qualified', 'Converted', 'Lost'),
    defaultValue: 'New'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  grade: {
    type: DataTypes.ENUM('A','B','C'),
    allowNull: true
  },
  isHot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Lead;
