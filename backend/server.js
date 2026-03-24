require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize database (this creates tables if not exist)
require('./db');

// Import routes
const notesRouter = require('./routes/notes');
const transcriptionRouter = require('./routes/transcription');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/notes', notesRouter);
app.use('/api/transcription', transcriptionRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    minimaxConfigured: !!process.env.MINIMAX_API_KEY
  });
});

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ███╗██╗███████╗███████╗██╗ ██████╗ ███╗   ██╗         ║
║   ████╗ ████║██║██╔════╝██╔════╝██║██╔═══██╗████╗  ██║         ║
║   ██╔████╔██║██║███████╗███████╗██║██║   ██║██╔██╗ ██║         ║
║   ██║╚██╔╝██║██║╚════██║╚════██║██║██║   ██║██║╚██╗██║         ║
║   ██║ ╚═╝ ██║██║███████║███████║██║╚██████╔╝██║ ╚████║         ║
║   ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝         ║
║                                                               ║
║   Your AI Meeting Assistant                                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Server running at: http://localhost:${PORT}

📋 API Endpoints:
   • GET  /api/health          - Health check
   • GET  /api/notes           - List all notes
   • POST /api/notes           - Create note
   • GET  /api/notes/:id       - Get note
   • PUT  /api/notes/:id       - Update note
   • DELETE /api/notes/:id    - Delete note
   • POST /api/notes/:id/share - Generate share link
   
🎙️ Transcription:
   • POST /api/transcription/upload - Upload audio
   • POST /api/transcription/transcribe - Transcribe audio
   
🤖 AI Enhancement:
   • POST /api/ai/enhance/:noteId - Enhance notes
   • POST /api/ai/ask/:noteId     - Ask questions
   • POST /api/ai/generate/:noteId - Generate content
   • GET  /api/ai/templates       - List templates
   • POST /api/ai/templates       - Create template

${process.env.MINIMAX_API_KEY ? '✅ MiniMax API configured' : '⚠️  MiniMax API key not set (set MINIMAX_API_KEY env var)'}
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
