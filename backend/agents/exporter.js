/**
 * Exporter Agent - Sub-agent for exporting notes to various formats
 * Supports: Markdown, HTML, PDF (via print), JSON, plain text
 */

class ExporterAgent {
  constructor(note) {
    this.note = note;
    this.participants = typeof note.participants === 'string' 
      ? JSON.parse(note.participants) 
      : (note.participants || []);
    this.actionItems = typeof note.action_items === 'string' 
      ? JSON.parse(note.action_items) 
      : (note.action_items || []);
  }
  
  toMarkdown() {
    const date = new Date(this.note.updated_at || this.note.created_at).toLocaleDateString();
    
    let md = `# ${this.note.title || 'Untitled Meeting'}\n\n`;
    md += `**Date:** ${date}\n`;
    
    if (this.participants.length > 0) {
      md += `**Participants:** ${this.participants.join(', ')}\n`;
    }
    
    md += `\n---\n\n`;
    
    if (this.note.summary) {
      md += `## Summary\n\n${this.note.summary}\n\n---\n\n`;
    }
    
    md += `## Transcript\n\n${this.note.transcript || this.note.content || 'No transcript available.'}\n`;
    
    if (this.actionItems.length > 0) {
      md += `\n---\n\n## Action Items\n\n`;
      for (const item of this.actionItems) {
        const checkbox = item.completed ? '[x]' : '[ ]';
        const assignee = item.assignee ? ` (@${item.assignee})` : '';
        const due = item.due_date ? ` - Due: ${item.due_date}` : '';
        md += `- ${checkbox} ${item.task}${assignee}${due}\n`;
      }
    }
    
    return md;
  }
  
  toHTML() {
    const date = new Date(this.note.updated_at || this.note.created_at).toLocaleDateString();
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.note.title || 'Meeting Notes'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { color: #333; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .section { margin: 30px 0; }
    .action-item { padding: 8px 0; }
    .action-item.completed { text-decoration: line-through; color: #999; }
  </style>
</head>
<body>
  <h1>${this.note.title || 'Untitled Meeting'}</h1>
  <div class="meta">
    <div><strong>Date:</strong> ${date}</div>`;
    
    if (this.participants.length > 0) {
      html += `\n    <div><strong>Participants:</strong> ${this.participants.join(', ')}</div>`;
    }
    
    html += `\n  </div>
  <hr>
  <div class="section">`;
    
    if (this.note.summary) {
      html += `\n    <h2>Summary</h2>
    <p>${this.note.summary}</p>`;
    }
    
    html += `\n  </div>
  <div class="section">
    <h2>Notes</h2>
    <p>${(this.note.transcript || this.note.content || 'No notes available.').replace(/\n/g, '<br>')}</p>
  </div>`;
    
    if (this.actionItems.length > 0) {
      html += `\n  <div class="section">
    <h2>Action Items</h2>`;
      
      for (const item of this.actionItems) {
        const cls = item.completed ? 'completed' : '';
        html += `\n    <div class="action-item ${cls}">
      ${item.completed ? '☑' : '☐'} ${item.task}`;
        if (item.assignee) html += ` <em>(@${item.assignee})</em>`;
        if (item.due_date) html += ` - Due: ${item.due_date}`;
        html += `\n    </div>`;
      }
      
      html += `\n  </div>`;
    }
    
    html += `\n</body>
</html>`;
    
    return html;
  }
  
  toJSON() {
    return JSON.stringify({
      id: this.note.id,
      title: this.note.title,
      date: this.note.updated_at || this.note.created_at,
      participants: this.participants,
      summary: this.note.summary,
      transcript: this.note.transcript || this.note.content,
      actionItems: this.actionItems,
      template: this.note.template,
      sharedLink: this.note.shared_link
    }, null, 2);
  }
  
  toPlainText() {
    const date = new Date(this.note.updated_at || this.note.created_at).toLocaleDateString();
    
    let text = `${this.note.title || 'UNTITLED MEETING'}\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Date: ${date}\n`;
    
    if (this.participants.length > 0) {
      text += `Participants: ${this.participants.join(', ')}\n`;
    }
    
    text += `\n`;
    
    if (this.note.summary) {
      text += `SUMMARY\n${'-'.repeat(50)}\n${this.note.summary}\n\n`;
    }
    
    text += `NOTES\n${'-'.repeat(50)}\n${this.note.transcript || this.note.content || 'No notes available.'}\n`;
    
    if (this.actionItems.length > 0) {
      text += `\nACTION ITEMS\n${'-'.repeat(50)}\n`;
      for (const item of this.actionItems) {
        const check = item.completed ? '[X]' : '[ ]';
        text += `${check} ${item.task}`;
        if (item.assignee) text += ` (${item.assignee})`;
        if (item.due_date) text += ` - Due: ${item.due_date}`;
        text += `\n`;
      }
    }
    
    return text;
  }
  
  toNotionMock() {
    // Mock Notion format (in production, would use Notion API)
    return {
      title: this.note.title,
      blocks: [
        { type: 'heading_1', text: this.note.title },
        { type: 'paragraph', text: `Date: ${new Date(this.note.updated_at).toLocaleDateString()}` },
        { type: 'divider' },
        { type: 'heading_2', text: 'Summary' },
        { type: 'paragraph', text: this.note.summary || 'No summary available.' },
        { type: 'heading_2', text: 'Notes' },
        { type: 'paragraph', text: this.note.transcript || this.note.content || 'No notes available.' },
        ...(this.actionItems.length > 0 ? [
          { type: 'heading_2', text: 'Action Items' },
          ...this.actionItems.map(item => ({
            type: 'bulleted_list_item',
            text: `${item.task}${item.assignee ? ` (Assigned: ${item.assignee})` : ''}${item.due_date ? ` - Due: ${item.due_date}` : ''}`
          }))
        ] : [])
      ]
    };
  }
  
  toSlackMock() {
    // Mock Slack format
    let slack = `*${this.note.title || 'Untitled Meeting'}*\n`;
    slack += `_${new Date(this.note.updated_at).toLocaleDateString()}_\n\n`;
    
    if (this.note.summary) {
      slack += `*Summary:*\n${this.note.summary}\n\n`;
    }
    
    if (this.actionItems.length > 0) {
      slack += `*Action Items:*\n`;
      for (const item of this.actionItems) {
        slack += `• ${item.task}`;
        if (item.assignee) slack += ` (${item.assignee})`;
        if (item.due_date) slack += ` - Due: ${item.due_date}`;
        slack += `\n`;
      }
    }
    
    return slack;
  }
}

// Run as standalone if called directly
if (require.main === module) {
  const noteId = process.argv[2];
  const format = process.argv[3] || 'markdown';
  
  if (!noteId) {
    console.error('Usage: node exporter.js <note_id> [markdown|html|json|text|notion|slack]');
    process.exit(1);
  }
  
  const db = require('../db');
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
  
  if (!note) {
    console.error(`Note not found: ${noteId}`);
    process.exit(1);
  }
  
  const agent = new ExporterAgent(note);
  let output;
  
  switch (format) {
    case 'html':
      output = agent.toHTML();
      break;
    case 'json':
      output = agent.toJSON();
      break;
    case 'text':
      output = agent.toPlainText();
      break;
    case 'notion':
      output = JSON.stringify(agent.toNotionMock(), null, 2);
      break;
    case 'slack':
      output = agent.toSlackMock();
      break;
    default:
      output = agent.toMarkdown();
  }
  
  console.log(output);
  process.exit(0);
}

module.exports = { ExporterAgent };
