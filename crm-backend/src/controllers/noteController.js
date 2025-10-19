const { Note } = require('../models');

// GET /api/notes
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, count: notes.length, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};

// POST /api/notes
exports.createNote = async (req, res) => {
  try {
    const { content, entityType, entityId } = req.body;
    if (!content || !entityType || !entityId) return res.status(400).json({ success: false, message: 'content, entityType and entityId are required' });
    const note = await Note.create({ content, entityType, entityId, authorId: req.user?.id });
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
};

// DELETE /api/notes/:id
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });
    await note.destroy();
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};
