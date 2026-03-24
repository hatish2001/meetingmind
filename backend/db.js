const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'meetingmind.db');
const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    transcript TEXT DEFAULT '',
    template TEXT DEFAULT 'general',
    participants TEXT DEFAULT '[]',
    summary TEXT DEFAULT '',
    action_items TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    shared_link TEXT,
    is_recording INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    structure TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    content TEXT NOT NULL,
    assignee TEXT DEFAULT '',
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    format TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );
`);

// Insert default templates if not exist
const defaultTemplates = [
  {
    id: 'general',
    name: 'General Meeting',
    description: 'Generic meeting notes template',
    structure: JSON.stringify(['Agenda', 'Discussion', 'Decisions', 'Action Items'])
  },
  {
    id: 'customer-discovery',
    name: 'Customer Discovery',
    description: 'For customer discovery calls',
    structure: JSON.stringify(['Background', 'Pain Points', 'Current Solutions', 'Budget & Timeline', 'Next Steps'])
  },
  {
    id: 'user-interview',
    name: 'User Interview',
    description: 'For user research interviews',
    structure: JSON.stringify(['Introduction', 'Background Questions', 'Usage Patterns', 'Pain Points', 'Feature Requests', 'Closing'])
  },
  {
    id: 'one-on-one',
    name: '1-on-1 Meeting',
    description: 'For individual meetings',
    structure: JSON.stringify(['Updates', 'Challenges', 'Feedback', 'Goals', 'Action Items'])
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming Session',
    description: 'For creative brainstorming',
    structure: JSON.stringify(['Topic', 'Ideas', 'Discussion', 'Prioritization', 'Next Steps'])
  },
  {
    id: 'standup',
    name: 'Daily Standup',
    description: 'For daily standup meetings',
    structure: JSON.stringify(['Yesterday', 'Today', 'Blockers'])
  }
];

const insertTemplate = db.prepare(`
  INSERT OR IGNORE INTO templates (id, name, description, structure)
  VALUES (@id, @name, @description, @structure)
`);

for (const template of defaultTemplates) {
  insertTemplate.run(template);
}

module.exports = db;
