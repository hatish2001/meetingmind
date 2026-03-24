// MeetingMind API Client

const API_BASE = '/api';

class MeetingMindAPI {
  // Notes CRUD
  async getNotes(search = '', template = '') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (template) params.set('template', template);
    const query = params.toString();
    const res = await fetch(`${API_BASE}/notes${query ? '?' + query : ''}`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  }

  async getNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch note');
    return res.json();
  }

  async createNote(data) {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create note');
    return res.json();
  }

  async updateNote(id, data) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  }

  async deleteNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  }

  // Sharing
  async shareNote(id, generate = true) {
    const res = await fetch(`${API_BASE}/notes/${id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generate })
    });
    if (!res.ok) throw new Error('Failed to share note');
    return res.json();
  }

  async getSharedNote(shareLink) {
    const res = await fetch(`${API_BASE}/notes/shared/${shareLink}`);
    if (!res.ok) throw new Error('Shared note not found');
    return res.json();
  }

  // Transcription
  async uploadAudio(audioBlob, noteId = null) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (noteId) formData.append('note_id', noteId);
    
    const res = await fetch(`${API_BASE}/transcription/transcribe`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  }

  // AI Enhancement
  async enhanceNote(id, type = 'all') {
    const res = await fetch(`${API_BASE}/ai/enhance/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    if (!res.ok) throw new Error('Enhancement failed');
    return res.json();
  }

  async askQuestion(id, question) {
    const res = await fetch(`${API_BASE}/ai/ask/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) throw new Error('Failed to answer question');
    return res.json();
  }

  async generateContent(id, format, audience = '') {
    const res = await fetch(`${API_BASE}/ai/generate/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, audience })
    });
    if (!res.ok) throw new Error('Failed to generate content');
    return res.json();
  }

  // Templates
  async getTemplates() {
    const res = await fetch(`${API_BASE}/ai/templates`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  }

  async createTemplate(data) {
    const res = await fetch(`${API_BASE}/ai/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create template');
    return res.json();
  }

  // Health check
  async healthCheck() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }
}

// Export singleton
window.api = new MeetingMindAPI();
