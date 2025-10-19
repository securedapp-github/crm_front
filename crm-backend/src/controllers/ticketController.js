const { Ticket } = require('../models');

// GET /api/tickets
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

// POST /api/tickets
exports.createTicket = async (req, res) => {
  try {
    const { title, description, status = 'Open', assignedTo, contactId } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (status && !['Open','In Progress','Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const ticket = await Ticket.create({ title, description, status, assignedTo, contactId });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

// PUT /api/tickets/:id
exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const { title, description, status, assignedTo, contactId } = req.body;
    if (status && !['Open','In Progress','Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await ticket.update({ title, description, status, assignedTo, contactId });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};

// DELETE /api/tickets/:id
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    await ticket.destroy();
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete ticket' });
  }
};
