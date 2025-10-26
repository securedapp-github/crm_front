const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Salesperson = sequelize.define('Salesperson', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  assignedLeadsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { timestamps: true });

module.exports = Salesperson;
