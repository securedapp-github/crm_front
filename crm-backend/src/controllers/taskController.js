const { Task } = require('../models');

// GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, status = 'Open', assignedTo, relatedDealId, leadId, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (status && !['Open','In Progress','Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const task = await Task.create({ title, description, status, assignedTo, relatedDealId, leadId: leadId || null, dueDate: dueDate ? new Date(dueDate) : null });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { title, description, status, assignedTo, relatedDealId, leadId, dueDate } = req.body;
    if (status && !['Open','In Progress','Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await task.update({ title, description, status, assignedTo, relatedDealId, leadId: leadId === undefined ? task.leadId : leadId, dueDate: dueDate === undefined ? task.dueDate : (dueDate ? new Date(dueDate) : null) });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await task.destroy();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};
