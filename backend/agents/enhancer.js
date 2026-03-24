/**
 * Enhancer Agent - Sub-agent for AI-powered note enhancement
 * Generates summaries, extracts action items, creates follow-ups
 */

const minimax = require('../services/minimax');

class EnhancerAgent {
  constructor(note) {
    this.note = note;
    this.transcript = note.transcript || note.content || '';
  }
  
  async generateSummary() {
    if (!this.transcript) {
      return { success: false, error: 'No content to summarize' };
    }
    
    try {
      const summary = await minimax.textCompletion(
        `Analyze this meeting transcript and provide a comprehensive summary including:\n1. Main topics discussed\n2. Key decisions made\n3. Important conclusions\n\nTranscript:\n${this.transcript}`,
        'You are a meeting assistant. Create clear, concise summaries that capture the essence of discussions.'
      );
      
      return { success: true, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async extractActionItems() {
    if (!this.transcript) {
      return { success: false, error: 'No content to analyze' };
    }
    
    try {
      const actionItemsText = await minimax.textCompletion(
        `Extract all action items from this meeting transcript. For each action item provide:\n- Task description\n- Assignee (if mentioned)\n- Due date (if mentioned)\n\nReturn as a structured list.\n\nTranscript:\n${this.transcript}`,
        'You are a meeting assistant. Be thorough in identifying action items and include all details mentioned.'
      );
      
      // Parse into structured format
      const actionItems = this.parseActionItems(actionItemsText);
      
      return { success: true, actionItems };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  parseActionItems(text) {
    // Simple parsing - in production could use more sophisticated parsing
    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Look for lines that might be action items
      if (line.match(/^[-•*]|\d+\.|- \[ \]|- \[x\]/)) {
        const cleaned = line.replace(/^[-•*]\s*|\d+\.\s*|- \[[ x]\]\s*/g, '').trim();
        if (cleaned) {
          items.push({
            task: cleaned,
            assignee: this.extractAssignee(cleaned),
            completed: false
          });
        }
      }
    }
    
    return items;
  }
  
  extractAssignee(text) {
    // Simple heuristics for finding assignees
    const patterns = [
      /@(w+)/,
      /(?:assigned to|by|to):\s*(\w+)/i,
      /(\w+)\s+will/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  }
  
  async generateFollowUp() {
    if (!this.transcript) {
      return { success: false, error: 'No content for follow-up' };
    }
    
    try {
      const followUp = await minimax.textCompletion(
        `Write a professional follow-up email based on this meeting. Include:\n1. Meeting summary\n2. Key decisions\n3. Action items with owners\n4. Next steps\n\nMake it concise and actionable.\n\nTranscript:\n${this.transcript}`,
        'You are a professional meeting assistant. Write clear, actionable follow-up emails.'
      );
      
      return { success: true, followUp };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async answerQuestion(question) {
    if (!this.transcript) {
      return { success: false, error: 'No content to search' };
    }
    
    try {
      const answer = await minimax.textCompletion(
        `Based on this meeting transcript, answer the following question:\n\nQuestion: ${question}\n\nIf the answer is not in the transcript, say so.\n\nTranscript:\n${this.transcript}`,
        'You are a meeting assistant. Answer questions based only on the provided transcript.'
      );
      
      return { success: true, answer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async enhanceAll() {
    const results = {
      summary: null,
      actionItems: null,
      followUp: null
    };
    
    // Run all enhancements in parallel-ish manner
    const [summaryResult, actionResult, followUpResult] = await Promise.all([
      this.generateSummary(),
      this.extractActionItems(),
      this.generateFollowUp()
    ]);
    
    results.summary = summaryResult;
    results.actionItems = actionResult;
    results.followUp = followUpResult;
    
    return results;
  }
}

// Run as standalone if called directly
if (require.main === module) {
  const noteId = process.argv[2];
  const action = process.argv[3] || 'all';
  
  if (!noteId) {
    console.error('Usage: node enhancer.js <note_id> [action|summary|actions|followup|all]');
    process.exit(1);
  }
  
  const db = require('../db');
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);
  
  if (!note) {
    console.error(`Note not found: ${noteId}`);
    process.exit(1);
  }
  
  const agent = new EnhancerAgent(note);
  
  let result;
  
  switch (action) {
    case 'summary':
      result = await agent.generateSummary();
      break;
    case 'actions':
    case 'action_items':
      result = await agent.extractActionItems();
      break;
    case 'followup':
      result = await agent.generateFollowUp();
      break;
    default:
      result = await agent.enhanceAll();
  }
  
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

module.exports = { EnhancerAgent };
