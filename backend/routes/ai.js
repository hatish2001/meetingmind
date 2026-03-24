const express = require('express');
const router = express.Router();
const db = require('../db');
const minimax = require('../services/minimax');

// AI enhancement endpoints
router.post('/enhance/:noteId', async (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const { type } = req.body; // 'summary', 'action_items', 'followup', 'all'
    
    const transcript = note.transcript || note.content;
    
    if (!transcript) {
      return res.status(400).json({ error: 'No content to enhance' });
    }
    
    let result = {};
    
    // Generate summary
    if (type === 'summary' || type === 'all') {
      result.summary = await minimax.textCompletion(
        `Analyze this meeting transcript and provide a concise summary (2-3 sentences):\n\n${transcript}`,
        'You are a meeting assistant that summarizes conversations clearly and concisely.'
      );
    }
    
    // Extract action items
    if (type === 'action_items' || type === 'all') {
      const actionItemsText = await minimax.textCompletion(
        `Extract all action items from this meeting transcript. Return as a JSON array with fields: task, assignee, due_date.\n\n${transcript}`,
        'You are a meeting assistant that extracts action items. Return ONLY valid JSON array.'
      );
      
      try {
        // Try to parse as JSON
        let parsed = JSON.parse(actionItemsText);
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        result.action_items = Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not valid JSON, parse as text
        result.action_items = actionItemsText.split('\n').filter(line => line.trim());
      }
      
      // Update database
      db.prepare('UPDATE notes SET action_items = ?, summary = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(result.action_items), result.summary || note.summary, 
             new Date().toISOString(), req.params.noteId);
    }
    
    // Generate follow-up email
    if (type === 'followup') {
      result.followup = await minimax.textCompletion(
        `Write a follow-up email based on this meeting transcript. Include key decisions and action items:\n\n${transcript}`,
        'You are a professional meeting assistant that writes concise follow-up emails.'
      );
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('AI enhancement error:', error);
    res.status(500).json({ error: 'AI enhancement failed: ' + error.message });
  }
});

// Ask questions about a meeting
router.post('/ask/:noteId', async (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const transcript = note.transcript || note.content;
    
    const answer = await minimax.textCompletion(
      `Based on this meeting transcript, answer the following question:\n\nQuestion: ${question}\n\nTranscript:\n${transcript}`,
      'You are a meeting assistant that answers questions about meeting content. Be helpful and specific.'
    );
    
    res.json({ answer });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({ error: 'Failed to answer question: ' + error.message });
  }
});

// Generate content (blog post, CRM update, etc.)
router.post('/generate/:noteId', async (req, res) => {
  try {
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.noteId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    const { format, audience } = req.body;
    const transcript = note.transcript || note.content;
    
    const prompts = {
      blog_post: `Write a blog post summarizing this meeting for readers who want to learn about the key outcomes:\n\n${transcript}`,
      crm_update: `Write a CRM update summarizing this meeting. Include: key points discussed, decisions made, and next steps:\n\n${transcript}`,
      linkedin_post: `Write a LinkedIn post about this meeting. Make it engaging and professional:\n\n${transcript}`,
      meeting_review: `Create a structured meeting review with sections: Attendees, Agenda Covered, Key Decisions, Action Items, and Follow-up:\n\n${transcript}`,
      tweet_thread: `Summarize this meeting as a Twitter/X thread (5-7 tweets):\n\n${transcript}`
    };
    
    const prompt = prompts[format] || prompts.meeting_review;
    const systemPrompt = audience === 'technical' 
      ? 'You are a technical writer providing detailed analysis.'
      : 'You are a professional writer creating clear, engaging content.';
    
    const content = await minimax.textCompletion(prompt, systemPrompt);
    
    res.json({ success: true, content, format });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ error: 'Failed to generate content: ' + error.message });
  }
});

// List templates
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM templates ORDER BY name').all();
    const parsed = templates.map(t => ({
      ...t,
      structure: JSON.parse(t.structure || '[]')
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create custom template
router.post('/templates', (req, res) => {
  try {
    const { name, description, structure } = req.body;
    const id = `custom_${Date.now()}`;
    
    db.prepare(`
      INSERT INTO templates (id, name, description, structure)
      VALUES (?, ?, ?, ?)
    `).run(id, name, description || '', JSON.stringify(structure || []));
    
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    
    res.status(201).json({
      ...template,
      structure: JSON.parse(template.structure || '[]')
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

module.exports = router;
