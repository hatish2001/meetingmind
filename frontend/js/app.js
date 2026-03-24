// MeetingMind Main Application

class MeetingMindApp {
  constructor() {
    this.currentNote = null;
    this.notes = [];
    this.templates = [];
    this.recorder = null;
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    
    this.init();
  }

  async init() {
    // Apply theme
    this.applyTheme();
    
    // Load templates
    await this.loadTemplates();
    
    // Route handling
    this.handleRoute();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Listen for route changes
    window.addEventListener('popstate', () => this.handleRoute());
    
    console.log('MeetingMind initialized');
  }

  applyTheme() {
    if (this.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  async loadTemplates() {
    try {
      this.templates = await window.api.getTemplates();
    } catch (err) {
      console.error('Failed to load templates:', err);
      this.templates = [];
    }
  }

  handleRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path === '/meeting' || hash === '#meeting') {
      this.showMeetingView();
    } else if (path.startsWith('/note/') || hash.startsWith('#note/')) {
      const noteId = path.split('/').pop() || hash.split('#note/').pop();
      this.showNoteEditor(noteId);
    } else {
      this.showNotesList();
    }
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        this.createNewNote();
      }
    });

    // Recording timer updates
    window.addEventListener('recording-timer', (e) => {
      const timerEl = document.getElementById('recording-timer');
      if (timerEl) timerEl.textContent = e.detail.time;
    });
  }

  async showNotesList() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
      this.notes = await window.api.getNotes();
    } catch (err) {
      console.error('Failed to load notes:', err);
      this.notes = [];
    }

    mainContent.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Meeting Notes</h1>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" onclick="app.showTemplatesModal()">
            <span>📋</span> Templates
          </button>
          <button class="btn btn-primary" onclick="app.createNewNote()">
            <span>+</span> New Meeting
          </button>
        </div>
      </div>
      <div class="page-content">
        ${this.notes.length === 0 ? this.renderEmptyState() : this.renderNotesGrid()}
      </div>
    `;

    this.renderSidebarNotes();
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3 class="empty-title">No meetings yet</h3>
        <p class="empty-text">Create your first meeting note or start a recording</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-secondary" onclick="app.showTemplatesModal()">
            Browse Templates
          </button>
          <button class="btn btn-primary" onclick="app.createNewNote()">
            Create Meeting
          </button>
        </div>
      </div>
    `;
  }

  renderNotesGrid() {
    return `
      <div class="notes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${this.notes.map(note => this.renderNoteCard(note)).join('')}
      </div>
    `;
  }

  renderNoteCard(note) {
    const date = new Date(note.updated_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const preview = (note.transcript || note.content || 'No content yet').substring(0, 100);
    const participants = Array.isArray(note.participants) ? note.participants : [];
    
    return `
      <div class="card note-card" onclick="app.openNote('${note.id}')">
        <div class="card-header">
          <div class="template-badge" style="font-size: 0.8rem; color: var(--text-tertiary);">
            ${note.template || 'General'}
          </div>
          <div class="dropdown">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); this.parentElement.classList.toggle('active')">
              ⋮
            </button>
            <div class="dropdown-menu">
              <div class="dropdown-item" onclick="event.stopPropagation(); app.shareNote('${note.id}')">
                🔗 Share
              </div>
              <div class="dropdown-item" onclick="event.stopPropagation(); app.exportNote('${note.id}')">
                📤 Export
              </div>
              <div class="dropdown-item danger" onclick="event.stopPropagation(); app.deleteNote('${note.id}')">
                🗑️ Delete
              </div>
            </div>
          </div>
        </div>
        <h3 class="note-title">${note.title || 'Untitled Meeting'}</h3>
        <div class="note-meta">${date} ${participants.length > 0 ? `• ${participants.length} participants` : ''}</div>
        <p class="note-preview">${preview}</p>
        ${note.summary ? `<div style="margin-top: 10px; font-size: 0.85rem; color: var(--accent-color);">✨ ${note.summary.substring(0, 60)}${note.summary.length > 60 ? '...' : ''}</div>` : ''}
      </div>
    `;
  }

  renderSidebarNotes() {
    const notesList = document.getElementById('notes-list');
    if (!notesList) return;

    notesList.innerHTML = this.notes.slice(0, 10).map(note => `
      <div class="note-card ${this.currentNote?.id === note.id ? 'active' : ''}" onclick="app.openNote('${note.id}')">
        <div class="note-title">${note.title || 'Untitled Meeting'}</div>
        <div class="note-meta">${new Date(note.updated_at).toLocaleDateString()}</div>
      </div>
    `).join('');
  }

  async createNewNote(template = 'general') {
    try {
      const note = await window.api.createNote({
        title: 'New Meeting',
        template: template
      });
      this.navigate(`/note/${note.id}`);
    } catch (err) {
      console.error('Failed to create note:', err);
      this.showToast('Failed to create note', 'error');
    }
  }

  async openNote(noteId) {
    this.navigate(`/note/${noteId}`);
  }

  async showNoteEditor(noteId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
      this.currentNote = await window.api.getNote(noteId);
    } catch (err) {
      console.error('Failed to load note:', err);
      mainContent.innerHTML = '<div class="page-content"><p>Failed to load note</p></div>';
      return;
    }

    const note = this.currentNote;
    const participants = Array.isArray(note.participants) ? note.participants : [];

    mainContent.innerHTML = `
      <div class="editor-container">
        <div class="editor-header">
          <input type="text" class="editor-title" value="${note.title || ''}" 
                 placeholder="Meeting Title" 
                 onchange="app.updateNoteTitle(this.value)">
          <div class="editor-meta">
            <span>📅 ${new Date(note.updated_at).toLocaleDateString()}</span>
            <span>📋 ${note.template || 'General'}</span>
            ${note.is_recording ? '<span class="recording-status"><span class="recording-indicator"></span> Recording</span>' : ''}
          </div>
        </div>

        <div class="participants-list" id="participants-list">
          ${participants.map(p => `
            <span class="participant-tag">
              👤 ${p}
              <button onclick="app.removeParticipant('${p}')">×</button>
            </span>
          `).join('')}
          <button class="btn btn-ghost btn-sm" onclick="app.showAddParticipant()">+ Add</button>
        </div>

        <div class="tabs">
          <button class="tab active" onclick="app.switchTab('notes', this)">Notes</button>
          <button class="tab" onclick="app.switchTab('transcript', this)">Transcript</button>
          <button class="tab" onclick="app.switchTab('summary', this)">Summary & Actions</button>
        </div>

        <div id="tab-content">
          <div class="editor-section">
            <div class="section-label">Meeting Notes</div>
            <div class="rich-editor" id="notes-editor" contenteditable="true" 
                 onblur="app.saveNoteContent(this.innerText)">${note.content || ''}</div>
          </div>
        </div>

        <div class="ai-panel">
          <h3 style="margin-bottom: 15px;">🤖 AI Actions</h3>
          <div class="ai-actions">
            <button class="btn btn-secondary" onclick="app.enhanceNote('summary')" id="btn-summary">
              ✨ Generate Summary
            </button>
            <button class="btn btn-secondary" onclick="app.enhanceNote('action_items')" id="btn-actions">
              📋 Extract Actions
            </button>
            <button class="btn btn-secondary" onclick="app.enhanceNote('all')" id="btn-enhance">
              🚀 Enhance All
            </button>
            <button class="btn btn-secondary" onclick="app.showAskQuestion()">
              ❓ Ask Questions
            </button>
          </div>
          <div id="ai-results"></div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="app.navigate('/meeting')">
            🎙️ Start Recording
          </button>
          <button class="btn btn-secondary" onclick="app.shareNote('${note.id}')">
            🔗 Share
          </button>
          <button class="btn btn-secondary" onclick="app.exportNote('${note.id}')">
            📤 Export
          </button>
        </div>
      </div>
    `;

    // Update sidebar
    this.renderSidebarNotes();
  }

  switchTab(tabName, btn) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const tabContent = document.getElementById('tab-content');
    const note = this.currentNote;

    if (tabName === 'notes') {
      tabContent.innerHTML = `
        <div class="editor-section">
          <div class="section-label">Meeting Notes</div>
          <div class="rich-editor" id="notes-editor" contenteditable="true" 
               onblur="app.saveNoteContent(this.innerText)">${note.content || ''}</div>
        </div>
      `;
    } else if (tabName === 'transcript') {
      tabContent.innerHTML = `
        <div class="editor-section">
          <div class="section-label">Transcript</div>
          <div class="rich-editor" style="background: var(--bg-primary);">
            ${note.transcript || 'No transcript available. Start a recording to capture the transcript.'}
          </div>
        </div>
      `;
    } else if (tabName === 'summary') {
      const actionItems = Array.isArray(note.action_items) ? note.action_items : [];
      tabContent.innerHTML = `
        <div class="editor-section">
          <div class="section-label">Summary</div>
          <div class="ai-summary" id="summary-section">
            ${note.summary || 'No summary yet. Click "Generate Summary" to create one.'}
          </div>
        </div>
        <div class="editor-section">
          <div class="section-label">Action Items</div>
          <div class="action-items-list" id="action-items-list">
            ${actionItems.length > 0 ? actionItems.map((item, i) => `
              <div class="action-item ${item.completed ? 'completed' : ''}">
                <input type="checkbox" class="action-checkbox" ${item.completed ? 'checked' : ''} 
                       onchange="app.toggleActionItem(${i}, this.checked)">
                <span class="action-text ${item.completed ? 'completed' : ''}">${item.task || item}</span>
                ${item.assignee ? `<span class="action-assignee">@${item.assignee}</span>` : ''}
              </div>
            `).join('') : '<p style="color: var(--text-tertiary);">No action items yet. Click "Extract Actions" to generate them.</p>'}
          </div>
        </div>
      `;
    }
  }

  async updateNoteTitle(title) {
    if (!this.currentNote) return;
    try {
      await window.api.updateNote(this.currentNote.id, { title });
      this.currentNote.title = title;
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  }

  async saveNoteContent(content) {
    if (!this.currentNote) return;
    try {
      await window.api.updateNote(this.currentNote.id, { content });
      this.currentNote.content = content;
    } catch (err) {
      console.error('Failed to save content:', err);
    }
  }

  async addParticipant(name) {
    if (!this.currentNote || !name.trim()) return;
    const participants = Array.isArray(this.currentNote.participants) 
      ? [...this.currentNote.participants, name.trim()]
      : [name.trim()];
    
    try {
      await window.api.updateNote(this.currentNote.id, { participants });
      this.currentNote.participants = participants;
      this.showNoteEditor(this.currentNote.id);
    } catch (err) {
      console.error('Failed to add participant:', err);
    }
  }

  async removeParticipant(name) {
    if (!this.currentNote) return;
    const participants = Array.isArray(this.currentNote.participants)
      ? this.currentNote.participants.filter(p => p !== name)
      : [];
    
    try {
      await window.api.updateNote(this.currentNote.id, { participants });
      this.currentNote.participants = participants;
      this.showNoteEditor(this.currentNote.id);
    } catch (err) {
      console.error('Failed to remove participant:', err);
    }
  }

  async enhanceNote(type) {
    if (!this.currentNote) return;

    const btn = document.getElementById(`btn-${type === 'action_items' ? 'actions' : type}`);
    const resultsDiv = document.getElementById('ai-results');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Processing...';
    }

    resultsDiv.innerHTML = '<div class="ai-loading"><span class="spinner"></span> AI is thinking...</div>';

    try {
      const result = await window.api.enhanceNote(this.currentNote.id, type);
      
      let output = '';
      if (result.summary) {
        output += `<div class="ai-summary">${result.summary}</div>`;
      }
      if (result.action_items) {
        const items = Array.isArray(result.action_items) ? result.action_items : [];
        output += `<div style="margin-top: 20px;">
          <strong>Action Items Found:</strong>
          <ul style="margin-top: 10px; padding-left: 20px;">
            ${items.map(item => `<li>${typeof item === 'object' ? item.task : item}</li>`).join('')}
          </ul>
        </div>`;
      }
      
      resultsDiv.innerHTML = output;
      
      // Refresh note data
      this.currentNote = await window.api.getNote(this.currentNote.id);
      
      // If we're on summary tab, refresh it
      if (document.querySelector('.tab.active')?.textContent === 'Summary & Actions') {
        this.switchTab('summary', document.querySelector('.tab:last-child'));
      }
    } catch (err) {
      resultsDiv.innerHTML = `<div style="color: var(--danger-color);">Error: ${err.message}</div>`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = type === 'summary' ? '✨ Generate Summary' 
          : type === 'action_items' ? '📋 Extract Actions' 
          : '🚀 Enhance All';
      }
    }
  }

  async shareNote(noteId) {
    try {
      const result = await window.api.shareNote(noteId, true);
      const shareUrl = `${window.location.origin}/shared/${result.share_link}`;
      
      this.showModal('Share Note', `
        <p>Your note is now shareable at:</p>
        <div class="share-link-container">
          <input type="text" class="share-link-input" value="${shareUrl}" readonly>
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${shareUrl}'); app.showToast('Copied!')">Copy</button>
        </div>
      `);
    } catch (err) {
      this.showToast('Failed to share note', 'error');
    }
  }

  async exportNote(noteId) {
    this.showModal('Export Note', `
      <p>Choose export format:</p>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
        <button class="btn btn-secondary" onclick="app.downloadExport('${noteId}', 'markdown')">📝 Markdown</button>
        <button class="btn btn-secondary" onclick="app.downloadExport('${noteId}', 'html')">🌐 HTML</button>
        <button class="btn btn-secondary" onclick="app.downloadExport('${noteId}', 'json')">📋 JSON</button>
        <button class="btn btn-secondary" onclick="app.downloadExport('${noteId}', 'text')">📄 Plain Text</button>
      </div>
    `);
  }

  async downloadExport(noteId, format) {
    try {
      const note = await window.api.getNote(noteId);
      let content, filename, mimeType;

      const participants = Array.isArray(note.participants) ? note.participants : [];
      const actionItems = Array.isArray(note.action_items) ? note.action_items : [];

      if (format === 'markdown') {
        content = `# ${note.title}\n\n**Date:** ${new Date(note.updated_at).toLocaleDateString()}\n`;
        if (participants.length) content += `**Participants:** ${participants.join(', ')}\n`;
        content += `\n---\n\n## Summary\n${note.summary || 'N/A'}\n\n## Notes\n${note.content || note.transcript || 'No content'}\n`;
        if (actionItems.length) {
          content += `\n## Action Items\n`;
          actionItems.forEach(item => {
            const task = typeof item === 'object' ? item.task : item;
            content += `- [ ] ${task}\n`;
          });
        }
        filename = `${note.title || 'note'}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'html') {
        content = `<!DOCTYPE html><html><head><title>${note.title}</title></head><body><h1>${note.title}</h1></body></html>`;
        filename = `${note.title || 'note'}.html`;
        mimeType = 'text/html';
      } else if (format === 'json') {
        content = JSON.stringify(note, null, 2);
        filename = `${note.title || 'note'}.json`;
        mimeType = 'application/json';
      } else {
        content = `${note.title}\n${'='.repeat(50)}\n\n${note.content || note.transcript || 'No content'}`;
        filename = `${note.title || 'note'}.txt`;
        mimeType = 'text/plain';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.closeModal();
      this.showToast('Downloaded!', 'success');
    } catch (err) {
      this.showToast('Export failed', 'error');
    }
  }

  async deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await window.api.deleteNote(noteId);
      this.showToast('Note deleted', 'success');
      this.navigate('/');
    } catch (err) {
      this.showToast('Failed to delete note', 'error');
    }
  }

  showMeetingView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <div class="recording-container">
        <div class="card recording-card">
          <h1 style="font-size: 2rem; margin-bottom: 10px;">🎙️ Meeting Recorder</h1>
          <p style="color: var(--text-secondary);">Click to start recording your meeting</p>
          
          <div class="recording-timer" id="recording-timer">00:00:00</div>
          
          <div class="recording-status" id="recording-status" style="display: none;">
            <span class="recording-indicator"></span>
            <span>Recording in progress</span>
          </div>
          
          <div class="recording-controls" id="recording-controls">
            <button class="record-btn start" id="record-btn" onclick="app.toggleRecording()">
              🎤
            </button>
          </div>
          
          <div class="transcript-preview" id="transcript-preview" style="display: none;">
            <div class="section-label">Live Transcript</div>
            <div id="transcript-text"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 20px;">
          <h3 style="margin-bottom: 15px;">Quick Actions</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <button class="btn btn-secondary" onclick="app.createNewNote()">
              📝 New Meeting Note
            </button>
            <button class="btn btn-secondary" onclick="app.navigate('/')">
              📋 View All Notes
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize recorder
    this.recorder = new AudioRecorder({
      onTranscriptUpdate: (data) => {
        const transcriptText = document.getElementById('transcript-text');
        if (transcriptText) {
          if (data.status === 'processing') {
            transcriptText.innerHTML = `<em>${data.text}</em>`;
          } else if (data.status === 'complete') {
            transcriptText.textContent = data.text;
          }
        }
      },
      onError: (err) => {
        console.error('Recorder error:', err);
        this.showToast(err, 'error');
      }
    });
  }

  async toggleRecording() {
    const recordBtn = document.getElementById('record-btn');
    const recordingStatus = document.getElementById('recording-status');
    const transcriptPreview = document.getElementById('transcript-preview');
    const controls = document.getElementById('recording-controls');

    if (!this.recorder || this.recorder.isRecording) {
      // Stop recording
      this.recorder.stop();
      recordBtn.textContent = '🎤';
      recordBtn.classList.remove('stop');
      recordBtn.classList.add('start');
      recordingStatus.style.display = 'none';
      recordBtn.innerHTML = '🎤';
    } else {
      // Start recording
      // First create a note if we don't have one
      let noteId = this.currentNote?.id;
      if (!noteId) {
        const note = await window.api.createNote({
          title: `Meeting ${new Date().toLocaleDateString()}`,
          is_recording: 1
        });
        noteId = note.id;
        this.currentNote = note;
      }

      const started = await this.recorder.start(noteId);
      if (started) {
        recordBtn.innerHTML = '⏹️';
        recordBtn.classList.remove('start');
        recordBtn.classList.add('stop');
        recordingStatus.style.display = 'flex';
        transcriptPreview.style.display = 'block';
        
        // Update note as recording
        await window.api.updateNote(noteId, { is_recording: 1 });
      }
    }
  }

  async searchNotes(query) {
    if (!query.trim()) {
      await this.showNotesList();
      return;
    }

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    try {
      this.notes = await window.api.getNotes(query);
      mainContent.querySelector('.page-content').innerHTML = 
        this.notes.length === 0 
          ? '<div class="empty-state"><p>No notes found</p></div>'
          : this.renderNotesGrid();
    } catch (err) {
      console.error('Search failed:', err);
    }
  }

  showTemplatesModal() {
    const templateIcons = {
      'general': '📋',
      'customer-discovery': '🔍',
      'user-interview': '👤',
      'one-on-one': '💬',
      'brainstorm': '💡',
      'standup': '☀️'
    };

    this.showModal('Choose a Template', `
      <div class="templates-grid">
        ${this.templates.map(t => `
          <div class="template-card" onclick="app.createNewNote('${t.id}'); app.closeModal();">
            <div class="template-icon">${templateIcons[t.id] || '📄'}</div>
            <div class="template-name">${t.name}</div>
            <div class="template-desc">${t.description || 'No description'}</div>
          </div>
        `).join('')}
      </div>
    `);
  }

  showAddParticipant() {
    const name = prompt('Enter participant name:');
    if (name) {
      this.addParticipant(name);
    }
  }

  showAskQuestion() {
    this.showModal('Ask About This Meeting', `
      <p>Ask anything about this meeting:</p>
      <input type="text" class="form-input" id="question-input" 
             placeholder="e.g., What decisions were made?" 
             style="margin-top: 15px;">
    `, () => {
      const question = document.getElementById('question-input')?.value;
      if (question) {
        this.askQuestion(question);
      }
    });
  }

  async askQuestion(question) {
    if (!this.currentNote) return;

    const resultsDiv = document.getElementById('ai-results');
    resultsDiv.innerHTML = '<div class="ai-loading"><span class="spinner"></span> Thinking...</div>';
    this.closeModal();

    try {
      const result = await window.api.askQuestion(this.currentNote.id, question);
      resultsDiv.innerHTML = `
        <div style="margin-top: 20px; padding: 20px; background: var(--bg-secondary); border-radius: var(--radius-md);">
          <strong>Q:</strong> ${question}<br><br>
          <strong>A:</strong> ${result.answer}
        </div>
      `;
    } catch (err) {
      resultsDiv.innerHTML = `<div style="color: var(--danger-color);">Error: ${err.message}</div>`;
    }
  }

  async toggleActionItem(index, completed) {
    if (!this.currentNote) return;
    const actionItems = Array.isArray(this.currentNote.action_items) 
      ? [...this.currentNote.action_items] 
      : [];
    
    if (actionItems[index]) {
      if (typeof actionItems[index] === 'object') {
        actionItems[index].completed = completed;
      } else {
        actionItems[index] = { task: actionItems[index], completed };
      }
      
      try {
        await window.api.updateNote(this.currentNote.id, { action_items: actionItems });
        this.currentNote.action_items = actionItems;
      } catch (err) {
        console.error('Failed to update action item:', err);
      }
    }
  }

  showModal(title, content, onConfirm = null) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="app.closeModal()">×</button>
        </div>
        <div class="modal-body">${content}</div>
        ${onConfirm ? `<div class="modal-footer">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="app.confirmModal()">Confirm</button>
        </div>` : ''}
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Store confirm handler
    if (onConfirm) {
      window._modalConfirm = onConfirm;
    }
    
    // Animate in
    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  confirmModal() {
    if (window._modalConfirm) {
      window._modalConfirm();
    }
    this.closeModal();
  }

  closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
    window._modalConfirm = null;
  }

  showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || (() => {
      const div = document.createElement('div');
      div.className = 'toast-container';
      document.body.appendChild(div);
      return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new MeetingMindApp();
  window.app = app;
});
