const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const minimax = require('../services/minimax');

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Upload audio for transcription
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const noteId = req.body.note_id;
    const audioPath = req.file.path;
    
    console.log(`[Transcription] Received audio file: ${audioPath}`);
    
    // Convert audio to text using MiniMax
    const audioBuffer = fs.readFileSync(audioPath);
    const transcript = await minimax.speechToText(audioBuffer, req.file.filename);
    
    // Clean up uploaded file
    fs.unlinkSync(audioPath);
    
    // Update note with transcript if note_id provided
    if (noteId) {
      const db = require('../db');
      const existing = db.prepare('SELECT transcript FROM notes WHERE id = ?').get(noteId);
      if (existing) {
        const updatedTranscript = existing.transcript 
          ? existing.transcript + '\n\n' + transcript 
          : transcript;
        db.prepare('UPDATE notes SET transcript = ?, updated_at = ? WHERE id = ?')
          .run(updatedTranscript, new Date().toISOString(), noteId);
      }
    }
    
    res.json({ 
      success: true, 
      transcript,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed: ' + error.message });
  }
});

// Transcribe with ffmpeg preprocessing (for better compatibility)
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const noteId = req.body.note_id;
    const inputPath = req.file.path;
    const outputPath = inputPath.replace(/\.[^.]+$/, '.wav');
    
    // Convert to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        outputPath
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on('error', reject);
    });
    
    // Read converted audio
    const audioBuffer = fs.readFileSync(outputPath);
    
    // Transcribe
    const transcript = await minimax.speechToText(audioBuffer, path.basename(outputPath));
    
    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);
    
    // Update note if provided
    if (noteId) {
      const db = require('../db');
      const existing = db.prepare('SELECT transcript FROM notes WHERE id = ?').get(noteId);
      if (existing) {
        const updatedTranscript = existing.transcript 
          ? existing.transcript + '\n\n' + transcript 
          : transcript;
        db.prepare('UPDATE notes SET transcript = ?, updated_at = ? WHERE id = ?')
          .run(updatedTranscript, new Date().toISOString(), noteId);
      }
    }
    
    res.json({ 
      success: true, 
      transcript
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed: ' + error.message });
  }
});

// Get transcription status
router.get('/status/:jobId', (req, res) => {
  // For future async job tracking
  res.json({ status: 'completed', jobId: req.params.jobId });
});

module.exports = router;
