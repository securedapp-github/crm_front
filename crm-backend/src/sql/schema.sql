CREATE DATABASE IF NOT EXISTS crmdb
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE crmdb;

-- Users table (matches Sequelize model: src/models/User.js)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salespeople table (matches: src/models/Salesperson.js)
CREATE TABLE IF NOT EXISTS salespeople (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  assignedLeadsCount INT NOT NULL DEFAULT 0,
  lastAssignedAt DATETIME NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts table (matches: src/models/Contact.js)
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  company VARCHAR(255) NULL,
  assignedTo INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contacts_assignedTo (assignedTo),
  CONSTRAINT fk_contacts_assignedTo_users FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leads table (matches: src/models/Lead.js)
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(100) NULL,
  lastName VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  company VARCHAR(255) NULL,
  jobTitle VARCHAR(255) NULL,
  source ENUM('Website','Social Media','Email','Referral','Event') NULL,
  industry VARCHAR(150) NULL,
  region VARCHAR(150) NULL,
  campaignId INT NULL,
  status ENUM('New','Contacted','Qualified','Converted','Lost') NOT NULL DEFAULT 'New',
  score INT NOT NULL DEFAULT 10,
  grade ENUM('A','B','C') NULL,
  isHot TINYINT(1) NOT NULL DEFAULT 0,
  autoAssignRequested TINYINT(1) NOT NULL DEFAULT 0,
  assignedTo INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_assignedTo (assignedTo),
  INDEX idx_leads_campaignId (campaignId),
  CONSTRAINT fk_leads_assignedTo_users FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_leads_campaign FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activities table (matches: src/models/Activity.js)
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leadId INT NOT NULL,
  type ENUM('email_open','link_click','webinar_attend','inactive') NOT NULL,
  points INT NOT NULL DEFAULT 0,
  meta JSON NULL,
  occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_activities_leadId (leadId),
  CONSTRAINT fk_activities_lead FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deals table (matches: src/models/Deal.js)
CREATE TABLE IF NOT EXISTS deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  value INT NOT NULL,
  stage ENUM('New','In Progress','Closed') NOT NULL DEFAULT 'New',
  contactId INT NULL,
  ownerId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_deals_contactId (contactId),
  INDEX idx_deals_ownerId (ownerId),
  CONSTRAINT fk_deals_contact FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_deals_owner FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table (matches: src/models/Task.js)
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  assignedTo INT NULL,
  relatedDealId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_assignedTo (assignedTo),
  INDEX idx_tasks_relatedDealId (relatedDealId),
  CONSTRAINT fk_tasks_assignedTo_users FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_relatedDeal FOREIGN KEY (relatedDealId) REFERENCES deals(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: The sessions table used by express-mysql-session will be auto-created in this database.

-- Campaigns table (matches: src/models/Campaign.js)
CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NULL,
  startDate DATE NULL,
  endDate DATE NULL,
  budget DECIMAL(12,2) NULL,
  currency CHAR(3) NULL DEFAULT 'USD',
  expectedSpend DECIMAL(12,2) NULL,
  plannedLeads INT NULL,
  status ENUM('Planned','Active','Paused','Completed') NOT NULL DEFAULT 'Planned',
  priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  objective VARCHAR(255) NULL,
  description TEXT NULL,
  channel VARCHAR(100) NULL,
  audienceSegment VARCHAR(255) NULL,
  productLine VARCHAR(255) NULL,
  campaignOwnerId INT NULL,
  externalCampaignId VARCHAR(100) NULL,
  utmSource VARCHAR(100) NULL,
  utmMedium VARCHAR(100) NULL,
  utmCampaign VARCHAR(100) NULL,
  complianceChecklist TEXT NULL,
  actualSpend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  leadsGenerated INT NOT NULL DEFAULT 0,
  wonDeals INT NOT NULL DEFAULT 0,
  revenueAttributed DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaigns_owner FOREIGN KEY (campaignOwnerId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tickets table (matches: src/models/Ticket.js)
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  assignedTo INT NULL,
  contactId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tickets_assignedTo (assignedTo),
  INDEX idx_tickets_contactId (contactId),
  CONSTRAINT fk_tickets_assignedTo_users FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_contact FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes table (matches: src/models/Note.js)
CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  entityType ENUM('lead','contact','deal') NOT NULL,
  entityId INT NOT NULL,
  authorId INT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notes_entity (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
