const User = require('./User');
const Contact = require('./Contact');
const Lead = require('./Lead');
const Account = require('./Account');
const Activity = require('./Activity');
const Deal = require('./Deal');
const Task = require('./Task');
const Campaign = require('./Campaign');
const Ticket = require('./Ticket');
const Note = require('./Note');
const Quote = require('./Quote');

// Associations
// User
User.hasMany(Contact, { foreignKey: 'assignedTo', as: 'contacts' });
Contact.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Lead, { foreignKey: 'assignedTo', as: 'leads' });
Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

User.hasMany(Deal, { foreignKey: 'ownerId', as: 'deals' });
Deal.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Task, { foreignKey: 'assignedTo', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// Contact
Deal.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Contact.hasMany(Deal, { foreignKey: 'contactId', as: 'deals' });

// Account
Account.hasMany(Contact, { foreignKey: 'accountId', as: 'contacts' });
Contact.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Account.hasMany(Deal, { foreignKey: 'accountId', as: 'deals' });
Deal.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });

// Deal
Task.belongsTo(Deal, { foreignKey: 'relatedDealId', as: 'deal' });
Deal.hasMany(Task, { foreignKey: 'relatedDealId', as: 'tasks' });

// Quote
Deal.hasMany(Quote, { foreignKey: 'dealId', as: 'quotes' });
Quote.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

// Campaign
Campaign.hasMany(Lead, { foreignKey: 'campaignId', as: 'leads' });
Lead.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

// Activity
Lead.hasMany(Activity, { foreignKey: 'leadId', as: 'activities' });
Activity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

// Ticket
User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'tickets' });
Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Contact.hasMany(Ticket, { foreignKey: 'contactId', as: 'tickets' });
Ticket.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

// Note (lightweight, no strict associations here beyond ids)

module.exports = {
  User,
  Contact,
  Lead,
  Account,
  Activity,
  Deal,
  Task,
  Campaign,
  Ticket,
  Note,
  Quote
};
