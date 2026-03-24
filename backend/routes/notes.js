const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Get all notes
router.get('/', (req, res) => {
  try {
    const search = req.query.search || '';
    const template = req.query.template || '';
    
    let query = 'SELECT * FROM notes WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ? OR transcript LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (template) {
      query += ' AND template = ?';
      params.push(template);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const notes = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const parsedNotes = notes.map(note => ({
      ...note,
      participants: JSON.parse(note.participants || '[]'),
      action_items: JSON.parse(note.action_items || '[]')
    }));
    
    res.json(parsedNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get single note
router.get('/:id', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({
      ...note,
      participants: JSON.parse(note.participants || '[]'),
      action_items: JSON.parse(note.action_items || '[]')
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create note
router.post('/', (req, res) => {
  try {
    const { title, content, template, participants } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO notes (id, title, content, template, participants, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title || 'Untitled Meeting', content || '', template || 'general', 
           JSON.stringify(participants || []), now, now);
    
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    
    res.status(201).json({
      ...note,
      participants: JSON.parse(note.participants || '[]'),
      action_items: []
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', (req, res) => {
  try {
    const { title, content, transcript, template, participants, summary, action_items, shared_link, is_recording } = req.body;
    const now = new Date().toISOString();
    
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    db.prepare(`
      UPDATE notes SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        transcript = COALESCE(?, transcript),
        template = COALESCE(?, template),
        participants = COALESCE(?, participants),
        summary = COALESCE(?, summary),
        action_items = COALESCE(?, action_items),
        shared_link = COALESCE(?, shared_link),
        is_recording = COALESCE(?, is_recording),
        updated_at = ?
      WHERE id = ?
    `).run(
      title, content, transcript, template,
      participants ? JSON.stringify(participants) : null,
      summary, action_items ? JSON.stringify(action_items) : null,
      shared_link, is_recording,
      now, req.params.id
    );
    
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
    
    res.json({
      ...note,
      participants: JSON.parse(note.participants || '[]'),
      action_items: JSON.parse(note.action_items || '[]')
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Generate share link
router.post('/:id/share', (req, res) => {
  try {
    const { generate } = req.body;
    
    if (generate) {
      const shareLink = `mm_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
      db.prepare('UPDATE notes SET shared_link = ? WHERE id = ?').run(shareLink, req.params.id);
      res.json({ share_link: shareLink });
    } else {
      db.prepare('UPDATE notes SET shared_link = NULL WHERE id = ?').run(req.params.id);
      res.json({ share_link: null });
    }
  } catch (error) {
    console.error('Error sharing note:', error);
    res.status(500).json({ error: 'Failed to share note' });
  }
});

// Get shared note
router.get('/shared/:shareLink', (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE shared_link = ?').get(req.params.shareLink);
    
    if (!note) {
      return res.status(404).json({ error: 'Shared note not found' });
    }
    
    res.json({
      ...note,
      participants: JSON.parse(note.participants || '[]'),
      action_items: JSON.parse(note.action_items || '[]')
    });
  } catch (error) {
    console.error('Error fetching shared note:', error);
    res.status(500).json({ error: 'Failed to fetch shared note' });
  }
});

module.exports = router;
