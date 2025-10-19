const { Contact } = require('../models');

// GET /api/contacts
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch contacts' });
  }
};

// GET /api/contacts/:id
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch contact' });
  }
};

// POST /api/contacts
exports.createContact = async (req, res) => {
  try {
    const { name, email, phone, company, assignedTo } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const contact = await Contact.create({ name, email, phone, company, assignedTo });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create contact' });
  }
};

// PUT /api/contacts/:id
exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    const { name, email, phone, company, assignedTo } = req.body;
    await contact.update({ name, email, phone, company, assignedTo });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update contact' });
  }
};

// DELETE /api/contacts/:id
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    await contact.destroy();
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete contact' });
  }
};
